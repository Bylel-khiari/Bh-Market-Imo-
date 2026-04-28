import { existsSync } from "fs";
import { join } from "path";
import { spawn, spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { fetchScrapeSites } from "../models/scrapeSiteModel.js";
import {
  fetchScraperControl,
  patchScraperControl,
  updateScraperControlSettings,
} from "../models/scraperControlModel.js";
import { httpError } from "../utils/httpError.js";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const SCRAPER_PROJECT_DIR = fileURLToPath(new URL("../../../../services/scraper", import.meta.url));
const LISTING_CLEANER_SCRIPT = fileURLToPath(new URL("../../../../tools/listing_cleaner.py", import.meta.url));
const SYNC_PROPERTIES_SCRIPT = fileURLToPath(
  new URL("../../../../apps/server/scripts/syncCleanListingsToProperties.mjs", import.meta.url)
);
const NODE_BIN = process.env.SCRAPER_NODE_BIN || process.execPath || "node";
const LOG_SNIPPET_MAX_LENGTH = 12000;
const RUNNING_STATUSES = new Set(["running", "stopping"]);
const SCRAPER_RUNTIME_MODULES = ["scrapy", "mysql.connector", "rapidfuzz"];
const CLEANER_PROGRESS_EVERY = process.env.CLEANER_PROGRESS_EVERY || "250";
const RUN_TYPE_SCRAPER_CYCLE = "scraper_cycle";
const RUN_TYPE_LISTING_CLEANER = "listing_cleaner";

const runtimeState = {
  initializePromise: null,
  timer: null,
  currentRunPromise: null,
  currentChild: null,
  currentChildLabel: null,
  runType: null,
  runStartedAt: null,
  totalSteps: 0,
  completedSteps: 0,
  recentLog: "",
  progressPercent: 0,
  estimatedRemainingSeconds: null,
  lastLogPersistedAt: 0,
  stopRequested: false,
};

function truncateLog(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  if (text.length <= LOG_SNIPPET_MAX_LENGTH) {
    return text;
  }

  return text.slice(text.length - LOG_SNIPPET_MAX_LENGTH);
}

function appendLog(currentValue, nextChunk) {
  const nextValue = `${currentValue}${String(nextChunk || "")}`;
  return truncateLog(nextValue);
}

function clampProgressPercent(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Number(numericValue.toFixed(2))));
}

function buildRunLogLine(message) {
  return `[${new Date().toISOString()}] ${message}\n`;
}

function estimateRemainingSeconds({ completedUnits, totalUnits, startedAt = runtimeState.runStartedAt } = {}) {
  const normalizedCompleted = Number(completedUnits);
  const normalizedTotal = Number(totalUnits);

  if (
    !startedAt ||
    !Number.isFinite(normalizedCompleted) ||
    !Number.isFinite(normalizedTotal) ||
    normalizedCompleted <= 0 ||
    normalizedTotal <= normalizedCompleted
  ) {
    return null;
  }

  const elapsedSeconds = Math.max(1, (Date.now() - startedAt.getTime()) / 1000);
  const secondsPerUnit = elapsedSeconds / normalizedCompleted;
  return Math.max(0, Math.ceil((normalizedTotal - normalizedCompleted) * secondsPerUnit));
}

function buildProgressSnapshot({ completedSteps = runtimeState.completedSteps, stageFraction = 0 } = {}) {
  const totalSteps = Math.max(0, Number(runtimeState.totalSteps) || 0);
  const safeStageFraction = Math.min(1, Math.max(0, Number(stageFraction) || 0));
  const completedUnits = Math.min(totalSteps, Math.max(0, Number(completedSteps) + safeStageFraction));
  const progressPercent = totalSteps > 0
    ? clampProgressPercent((completedUnits / totalSteps) * 100)
    : 0;

  return {
    progress_current: Math.floor(completedUnits),
    progress_total: totalSteps,
    progress_percent: progressPercent,
    estimated_remaining_seconds: progressPercent >= 100
      ? 0
      : estimateRemainingSeconds({ completedUnits, totalUnits: totalSteps }),
  };
}

