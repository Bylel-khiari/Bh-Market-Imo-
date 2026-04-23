import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const executeMock = vi.fn();

vi.mock("../src/config/db.js", () => ({
  dbPool: {
    query: queryMock,
    execute: executeMock,
  },
}));

const SCRAPER_CONTROL_ROW = {
  id: 1,
  is_enabled: 1,
  interval_days: 7,
  status: "scheduled",
  current_step: null,
  current_spider_name: null,
  last_started_at: null,
  last_finished_at: null,
  last_success_at: null,
  next_run_at: null,
  last_error: null,
  created_at: "2026-01-01 00:00:00",
  updated_at: "2026-01-01 00:00:00",
};

beforeEach(() => {
  queryMock.mockReset();
  executeMock.mockReset();
});

describe("scraperControlModel", () => {
  it("omits undefined fields from SQL bindings", async () => {
    queryMock.mockResolvedValue([[], []]);

    executeMock.mockImplementation(async (sql) => {
      const statement = String(sql);

      if (statement.includes("INSERT INTO scraper_control")) {
        return [{ affectedRows: 1 }, []];
      }

      if (statement.startsWith("UPDATE scraper_control SET")) {
        return [{ affectedRows: 1 }, []];
      }

      if (statement.includes("FROM scraper_control")) {
        return [[SCRAPER_CONTROL_ROW], []];
      }

      throw new Error(`Unexpected SQL: ${statement}`);
    });

    const { patchScraperControl } = await import("../src/models/scraperControlModel.js");

    await patchScraperControl({
      status: "running",
      current_spider_name: undefined,
      last_success_at: undefined,
      last_error: null,
    });

    const updateCall = executeMock.mock.calls.find(([sql]) =>
      String(sql).startsWith("UPDATE scraper_control SET")
    );

    expect(updateCall).toBeDefined();
    expect(updateCall[0]).toContain("status = ?");
    expect(updateCall[0]).toContain("last_error = ?");
    expect(updateCall[0]).not.toContain("current_spider_name = ?");
    expect(updateCall[0]).not.toContain("last_success_at = ?");
    expect(updateCall[1]).toEqual(["running", null, 1]);
    expect(updateCall[1]).not.toContain(undefined);
  });

  it("rejects settings updates that only contain undefined fields", async () => {
    const { updateScraperControlSettings } = await import("../src/models/scraperControlModel.js");

    await expect(
      updateScraperControlSettings({
        interval_days: undefined,
        is_enabled: undefined,
      })
    ).rejects.toMatchObject({
      status: 400,
      message: "At least one field is required",
    });
  });
});
