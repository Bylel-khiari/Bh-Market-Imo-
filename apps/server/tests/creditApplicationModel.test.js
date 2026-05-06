import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  query: vi.fn(),
}));

vi.mock("../src/config/db.js", () => ({
  dbPool: {
    execute: mocks.execute,
    query: mocks.query,
  },
}));

beforeEach(() => {
  mocks.execute.mockReset();
  mocks.query.mockReset();
});

describe("creditApplicationModel agent search", () => {
  it("searches by dossier id and client account fields without changing the query shape", async () => {
    mocks.execute.mockResolvedValueOnce([[], []]);

    const { fetchAgentCreditApplications } = await import("../src/models/creditApplicationModel.js");
    const applications = await fetchAgentCreditApplications({ search: "3", status: "all", limit: 150 });

    expect(applications).toEqual([]);

    const [sql, params] = mocks.execute.mock.calls[0];
    expect(sql).toContain("CAST(ca.id AS CHAR) LIKE ?");
    expect(sql).toContain("client.name LIKE ?");
    expect(sql).toContain("client.email LIKE ?");
    expect(sql).toContain("ca.rib LIKE ?");
    expect(sql).toContain("ca.property_location_snapshot LIKE ?");
    expect(sql).toContain("CAST(ca.requested_amount AS CHAR) LIKE ?");
    expect(sql).toContain("LIMIT 150");
    expect(sql.match(/\?/g)).toHaveLength(params.length);
    expect(params).toEqual(Array(15).fill("%3%"));
  });
});