function resetRuntimeProgress({ runType, totalSteps }) {
  runtimeState.runType = runType;
  runtimeState.runStartedAt = new Date();
  runtimeState.totalSteps = Math.max(0, Number(totalSteps) || 0);
  runtimeState.completedSteps = 0;
  runtimeState.progressPercent = 0;
  runtimeState.estimatedRemainingSeconds = null;
  runtimeState.recentLog = "";
  runtimeState.lastLogPersistedAt = 0;
}

function appendRuntimeLog(message) {
  runtimeState.recentLog = appendLog(runtimeState.recentLog, buildRunLogLine(message));
}

function appendRuntimeOutput(chunk, { stream = "stdout", persist = true } = {}) {
  const text = String(chunk || "");

  if (!text) {
    return;
  }

  runtimeState.recentLog = appendLog(runtimeState.recentLog, text);

  if (!persist) {
    return;
  }

  const now = Date.now();
  if (now - runtimeState.lastLogPersistedAt < 1200) {
    return;
  }

  runtimeState.lastLogPersistedAt = now;
  patchScraperControl({ recent_log: runtimeState.recentLog }).catch((error) => {
    console.error(`Failed to persist ${stream} log:`, error);
  });
}

async function patchRunProgress(payload = {}, progressOptions = {}) {
  const snapshot = buildProgressSnapshot(progressOptions);

  runtimeState.progressPercent = snapshot.progress_percent;
  runtimeState.estimatedRemainingSeconds = snapshot.estimated_remaining_seconds;

  return patchScraperControl({
    ...payload,
    ...snapshot,
    recent_log: runtimeState.recentLog || payload.recent_log,
  });
}

function parseCleanerProgress(text) {
  const matches = [...String(text || "").matchAll(/Progress:\s*(\d+)\s*\/\s*(\d+)/gi)];
  const lastMatch = matches[matches.length - 1];

  if (!lastMatch) {
    return null;
  }

  const current = Number(lastMatch[1]);
  const total = Number(lastMatch[2]);

  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) {
    return null;
  }

  return {
    current: Math.min(current, total),
    total,
    fraction: Math.min(1, Math.max(0, current / total)),
  };
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function getPythonExecutableName(platform = process.platform) {
  return platform === "win32" ? "python.exe" : "python";
}

function getPythonScriptsDirectory(platform = process.platform) {
  return platform === "win32" ? "Scripts" : "bin";
}

function getScraperPythonCandidates(platform = process.platform) {
  const scriptsDirectory = getPythonScriptsDirectory(platform);
  const executableName = getPythonExecutableName(platform);

  return [
    join(SCRAPER_PROJECT_DIR, ".venv", scriptsDirectory, executableName),
    join(REPO_ROOT, ".venv", scriptsDirectory, executableName),
    join(SCRAPER_PROJECT_DIR, "venv", scriptsDirectory, executableName),
    join(REPO_ROOT, "venv", scriptsDirectory, executableName),
  ];
}

function getFallbackPythonCandidates(platform = process.platform) {
  if (platform === "win32") {
    return ["python", "py"];
  }

  return ["python"];
}

