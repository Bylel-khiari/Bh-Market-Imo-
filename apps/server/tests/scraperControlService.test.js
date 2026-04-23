import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/models/scrapeSiteModel.js", () => ({
  fetchScrapeSites: vi.fn(),
}));

vi.mock("../src/models/scraperControlModel.js", () => ({
  fetchScraperControl: vi.fn(),
  patchScraperControl: vi.fn(),
  updateScraperControlSettings: vi.fn(),
}));

let scraperControlService;

beforeEach(async () => {
  scraperControlService = await import("../src/services/scraperControlService.js");
});

describe("scraperControlService", () => {
  it("prefers an explicit SCRAPER_PYTHON_BIN override", () => {
    const result = scraperControlService.resolveScraperPythonBin({
      env: {
        SCRAPER_PYTHON_BIN: "C:\\Custom\\python.exe",
      },
      exists: () => false,
      platform: "win32",
      canUsePythonBin: () => false,
    });

    expect(result).toBe("C:\\Custom\\python.exe");
  });

  it("uses the scraper-local virtualenv when it is available and usable", () => {
    const result = scraperControlService.resolveScraperPythonBin({
      env: {},
      exists: (candidate) =>
        candidate.replaceAll("/", "\\").endsWith("services\\scraper\\.venv\\Scripts\\python.exe"),
      platform: "win32",
      canUsePythonBin: (candidate) =>
        candidate.replaceAll("/", "\\").endsWith("services\\scraper\\.venv\\Scripts\\python.exe"),
    });

    expect(result.replaceAll("/", "\\")).toMatch(/services\\scraper\\\.venv\\Scripts\\python\.exe$/);
  });

  it("falls back to python when the local virtualenv exists but is not usable", () => {
    const result = scraperControlService.resolveScraperPythonBin({
      env: {},
      exists: (candidate) =>
        candidate.replaceAll("/", "\\").endsWith("services\\scraper\\.venv\\Scripts\\python.exe"),
      platform: "win32",
      canUsePythonBin: (candidate) => candidate === "python",
    });

    expect(result).toBe("python");
  });

  it("builds a clear dependency setup message", () => {
    const message = scraperControlService.buildScraperDependencyHelpMessage({
      pythonBin: "python",
      missingModules: ["scrapy", "rapidfuzz"],
      platform: "win32",
    });

    expect(message).toContain("Modules manquants: scrapy, rapidfuzz.");
    expect(message).toContain("services\\scraper\\requirements.txt");
    expect(message).toContain("services\\scraper\\.venv\\Scripts\\python.exe");
  });

  it("builds an initial running preview from the first active spider", () => {
    const preview = scraperControlService.buildInitialScraperRunState([
      { name: "Afariat", spider_name: "afariat", is_active: true },
      { name: "Mubawab", spider_name: "mubawab", is_active: true },
    ]);

    expect(preview).toEqual({
      current_step: "Collecte du site Afariat",
      current_spider_name: "afariat",
      current_command: "le spider afariat",
    });
  });

  it("returns an empty initial running preview when no spider is available", () => {
    const preview = scraperControlService.buildInitialScraperRunState([]);

    expect(preview).toEqual({
      current_step: null,
      current_spider_name: null,
      current_command: null,
    });
  });
});
