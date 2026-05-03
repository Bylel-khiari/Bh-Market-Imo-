import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { httpError } from "../utils/httpError.js";
import { resolveScraperPythonBin } from "./scraperControlService.js";

const SITE_DISCOVERY_SCRIPT = fileURLToPath(
  new URL("../../../../services/scraper/real_estate_scraper/site_discovery.py", import.meta.url)
);
const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const SITE_DISCOVERY_INTERVAL_DAYS = Math.min(
  Math.max(Number(process.env.SITE_DISCOVERY_INTERVAL_DAYS || 7), 1),
  365
);

const runtimeState = {
  initializePromise: null,
  timer: null,
  nextRunAt: null,
  currentRunPromise: null,
  lastStartedAt: null,
  lastFinishedAt: null,
  lastResult: null,
  lastError: null,
};

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function clearScheduledRun() {
  if (runtimeState.timer) {
    clearTimeout(runtimeState.timer);
    runtimeState.timer = null;
  }
  runtimeState.nextRunAt = null;
}

function queueScheduledRun(dateLike) {
  clearScheduledRun();

  const nextRunDate = new Date(dateLike);
  if (Number.isNaN(nextRunDate.getTime())) {
    return;
  }

  const delayMs = Math.max(nextRunDate.getTime() - Date.now(), 1000);
  runtimeState.nextRunAt = nextRunDate;
  runtimeState.timer = setTimeout(() => {
    runtimeState.timer = null;
    runtimeState.nextRunAt = null;
    void startSiteDiscoveryRun({ trigger: "schedule" }).catch((error) => {
      console.error("Scheduled site discovery failed:", error);
    });
  }, delayMs);

  if (typeof runtimeState.timer.unref === "function") {
    runtimeState.timer.unref();
  }
}

function parseDiscoveryOutput(stdout) {
  const lines = String(stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of [...lines].reverse()) {
    try {
      return JSON.parse(line);
    } catch {
      // Keep scanning from the end because the Python agent may log before JSON.
    }
  }

  return { raw_output: stdout || "" };
}

function runDiscoveryCommand({ pythonBin, trigger }) {
  return new Promise((resolve, reject) => {
    let stdoutLog = "";
    let stderrLog = "";

    const child = spawn(pythonBin, [SITE_DISCOVERY_SCRIPT, "--trigger", trigger], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
      shell: false,
      windowsHide: true,
    });

    child.stdout?.on("data", (chunk) => {
      stdoutLog += String(chunk || "");
    });

    child.stderr?.on("data", (chunk) => {
      stderrLog += String(chunk || "");
    });

    child.on("error", (error) => {
      reject(new Error(`Impossible de lancer l agent de decouverte: ${error.message}`));
    });

    child.on("close", (code, signal) => {
      if (code === 0) {
        resolve(parseDiscoveryOutput(stdoutLog));
        return;
      }

      const diagnostics = [stderrLog, stdoutLog].filter(Boolean).join("\n").trim();
      reject(
        new Error(
          diagnostics
            ? `L agent de decouverte a echoue (${signal || code}). ${diagnostics}`
            : `L agent de decouverte a echoue (${signal || code}).`
        )
      );
    });
  });
}

export function fetchSiteDiscoveryStatus() {
  return {
    is_running: Boolean(runtimeState.currentRunPromise),
    interval_days: SITE_DISCOVERY_INTERVAL_DAYS,
    next_run_at: runtimeState.nextRunAt,
    last_started_at: runtimeState.lastStartedAt,
    last_finished_at: runtimeState.lastFinishedAt,
    last_result: runtimeState.lastResult,
    last_error: runtimeState.lastError,
  };
}

export async function initializeSiteDiscoveryAutomation() {
  if (String(process.env.SITE_DISCOVERY_AUTO_ENABLED || "true").toLowerCase() === "false") {
    clearScheduledRun();
    return fetchSiteDiscoveryStatus();
  }

  if (!runtimeState.initializePromise) {
    runtimeState.initializePromise = Promise.resolve().then(() => {
      queueScheduledRun(addDays(new Date(), SITE_DISCOVERY_INTERVAL_DAYS));
      return fetchSiteDiscoveryStatus();
    });
  }

  return runtimeState.initializePromise;
}

export async function startSiteDiscoveryRun({ trigger = "manual" } = {}) {
  if (runtimeState.currentRunPromise) {
    throw httpError(409, "Une recherche de nouveaux sites est deja en cours.");
  }

  clearScheduledRun();
  runtimeState.lastStartedAt = new Date();
  runtimeState.lastError = null;

  const pythonBin = resolveScraperPythonBin();
  runtimeState.currentRunPromise = runDiscoveryCommand({ pythonBin, trigger });

  try {
    const result = await runtimeState.currentRunPromise;
    runtimeState.lastResult = result;
    runtimeState.lastFinishedAt = new Date();
    queueScheduledRun(addDays(runtimeState.lastFinishedAt, SITE_DISCOVERY_INTERVAL_DAYS));
    runtimeState.currentRunPromise = null;
    return {
      status: fetchSiteDiscoveryStatus(),
      result,
    };
  } catch (error) {
    runtimeState.lastError = error?.message || "Erreur inconnue pendant la decouverte de sites.";
    runtimeState.lastFinishedAt = new Date();
    queueScheduledRun(addDays(runtimeState.lastFinishedAt, SITE_DISCOVERY_INTERVAL_DAYS));
    throw error;
  } finally {
    runtimeState.currentRunPromise = null;
  }
}