function inspectPythonRuntime(
  command,
  {
    env = process.env,
    spawnSyncImpl = spawnSync,
  } = {}
) {
  const moduleProbeScript = [
    "import importlib",
    `modules = ${JSON.stringify(SCRAPER_RUNTIME_MODULES)}`,
    "missing = []",
    "for name in modules:",
    "    try:",
    "        importlib.import_module(name)",
    "    except ModuleNotFoundError:",
    "        missing.append(name)",
    "print('\\n'.join(missing)) if missing else None",
    "raise SystemExit(1 if missing else 0)",
  ].join("\n");

  const result = spawnSyncImpl(command, ["-c", moduleProbeScript], {
    cwd: SCRAPER_PROJECT_DIR,
    env: { ...env },
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.error) {
    return {
      ok: false,
      missingModules: [],
      diagnostics: result.error.message,
    };
  }

  const missingModules = String(result.stdout || "")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
  const diagnostics = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();

  return {
    ok: result.status === 0,
    missingModules,
    diagnostics,
  };
}

export function resolveScraperPythonBin({
  env = process.env,
  exists = existsSync,
  platform = process.platform,
  canUsePythonBin = (candidate) => inspectPythonRuntime(candidate, { env }).ok,
} = {}) {
  const explicitBinary = String(env.SCRAPER_PYTHON_BIN || env.PYTHON_BIN || "").trim();
  if (explicitBinary) {
    return explicitBinary;
  }

  const localCandidates = getScraperPythonCandidates(platform).filter((candidate) => exists(candidate));
  const allCandidates = [...localCandidates, ...getFallbackPythonCandidates(platform)];

  for (const candidate of allCandidates) {
    if (canUsePythonBin(candidate)) {
      return candidate;
    }
  }

  return localCandidates[0] || getFallbackPythonCandidates(platform)[0];
}

export function buildScraperDependencyHelpMessage({
  pythonBin,
  missingModules = [],
  platform = process.platform,
  diagnostics = "",
} = {}) {
  const normalizedModules = missingModules.filter(Boolean);
  const venvPath = platform === "win32"
    ? "services\\scraper\\.venv\\Scripts\\python.exe"
    : "services/scraper/.venv/bin/python";
  const requirementsPath = platform === "win32"
    ? "services\\scraper\\requirements.txt"
    : "services/scraper/requirements.txt";

  const lines = [
    `L'environnement Python du scraper est incomplet (${pythonBin}).`,
  ];

  if (normalizedModules.length) {
    lines.push(`Modules manquants: ${normalizedModules.join(", ")}.`);
  }

  lines.push(
    `Creez un environnement virtuel local puis installez ${requirementsPath}: ` +
    `python -m venv services/scraper/.venv && ${venvPath} -m pip install -r ${requirementsPath}.`
  );
  lines.push(
    "Le serveur detecte automatiquement services/scraper/.venv si SCRAPER_PYTHON_BIN n'est pas defini."
  );

  if (diagnostics) {
    lines.push(`Diagnostic: ${truncateLog(diagnostics)}`);
  }

  return lines.join(" ");
}

function verifyPythonRuntime(command) {
  const inspection = inspectPythonRuntime(command);

  if (inspection.ok) {
    return;
  }

  throw new Error(
    buildScraperDependencyHelpMessage({
      pythonBin: command,
      missingModules: inspection.missingModules,
      diagnostics: inspection.diagnostics,
    })
  );
}

function clearScheduledRun() {
  if (runtimeState.timer) {
    clearTimeout(runtimeState.timer);
    runtimeState.timer = null;
  }
}

function queueScheduledRun(dateLike) {
  clearScheduledRun();

  if (!dateLike) {
    return;
  }

  const nextRunDate = new Date(dateLike);
  if (Number.isNaN(nextRunDate.getTime())) {
    return;
  }

  const delayMs = Math.max(nextRunDate.getTime() - Date.now(), 1000);
  runtimeState.timer = setTimeout(() => {
    runtimeState.timer = null;
    void startScraperCycle({ trigger: "schedule" }).catch((error) => {
      console.error("Scheduled scraper cycle failed to start:", error);
    });
  }, delayMs);

  if (typeof runtimeState.timer.unref === "function") {
    runtimeState.timer.unref();
  }
}

async function terminateCurrentChildProcess() {
  const child = runtimeState.currentChild;
  if (!child?.pid) {
    return false;
  }

  if (process.platform === "win32") {
    return new Promise((resolve) => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });

      const finish = () => resolve(true);
      killer.on("error", () => {
        try {
          child.kill();
        } catch {
          // Ignore kill fallback errors.
        }
        finish();
      });
      killer.on("close", finish);
    });
  }

  try {
    child.kill("SIGTERM");
    return true;
  } catch {
    return false;
  }
}

