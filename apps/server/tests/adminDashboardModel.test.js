import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock("../src/config/db.js", () => ({
  dbPool: {
    query: mocks.query,
  },
}));

beforeEach(() => {
  mocks.query.mockReset();
});

describe("adminDashboardModel", () => {
  it("builds dashboard totals from aggregate database rows", async () => {
    mocks.query
      .mockResolvedValueOnce([[{ total: 130, clients: 112, agents: 12, admins: 6 }], []])
      .mockResolvedValueOnce([[{ total: 91, active: 80, inactive: 11, admin_created: 7, manual_changes: 4 }], []])
      .mockResolvedValueOnce([[{ total: 16, active: 14, inactive: 2, pending_spider: 1 }], []])
      .mockResolvedValueOnce([[{ total: 5, pending: 2, accepted: 1, rejected: 1, ignored: 1 }], []])
      .mockResolvedValueOnce([[{ total: 9, unread: 3, in_review: 2, resolved: 3, rejected: 1 }], []]);

    const { fetchAdminDashboardSummary } = await import("../src/models/adminDashboardModel.js");
    const summary = await fetchAdminDashboardSummary();

    expect(mocks.query).toHaveBeenCalledTimes(5);
    expect(summary).toMatchObject({
      users: {
        total: 130,
        roles: {
          client: 112,
          agent_bancaire: 12,
          admin: 6,
        },
      },
      properties: {
        total: 91,
        active: 80,
        inactive: 11,
        adminCreated: 7,
        manualChanges: 4,
      },
      scrapeSites: {
        total: 16,
        active: 14,
        inactive: 2,
        pendingSpider: 1,
      },
      scrapeSiteSuggestions: {
        total: 5,
        pending: 2,
        accepted: 1,
        rejected: 1,
        ignored: 1,
      },
      reports: {
        total: 9,
        unread: 3,
        inReview: 2,
        resolved: 3,
        rejected: 1,
      },
    });
    expect(summary.generatedAt).toEqual(expect.any(String));
  });
});
