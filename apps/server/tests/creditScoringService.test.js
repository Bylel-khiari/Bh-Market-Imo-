import { afterEach, describe, expect, it, vi } from "vitest";

import {
  determineApplicationStatus,
  prepareCreditScoringRequest,
  scoreCreditApplication,
} from "../src/services/creditScoringService.js";

describe("creditScoringService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses explicit scoring fields from the credit deposit form first", () => {
    const { scoringRequest, sources } = prepareCreditScoringRequest({
      revenuAnnuel: 72000,
      chargesImpayees: 24000,
      familySituation: "marie",
      contractType: "CDI",
      grossIncome: 2000,
      incomePeriod: "monthly",
      estimatedMonthlyPayment: 500,
      socioCategory: "salarie",
    });

    expect(scoringRequest).toEqual({
      revenu_annuel: 72000,
      charges_impayees: 24000,
      situation_familiale: "marie",
      situation_contractuelle: "CDI",
    });
    expect(sources.revenu_annuel).toBe("champ revenu annuel du formulaire");
    expect(sources.charges_impayees).toBe("champ charges annuelles du formulaire");
  });

  it("falls back to simulation data and document metadata when scoring fields are missing", () => {
    const { scoringRequest, sources } = prepareCreditScoringRequest({
      grossIncome: 3000,
      incomePeriod: "monthly",
      estimatedMonthlyPayment: 900,
      otherMonthlyCharges: 150,
      socioCategory: "fonctionnaire",
      documents: [{ name: "extrait_marie_avec_enfant.pdf", type: "ID_COPY" }],
    });

    expect(scoringRequest).toEqual({
      revenu_annuel: 36000,
      charges_impayees: 12600,
      situation_familiale: "marie avec enfant",
      situation_contractuelle: "fonctionnaire",
    });
    expect(sources.revenu_annuel).toBe("donnees de simulation");
    expect(sources.charges_impayees).toBe("mensualite estimee et engagements declares");
  });

  it("uses the local scoring formula when the scoring API is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("service down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await scoreCreditApplication({
      revenuAnnuel: 10000,
      chargesImpayees: 4000,
      familySituation: "celibataire",
      contractType: "fonctionnaire",
    });

    expect(result).toMatchObject({
      decision: "FAVORABLE",
      score: 80,
      niveau_risque: "faible",
      scoring_request_data: {
        revenu_annuel: 10000,
        charges_impayees: 4000,
        situation_familiale: "celibataire",
        situation_contractuelle: "fonctionnaire",
      },
    });
  });

  it("keeps the final decision for the banking agent after scoring", () => {
    const status = determineApplicationStatus({
      decision: "FAVORABLE",
      score: 82,
      niveau_risque: "faible",
      resume: "Avis favorable avec un score de 82/100.",
      scoring_input_sources: {
        revenu_annuel: "champ revenu annuel du formulaire",
        charges_impayees: "champ charges annuelles du formulaire",
        situation_familiale: "champ situation familiale du formulaire",
        situation_contractuelle: "champ situation contractuelle du formulaire",
      },
    });

    expect(status).toMatchObject({
      status: "EN_ETUDE",
      autoApproved: false,
      complianceScore: 82,
      scoringAdvice: "FAVORABLE",
    });
    expect(status.complianceSummary).toContain("Decision finale reservee a l'agent bancaire");
  });
});