async function runCommand({ command, args, cwd, label, envOverrides = {}, onOutput = null }) {
  return new Promise((resolve, reject) => {
    let stdoutLog = "";
    let stderrLog = "";

    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...envOverrides },
      shell: false,
      windowsHide: true,
    });

    runtimeState.currentChild = child;
    runtimeState.currentChildLabel = label;

    child.stdout?.on("data", (chunk) => {
      stdoutLog = appendLog(stdoutLog, chunk);
      appendRuntimeOutput(chunk, { stream: "stdout" });
      onOutput?.(String(chunk || ""), "stdout");
    });

    child.stderr?.on("data", (chunk) => {
      stderrLog = appendLog(stderrLog, chunk);
      appendRuntimeOutput(chunk, { stream: "stderr" });
      onOutput?.(String(chunk || ""), "stderr");
    });

    child.on("error", (error) => {
      runtimeState.currentChild = null;
      runtimeState.currentChildLabel = null;
      reject(new Error(`Impossible de lancer ${label}: ${error.message}`));
    });

    child.on("close", (code, signal) => {
      runtimeState.currentChild = null;
      runtimeState.currentChildLabel = null;

      if (runtimeState.stopRequested) {
        reject(
          new Error(
            runtimeState.runType === RUN_TYPE_LISTING_CLEANER
              ? "L agent de filtrage a ete arrete manuellement."
              : "Le scraping a ete arrete manuellement."
          )
        );
        return;
      }

      if (code === 0) {
        resolve({ stdoutLog, stderrLog });
        return;
      }

      const diagnostics = truncateLog([stderrLog, stdoutLog].filter(Boolean).join("\n"));
      reject(
        new Error(
          diagnostics
            ? `${label} a echoue (${signal || code}). ${diagnostics}`
            : `${label} a echoue (${signal || code}).`
        )
      );
    });
  });
}

async function fetchActiveSites() {
  const sites = await fetchScrapeSites({ limit: 200 });
  return sites.filter((site) => site?.is_active);
}

export function buildInitialScraperRunState(activeSites = []) {
  const firstActiveSite = activeSites.find((site) => site?.spider_name) || null;

  if (!firstActiveSite) {
    return {
      current_step: null,
      current_spider_name: null,
      current_command: null,
    };
  }

  const siteLabel = firstActiveSite.name || firstActiveSite.spider_name;

  return {
    current_step: `Collecte du site ${siteLabel}`,
    current_spider_name: firstActiveSite.spider_name,
    current_command: `le spider ${firstActiveSite.spider_name}`,
  };
}

export function buildInitialCleanerAgentRunState() {
  return {
    current_step: "Agent de filtrage des annonces collectees",
    current_spider_name: null,
    current_command: "l agent de filtrage des annonces",
  };
}

function toStatusLabel(status, isEnabled) {
  if (status === "running") return "running";
  if (status === "stopping") return "stopping";
  if (status === "error") return "error";
  return isEnabled ? "scheduled" : "idle";
}

