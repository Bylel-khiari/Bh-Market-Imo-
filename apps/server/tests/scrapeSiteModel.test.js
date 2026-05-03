import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const executeMock = vi.fn();

vi.mock("../src/config/db.js", () => ({
  dbPool: {
    query: queryMock,
    execute: executeMock,
  },
}));

beforeEach(() => {
  queryMock.mockReset();
  executeMock.mockReset();
});

describe("scrapeSiteModel activation guard", () => {
  it("rejects activation when the Scrapy spider file does not exist", async () => {
    const { createScrapeSite } = await import("../src/models/scrapeSiteModel.js");

    await expect(
      createScrapeSite({
        name: "New Portal",
        spider_name: "missing_spider_for_test",
        base_url: "https://new.example.tn",
        is_active: true,
      })
    ).rejects.toMatchObject({
      status: 400,
      message: "Le spider Scrapy correspondant est introuvable.",
    });

    expect(executeMock).not.toHaveBeenCalled();
  });

  it("allows an inactive pending site to be stored for later spider integration", async () => {
    executeMock
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([{ insertId: 42 }, []])
      .mockResolvedValueOnce([
        [
          {
            id: 42,
            name: "New Portal",
            spider_name: "new_portal",
            base_url: "https://new.example.tn",
            start_url: "https://new.example.tn",
            description: null,
            is_active: 0,
            integration_status: "pending_spider",
            created_at: "2026-01-01",
            updated_at: "2026-01-01",
          },
        ],
        [],
      ]);

    const { createScrapeSite } = await import("../src/models/scrapeSiteModel.js");
    const site = await createScrapeSite({
      name: "New Portal",
      spider_name: "new_portal",
      base_url: "https://new.example.tn",
      start_url: "https://new.example.tn",
      is_active: false,
      integration_status: "pending_spider",
    });

    expect(site).toMatchObject({
      id: 42,
      is_active: false,
      integration_status: "pending_spider",
    });
  });

  it("rejects activation while integration status is pending_spider", async () => {
    executeMock.mockResolvedValueOnce([
      [
        {
          id: 42,
          name: "New Portal",
          spider_name: "new_portal",
          is_active: 0,
          integration_status: "pending_spider",
        },
      ],
      [],
    ]);

    const { updateScrapeSite } = await import("../src/models/scrapeSiteModel.js");

    await expect(updateScrapeSite(42, { is_active: true })).rejects.toMatchObject({
      status: 400,
      message: "Le site ne peut pas etre active tant que son spider n est pas pret.",
    });
  });
});
