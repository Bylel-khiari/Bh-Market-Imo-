import { describe, expect, it, vi } from "vitest";

import {
  renderClientCreditApplicationList,
  renderCreatedCreditApplication,
} from "../src/views/creditApplicationView.js";

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
}

function createScoredApplication() {
  return {
    id: 12,
    client_id: 4,
    full_name: "Client Test",
    property_title: "Appartement test",
    status: "ACCEPTE",
    compliance_score: 100,
    compliance_level: "excellent",
    compliance_summary:
      "Avis scoring favorable. Score: 100/100. Donnees utilisees: revenu, charges.",
    agent_note: "Note interne banque",
    decision_motif: "Motif interne banque",
    gross_income_value: 300000,
    income_period: "annual",
    revenu_annuel: 300000,
    charges_impayees: 2000,
    situation_familiale: "marie",
    situation_contractuelle: "CDI",
    other_monthly_charges: 120,
    debt_ratio: 90.3,
    created_at: "2026-05-01T10:00:00.000Z",
  };
}

describe("creditApplicationView", () => {
  it("redacts bank scoring details from client application lists", () => {
    const response = createResponse();

    renderClientCreditApplicationList(response, {
      applications: [createScoredApplication()],
    });

    const application = response.json.mock.calls[0][0].applications[0];
    const serializedApplication = JSON.stringify(application);

    expect(application).not.toHaveProperty("compliance_score");
    expect(application).not.toHaveProperty("compliance_summary");
    expect(application).not.toHaveProperty("agent_note");
    expect(application).not.toHaveProperty("decision_motif");
    expect(application).not.toHaveProperty("revenu_annuel");
    expect(application).not.toHaveProperty("charges_impayees");
    expect(application).not.toHaveProperty("debt_ratio");
    expect(serializedApplication).not.toContain("Avis scoring");
    expect(serializedApplication).not.toContain("Motif interne banque");
    expect(application.client_decision_message).toContain("analyse bancaire");
  });

  it("does not return scoring feedback after a client submits an application", () => {
    const response = createResponse();

    renderCreatedCreditApplication(response, createScoredApplication());

    const payload = response.json.mock.calls[0][0];

    expect(response.status).toHaveBeenCalledWith(201);
    expect(payload).not.toHaveProperty("scoring");
    expect(payload.application).not.toHaveProperty("compliance_score");
    expect(payload.application).not.toHaveProperty("compliance_summary");
    expect(JSON.stringify(payload)).not.toContain("Score: 100/100");
  });
});