async function finalizeScraperCycle({ succeeded, errorMessage = null }) {
  const currentControl = await fetchScraperControl();
  const finishedAt = new Date();
  const isEnabled = Boolean(currentControl?.is_enabled);
  const intervalDays = Number(currentControl?.interval_days || 7);
  const nextRunAt = succeeded || errorMessage
    ? isEnabled
      ? addDays(finishedAt, intervalDays)
      : null
    : null;

  const nextStatus = succeeded
    ? toStatusLabel("scheduled", isEnabled)
    : runtimeState.stopRequested
      ? "idle"
      : toStatusLabel("error", isEnabled);

  const updates = {
    status: nextStatus,
    current_stage: null,
    current_step: null,
    current_spider_name: null,
    progress_current: succeeded ? runtimeState.totalSteps : runtimeState.completedSteps,
    progress_total: runtimeState.totalSteps,
    progress_percent: succeeded ? 100 : runtimeState.progressPercent,
    estimated_remaining_seconds: succeeded ? 0 : null,
    recent_log: runtimeState.recentLog,
    last_finished_at: finishedAt,
    next_run_at: nextRunAt,
    last_error: succeeded ? null : errorMessage,
  };

  if (succeeded) {
    updates.last_success_at = finishedAt;
    appendRuntimeLog("Execution terminee avec succes.");
    updates.recent_log = runtimeState.recentLog;
  }

  const updatedControl = await patchScraperControl(updates);

  if (updatedControl.is_enabled && updatedControl.next_run_at) {
    queueScheduledRun(updatedControl.next_run_at);
  } else {
    clearScheduledRun();
  }

  return updatedControl;
}

function assertRunNotStopped(message) {
  if (runtimeState.stopRequested) {
    throw new Error(message);
  }
}

async function runListingCleanerStage({ pythonBin, completedSteps }) {
  runtimeState.completedSteps = completedSteps;
  appendRuntimeLog("Demarrage de l agent de filtrage des annonces.");

  await patchRunProgress(
    {
      status: "running",
      current_stage: "cleaning",
      current_step: "Agent de filtrage des annonces collectees",
      current_spider_name: null,
    },
    { completedSteps }
  );

  await runCommand({
    command: pythonBin,
    args: [LISTING_CLEANER_SCRIPT],
    cwd: REPO_ROOT,
    label: "l agent de filtrage des annonces",
    envOverrides: {
      CLEANER_PROGRESS_EVERY,
      PYTHONUNBUFFERED: "1",
    },
    onOutput: () => {
      const progress = parseCleanerProgress(runtimeState.recentLog);

      if (!progress) {
        return;
      }

      patchRunProgress(
        {
          status: "running",
          current_stage: "cleaning",
          current_step: `Agent de filtrage des annonces (${progress.current}/${progress.total})`,
          current_spider_name: null,
        },
        {
          completedSteps,
          stageFraction: progress.fraction,
        }
      ).catch((error) => {
        console.error("Failed to persist cleaner progress:", error);
      });
    },
  });

  runtimeState.completedSteps = completedSteps + 1;
  appendRuntimeLog("Agent de filtrage termine.");
  await patchRunProgress(
    {
      status: "running",
      current_stage: "cleaning",
      current_step: "Agent de filtrage termine",
      current_spider_name: null,
    },
    { completedSteps: runtimeState.completedSteps }
  );
}

async function runPropertiesSyncStage({ completedSteps }) {
  runtimeState.completedSteps = completedSteps;
  appendRuntimeLog("Demarrage de la synchronisation des annonces nettoyees.");

  await patchRunProgress(
    {
      status: "running",
      current_stage: "syncing",
      current_step: "Synchronisation des annonces nettoyees",
      current_spider_name: null,
    },
    { completedSteps }
  );

  await runCommand({
    command: NODE_BIN,
    args: [SYNC_PROPERTIES_SCRIPT],
    cwd: REPO_ROOT,
    label: "la synchronisation des annonces",
  });

  runtimeState.completedSteps = completedSteps + 1;
  appendRuntimeLog("Synchronisation terminee.");
  await patchRunProgress(
    {
      status: "running",
      current_stage: "syncing",
      current_step: "Synchronisation terminee",
      current_spider_name: null,
    },
    { completedSteps: runtimeState.completedSteps }
  );
}

