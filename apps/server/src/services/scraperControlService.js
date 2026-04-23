import { spawn } from "child_process";
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
const PYTHON_BIN = process.env.SCRAPER_PYTHON_BIN || process.env.PYTHON_BIN || "python";
const NODE_BIN = process.env.SCRAPER_NODE_BIN || process.execPath || "node";
const LOG_SNIPPET_MAX_LENGTH = 2500;
const RUNNING_STATUSES = new Set(["running", "stopping"]);

const runtimeState = {
  initializePromise: null,
  timer: null,
  currentRunPromise: null,
  currentChild: null,
  currentChildLabel: null,
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

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
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

async function runCommand({ command, args, cwd, label }) {
  return new Promise((resolve, reject) => {
    let stdoutLog = "";
    let stderrLog = "";

    const child = spawn(command, args, {
      cwd,
      env: { ...process.env },
      shell: false,
      windowsHide: true,
    });

    runtimeState.currentChild = child;
    runtimeState.currentChildLabel = label;

    child.stdout?.on("data", (chunk) => {
      stdoutLog = appendLog(stdoutLog, chunk);
    });

    child.stderr?.on("data", (chunk) => {
      stderrLog = appendLog(stderrLog, chunk);
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
        reject(new Error("Le scraping a ete arrete manuellement."));
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

  const updatedControl = await patchScraperControl({
    status: nextStatus,
    current_step: null,
    current_spider_name: null,
    last_finished_at: finishedAt,
    last_success_at: succeeded ? finishedAt : undefined,
    next_run_at: nextRunAt,
    last_error: succeeded ? null : errorMessage,
  });

  if (updatedControl.is_enabled && updatedControl.next_run_at) {
    queueScheduledRun(updatedControl.next_run_at);
  } else {
    clearScheduledRun();
  }

  return updatedControl;
}

async function executeScraperCycle(trigger) {
  try {
    const activeSites = await fetchActiveSites();

    if (!activeSites.length) {
      throw new Error("Aucun site actif n est configure pour le scraping.");
    }

    for (const site of activeSites) {
      if (runtimeState.stopRequested) {
        throw new Error("Le scraping a ete arrete manuellement.");
      }

      await patchScraperControl({
        status: "running",
        current_step: `Collecte du site ${site.name}`,
        current_spider_name: site.spider_name,
      });

      await runCommand({
        command: PYTHON_BIN,
        args: ["-m", "scrapy", "crawl", site.spider_name],
        cwd: SCRAPER_PROJECT_DIR,
        label: `le spider ${site.spider_name}`,
      });
    }

    if (runtimeState.stopRequested) {
      throw new Error("Le scraping a ete arrete manuellement.");
    }

    await patchScraperControl({
      status: "running",
      current_step: "Nettoyage des annonces collectees",
      current_spider_name: null,
    });

    await runCommand({
      command: PYTHON_BIN,
      args: [LISTING_CLEANER_SCRIPT],
      cwd: REPO_ROOT,
      label: "le nettoyage des annonces",
    });

    if (runtimeState.stopRequested) {
      throw new Error("Le scraping a ete arrete manuellement.");
    }

    await patchScraperControl({
      status: "running",
      current_step: "Synchronisation des annonces nettoyees",
      current_spider_name: null,
    });

    await runCommand({
      command: NODE_BIN,
      args: [SYNC_PROPERTIES_SCRIPT],
      cwd: REPO_ROOT,
      label: "la synchronisation des annonces",
    });

    await finalizeScraperCycle({ succeeded: true });
  } catch (error) {
    const message = truncateLog(error?.message || "Erreur inconnue pendant le scraping.");
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

  const startedAt = new Date();
  const updates = {
    is_enabled: true,
    status: "running",
    current_step:
      trigger === "manual"
        ? "Demarrage manuel du cycle de scraping"
        : "Demarrage automatique du cycle de scraping",
    current_spider_name: null,
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
  runtimeState.currentRunPromise = executeScraperCycle(trigger);

  return fetchScraperAutomationStatus();
}

export async function stopScraperCycle() {
  clearScheduledRun();

  const currentControl = await patchScraperControl({
    is_enabled: false,
    next_run_at: null,
    status: runtimeState.currentRunPromise ? "stopping" : "idle",
    current_step: runtimeState.currentRunPromise
      ? "Arret du cycle de scraping en cours"
      : null,
    current_spider_name: runtimeState.currentRunPromise ? undefined : null,
  });

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
  };
}
