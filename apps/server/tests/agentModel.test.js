import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  fetchClientActivityDashboard: vi.fn(),
}));

vi.mock("../src/config/db.js", () => ({
  dbPool: {
    query: mocks.query,
  },
}));

vi.mock("../src/models/clientActivityLogModel.js", () => ({
  fetchClientActivityDashboard: mocks.fetchClientActivityDashboard,
}));

beforeEach(() => {
  mocks.query.mockReset();
  mocks.fetchClientActivityDashboard.mockReset();
});

function getCurrentMonthKey() {
  const date = new Date();
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

describe("agentModel", () => {
  it("builds agent dashboard credit KPIs from database aggregates", async () => {
    const currentMonthKey = getCurrentMonthKey();

    mocks.fetchClientActivityDashboard.mockResolvedValue({
      summary: {
        credit_request_starts: 8,
      },
      event_distribution: [],
      monthly_events: [],
      top_regions: [],
      top_clients: [],
      latest_events: [],
    });

    mocks.query
      .mockResolvedValueOnce([[{ role: "client", total: 4 }], []])
      .mockResolvedValueOnce([[{ total_properties: 6, active_properties: 5, inactive_properties: 1 }], []])
      .mockResolvedValueOnce([[{ total_reports: 3 }], []])
      .mockResolvedValueOnce([[
        {
          total_credit_applications: 10,
          pending_credit_applications: 5,
          accepted_credit_applications: 3,
          refused_credit_applications: 2,
          average_compliance_score: 76,
        },
      ], []])
      .mockResolvedValueOnce([[{ status: "RESOLU", total: 2 }], []])
      .mockResolvedValueOnce([[
        { status: "SOUMIS", total: 2 },
        { status: "ACCEPTE", total: 3 },
      ], []])
      .mockResolvedValueOnce([[{ city: "Tunis", total: 6 }], []])
      .mockResolvedValueOnce([[{ source: "admin", total: 6 }], []])
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[{ month: currentMonthKey, total: 4 }], []])
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[], []])
      .mockResolvedValueOnce([[
        {
          id: 10,
          full_name: "Client Credit",
          email: "client@example.test",
          status: "ACCEPTE",
          compliance_score: 82,
          created_at: "2026-05-15T08:00:00.000Z",
        },
      ], []]);

    const { fetchAgentDashboardSummary } = await import("../src/models/agentModel.js");
    const dashboard = await fetchAgentDashboardSummary();

    expect(mocks.query).toHaveBeenCalledTimes(15);
    expect(dashboard.summary).toMatchObject({
      total_credit_applications: 10,
      pending_credit_applications: 5,
      accepted_credit_applications: 3,
      refused_credit_applications: 2,
      average_compliance_score: 76,
      credit_approval_rate: 30,
      credit_submit_conversion_rate: 125,
    });
    expect(dashboard.credit_application_summary).toEqual({
      total: 10,
      pending: 5,
      accepted: 3,
      refused: 2,
      average_compliance_score: 76,
      approval_rate: 30,
      submit_conversion_rate: 125,
    });
    expect(dashboard.credit_application_status_distribution).toEqual(
      expect.arrayContaining([
        { key: "SOUMIS", label: "Soumis", value: 2 },
        { key: "ACCEPTE", label: "Acceptes", value: 3 },
      ])
    );
    expect(dashboard.latest_credit_applications).toEqual([
      {
        id: 10,
        full_name: "Client Credit",
        email: "client@example.test",
        status: "ACCEPTE",
        status_label: "Acceptes",
        compliance_score: 82,
        created_at: "2026-05-15T08:00:00.000Z",
      },
    ]);
    expect(dashboard.monthly_activity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ month: currentMonthKey, credit_applications: 4 }),
      ])
    );
  });
});