async function executeScraperCycle(trigger, preloadedActiveSites = null) {
  try {
    const activeSites = preloadedActiveSites || await fetchActiveSites();
    const pythonBin = resolveScraperPythonBin();

    if (!activeSites.length) {
      throw new Error("Aucun site actif n est configure pour le scraping.");
    }

    verifyPythonRuntime(pythonBin);

    for (const [index, site] of activeSites.entries()) {
      assertRunNotStopped("Le scraping a ete arrete manuellement.");

      runtimeState.completedSteps = index;
      appendRuntimeLog(`Collecte du site ${site.name || site.spider_name} (${index + 1}/${activeSites.length}).`);

      await patchRunProgress(
        {
          status: "running",
          current_stage: "scraping",
          current_step: `Collecte du site ${site.name || site.spider_name}`,
          current_spider_name: site.spider_name,
        },
        { completedSteps: index }
      );

      await runCommand({
        command: pythonBin,
        args: ["-m", "scrapy", "crawl", site.spider_name],
        cwd: SCRAPER_PROJECT_DIR,
        label: `le spider ${site.spider_name}`,
      });

      runtimeState.completedSteps = index + 1;
      appendRuntimeLog(`Collecte terminee pour ${site.name || site.spider_name}.`);
      await patchRunProgress(
        {
          status: "running",
          current_stage: "scraping",
          current_step: `Collecte terminee pour ${site.name || site.spider_name}`,
          current_spider_name: site.spider_name,
        },
        { completedSteps: runtimeState.completedSteps }
      );
    }

    assertRunNotStopped("Le scraping a ete arrete manuellement.");
    await runListingCleanerStage({ pythonBin, completedSteps: activeSites.length });

    assertRunNotStopped("Le scraping a ete arrete manuellement.");
    await runPropertiesSyncStage({ completedSteps: activeSites.length + 1 });

    await finalizeScraperCycle({ succeeded: true });
  } catch (error) {
    const message = truncateLog(error?.message || "Erreur inconnue pendant le scraping.");
    appendRuntimeLog(
      runtimeState.stopRequested
        ? "Execution arretee manuellement par un administrateur."
        : `Erreur: ${message}`
    );
    await finalizeScraperCycle({
      succeeded: false,
      errorMessage: runtimeState.stopRequested
        ? "Cycle arrete manuellement par un administrateur."
        : message,
    });

    if (!runtimeState.stopRequested) {
      console.error(`Scraper cycle failed (${trigger}):`, error);
    }
  } finally {
    runtimeState.currentChild = null;
    runtimeState.currentChildLabel = null;
    runtimeState.currentRunPromise = null;
    runtimeState.runType = null;
    runtimeState.stopRequested = false;
  }
}

async function executeListingCleanerAgent(trigger) {
  try {
    const pythonBin = resolveScraperPythonBin();
    verifyPythonRuntime(pythonBin);

    assertRunNotStopped("L agent de filtrage a ete arrete manuellement.");
    await runListingCleanerStage({ pythonBin, completedSteps: 0 });

    assertRunNotStopped("L agent de filtrage a ete arrete manuellement.");
    await runPropertiesSyncStage({ completedSteps: 1 });

    await finalizeScraperCycle({ succeeded: true });
  } catch (error) {
    const message = truncateLog(error?.message || "Erreur inconnue pendant l agent de filtrage.");
    appendRuntimeLog(
      runtimeState.stopRequested
        ? "Agent de filtrage arrete manuellement par un administrateur."
        : `Erreur: ${message}`
    );
    await finalizeScraperCycle({
      succeeded: false,
      errorMessage: runtimeState.stopRequested
        ? "Agent de filtrage arrete manuellement par un administrateur."
        : message,
    });

    if (!runtimeState.stopRequested) {
      console.error(`Listing cleaner agent failed (${trigger}):`, error);
    }
  } finally {
    runtimeState.currentChild = null;
    runtimeState.currentChildLabel = null;
    runtimeState.currentRunPromise = null;
    runtimeState.runType = null;
    runtimeState.stopRequested = false;
  }
}

