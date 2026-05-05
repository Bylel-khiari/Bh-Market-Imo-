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

describe("propertyModel admin pagination", () => {
  it("can fetch all active public properties without a hard limit", async () => {
    executeMock.mockResolvedValueOnce([
      [
        {
          id: 12,
          title: "Appartement S+2",
          price_raw: "320 000 DT",
          price_value: "320000.00",
          location_raw: "Tunis",
          city: "Tunis",
          governorate: "Tunis",
          country: "Tunisie",
          image: null,
          description: null,
          source: "admin",
          url: null,
          scraped_at: null,
        },
      ],
      [],
    ]);

    const { fetchProperties } = await import("../src/models/propertyModel.js");
    const properties = await fetchProperties({ all: true });

    expect(properties).toHaveLength(1);
    expect(executeMock.mock.calls[0][0]).not.toContain("LIMIT");
  });

  it("applies server-side pagination, status, and search filters", async () => {
    executeMock
      .mockResolvedValueOnce([[{ total: 123 }], []])
      .mockResolvedValueOnce([
        [
          {
            id: 12,
            title: "Appartement S+2",
            price_raw: "320 000 DT",
            price_value: "320000.00",
            location_raw: "Tunis",
            city: "Tunis",
            governorate: "Tunis",
            country: "Tunisie",
            image: null,
            description: null,
            source: "admin",
            url: null,
            scraped_at: null,
            is_active: 1,
            created_by_admin: 1,
            admin_updated_at: null,
            has_manual_changes: 0,
          },
        ],
        [],
      ]);

    const { fetchAdminPropertiesPage } = await import("../src/models/propertyModel.js");
    const payload = await fetchAdminPropertiesPage({
      page: 3,
      limit: 50,
      status: "active",
      search: "tunis",
    });

    expect(payload.pagination).toMatchObject({
      page: 3,
      limit: 50,
      total: 123,
      totalPages: 3,
      status: "active",
      search: "tunis",
    });
    expect(payload.properties).toHaveLength(1);

    const listCall = executeMock.mock.calls[1];
    expect(listCall[0]).toContain("COALESCE(p.is_active, 1) = 1");
    expect(listCall[0]).toContain("LIKE ?");
    expect(listCall[0]).toContain("LIMIT 50 OFFSET 100");
    expect(listCall[1]).toEqual(["%tunis%"]);
  });
});