async function syncSchedulerWithStoredState({ runOverdue = false } = {}) {
  const control = await fetchScraperControl();

  if (!control?.is_enabled) {
    clearScheduledRun();

    if (control?.status !== "idle" && !runtimeState.currentRunPromise) {
      return patchScraperControl({
        status: "idle",
        current_stage: null,
        current_step: null,
        current_spider_name: null,
        next_run_at: null,
      });
    }

    return control;
  }

  if (runtimeState.currentRunPromise) {
    clearScheduledRun();
    return control;
  }

  if (RUNNING_STATUSES.has(control.status)) {
    await patchScraperControl({
      status: "scheduled",
      current_stage: null,
      current_step: null,
      current_spider_name: null,
    });
  }

  if (control.next_run_at) {
    const nextRunDate = new Date(control.next_run_at);

    if (!Number.isNaN(nextRunDate.getTime()) && nextRunDate.getTime() > Date.now()) {
      if (control.status !== "error" && control.status !== "scheduled") {
        await patchScraperControl({ status: "scheduled" });
      }

      queueScheduledRun(nextRunDate);
      return fetchScraperAutomationStatus();
    }
  }

  if (runOverdue) {
    setTimeout(() => {
      void startScraperCycle({ trigger: "startup" }).catch((error) => {
        console.error("Failed to restore scheduled scraper cycle:", error);
      });
    }, 1000);

    return fetchScraperAutomationStatus();
  }

  const nextRunAt = addDays(new Date(), control.interval_days);
  await patchScraperControl({
    status: control.status === "error" ? "error" : "scheduled",
    next_run_at: nextRunAt,
  });
  queueScheduledRun(nextRunAt);

  return fetchScraperAutomationStatus();
}

export async function initializeScraperAutomation() {
  if (!runtimeState.initializePromise) {
    runtimeState.initializePromise = syncSchedulerWithStoredState({ runOverdue: true }).catch(
      (error) => {
        runtimeState.initializePromise = null;
        throw error;
      }
    );
  }

  return runtimeState.initializePromise;
}

export async function fetchScraperAutomationStatus() {
  const control = await fetchScraperControl();

  return {
    ...control,
    is_running: Boolean(runtimeState.currentRunPromise),
    stop_requested: Boolean(runtimeState.stopRequested),
    current_command: runtimeState.currentChildLabel,
    run_type: runtimeState.runType || control?.run_type || null,
    recent_log: runtimeState.recentLog || control?.recent_log || null,
    progress_percent: runtimeState.currentRunPromise
      ? runtimeState.progressPercent
      : Number(control?.progress_percent || 0),
    estimated_remaining_seconds: runtimeState.currentRunPromise
      ? runtimeState.estimatedRemainingSeconds
      : control?.estimated_remaining_seconds ?? null,
  };
}

export async function configureScraperAutomation(payload = {}) {
  const currentControl = await fetchScraperControl();
  const updatedControl = await updateScraperControlSettings(payload);

  if (!updatedControl.is_enabled) {
    clearScheduledRun();

    if (!runtimeState.currentRunPromise) {
      await patchScraperControl({
        status: "idle",
        current_stage: null,
        current_step: null,
        current_spider_name: null,
        next_run_at: null,
      });
    }

    return fetchScraperAutomationStatus();
  }

  if (runtimeState.currentRunPromise || RUNNING_STATUSES.has(currentControl?.status)) {
    return fetchScraperAutomationStatus();
  }

  const nextRunAt = addDays(new Date(), updatedControl.interval_days);
  await patchScraperControl({
    status: updatedControl.status === "error" ? "error" : "scheduled",
    next_run_at: nextRunAt,
  });
  queueScheduledRun(nextRunAt);

  return fetchScraperAutomationStatus();
}

export async function startScraperCycle({ trigger = "manual", interval_days } = {}) {
  if (runtimeState.currentRunPromise) {
    throw httpError(409, "Un cycle de scraping est deja en cours.");
  }

  clearScheduledRun();
  const activeSites = await fetchActiveSites();

  if (!activeSites.length) {
    throw httpError(400, "Aucun site actif n est configure pour le scraping.");
  }

  const initialRunState = buildInitialScraperRunState(activeSites);
  resetRuntimeProgress({
    runType: RUN_TYPE_SCRAPER_CYCLE,
    totalSteps: activeSites.length + 2,
  });
  appendRuntimeLog(`Demarrage du cycle de scraping avec ${activeSites.length} site(s) actif(s).`);
  const initialProgress = buildProgressSnapshot({ completedSteps: 0 });

  const startedAt = new Date();
  const updates = {
    is_enabled: true,
    status: "running",
    run_type: RUN_TYPE_SCRAPER_CYCLE,
    current_stage: "scraping",
    current_step:
      initialRunState.current_step ||
      (trigger === "manual"
        ? "Demarrage manuel du cycle de scraping"
        : "Demarrage automatique du cycle de scraping"),
    current_spider_name: initialRunState.current_spider_name,
    ...initialProgress,
    recent_log: runtimeState.recentLog,
    last_started_at: startedAt,
    last_finished_at: null,
    next_run_at: null,
    last_error: null,
  };

  if (interval_days !== undefined) {
    updates.interval_days = interval_days;
  }

  await patchScraperControl(updates);

  runtimeState.stopRequested = false;
  runtimeState.currentChildLabel = initialRunState.current_command;
  runtimeState.currentRunPromise = executeScraperCycle(trigger, activeSites).catch((error) => {
    console.error("Unexpected scraper cycle failure:", error);
  });

  return fetchScraperAutomationStatus();
}

export async function startListingCleanerAgent({ trigger = "manual" } = {}) {
  if (runtimeState.currentRunPromise) {
    throw httpError(409, "Une execution du scraper ou de l agent est deja en cours.");
  }

  clearScheduledRun();
  const initialRunState = buildInitialCleanerAgentRunState();
  resetRuntimeProgress({
    runType: RUN_TYPE_LISTING_CLEANER,
    totalSteps: 2,
  });
  appendRuntimeLog("Demarrage manuel de l agent de filtrage.");
  const initialProgress = buildProgressSnapshot({ completedSteps: 0 });
  const startedAt = new Date();

  await patchScraperControl({
    status: "running",
    run_type: RUN_TYPE_LISTING_CLEANER,
    current_stage: "cleaning",
    current_step: initialRunState.current_step,
    current_spider_name: null,
    ...initialProgress,
    recent_log: runtimeState.recentLog,
    last_started_at: startedAt,
    last_finished_at: null,
    next_run_at: null,
    last_error: null,
  });

  runtimeState.stopRequested = false;
  runtimeState.currentChildLabel = initialRunState.current_command;
  runtimeState.currentRunPromise = executeListingCleanerAgent(trigger).catch((error) => {
    console.error("Unexpected listing cleaner agent failure:", error);
  });

  return fetchScraperAutomationStatus();
}

export async function stopScraperCycle() {
  clearScheduledRun();

  const updates = {
    is_enabled: false,
    next_run_at: null,
    status: runtimeState.currentRunPromise ? "stopping" : "idle",
    current_stage: runtimeState.currentRunPromise ? "stopping" : null,
    current_step: runtimeState.currentRunPromise
      ? runtimeState.runType === RUN_TYPE_LISTING_CLEANER
        ? "Arret de l agent de filtrage en cours"
        : "Arret du cycle de scraping en cours"
      : null,
  };

  if (!runtimeState.currentRunPromise) {
    updates.current_spider_name = null;
    updates.current_stage = null;
  }

  const currentControl = await patchScraperControl(updates);

  if (!runtimeState.currentRunPromise) {
    return fetchScraperAutomationStatus();
  }

  runtimeState.stopRequested = true;
  await terminateCurrentChildProcess();

  return {
    ...currentControl,
    is_running: true,
    stop_requested: true,
    current_command: runtimeState.currentChildLabel,
    run_type: runtimeState.runType,
    recent_log: runtimeState.recentLog || currentControl?.recent_log || null,
    progress_percent: runtimeState.progressPercent,
    estimated_remaining_seconds: runtimeState.estimatedRemainingSeconds,
  };
}
