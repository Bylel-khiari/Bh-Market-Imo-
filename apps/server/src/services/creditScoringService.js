import { httpError } from "../utils/httpError.js";

const PYTHON_SCORING_API_URL =
  process.env.BH_ASSISTANT_API_URL || "http://localhost:8000";

async function callPythonScoringApi(scoringData) {
  try {
    const response = await fetch(`${PYTHON_SCORING_API_URL}/credit-scoring`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(scoringData),
    });

    if (!response.ok) {
      console.error(
        `Python scoring API returned status ${response.status}:`,
        await response.text().catch(() => "")
      );
      throw httpError(502, "Erreur lors du calcul du score de crédit");
    }

    return await response.json();
  } catch (error) {
    console.error("Error calling Python scoring API:", error.message);
    if (error.status) {
      throw error;
    }
    throw httpError(
      502,
      "Service de scoring indisponible. Veuillez réessayer plus tard."
    );
  }
}

/**
 * Calculate annual income from gross income and period
 */
function calculateAnnualIncome(grossIncome, incomePeriod) {
  const income = Number(grossIncome || 0);
  if (income <= 0) return 0;

  return incomePeriod === "annual" ? income : income * 12;
}

/**
 * Calculate annual charges (monthly payment * 12)
 */
function calculateAnnualCharges(monthlyPayment) {
  return Number(monthlyPayment || 0) * 12;
}

/**
 * Infer family situation from available data.
 * This is a best-effort approach - ideally this info would be provided by the client
 */
function inferfamilySituation(data) {
  // Default to "célibataire" (single) if not specified
  // In a real scenario, this field should be explicitly provided by the user
  return "célibataire";
}

/**
 * Map socio category to contract type for scoring
 */
function mapSocioCategoryToContractType(socioCategory) {
  const categoryMap = {
    salarie: "CDI",
    fonctionnaire: "fonctionnaire",
    profession_libre: "profession libérale",
    profession_liberale: "profession libérale",
    retraite: "retraite",
    independant: "indépendant",
  };

  return categoryMap[socioCategory] || socioCategory || "sans contrat";
}

/**
 * Prepare and call the scoring service for a credit application
 */
export async function scoreCreditApplication(applicationData) {
  const {
    grossIncome,
    incomePeriod,
    estimatedMonthlyPayment,
    socioCategory,
  } = applicationData;

  // Calculate the required fields for scoring
  const annualIncome = calculateAnnualIncome(grossIncome, incomePeriod);
  const annualCharges = calculateAnnualCharges(estimatedMonthlyPayment);
  const contractType = mapSocioCategoryToContractType(socioCategory);
  const familySituation = inferfamilySituation(applicationData);

  if (annualIncome <= 0) {
    throw httpError(
      400,
      "Le revenu annuel doit être supérieur à 0 pour calculer le score"
    );
  }

  const scoringRequest = {
    revenu_annuel: annualIncome,
    charges_impayees: annualCharges,
    situation_familiale: familySituation,
    situation_contractuelle: contractType,
  };

  const scoringResult = await callPythonScoringApi(scoringRequest);

  return {
    ...scoringResult,
    // Add metadata
    scoring_date: new Date().toISOString(),
    scoring_request_data: scoringRequest,
  };
}

/**
 * Generate a French summary based on scoring result
 */
export function generateScoringDecision(scoringResult) {
  const { decision, score, niveau_risque, resume } = scoringResult;

  const decisionText =
    decision === "ACCEPTE"
      ? "✓ Dossier ACCEPTÉ automatiquement par l'agent de scoring"
      : "✗ Dossier REFUSÉ automatiquement par l'agent de scoring";

  const riskText =
    {
      faible: "faible",
      moyen: "moyen",
      eleve: "élevé",
    }[niveau_risque] || niveau_risque;

  return `${decisionText}. Score: ${score}/100 (risque ${riskText}). ${resume}`;
}

/**
 * Determine the status and auto-assignment based on scoring
 */
export function determineApplicationStatus(scoringResult) {
  const { decision } = scoringResult;

  if (decision === "ACCEPTE") {
    return {
      status: "ACCEPTE",
      autoApproved: true,
      complianceScore: scoringResult.score,
      complianceSummary: generateScoringDecision(scoringResult),
    };
  }

  if (decision === "REFUSE") {
    return {
      status: "REFUSE",
      autoApproved: true,
      complianceScore: scoringResult.score,
      complianceSummary: generateScoringDecision(scoringResult),
    };
  }

  // Default to EN_VERIFICATION if decision is unclear
  return {
    status: "EN_VERIFICATION",
    autoApproved: false,
    complianceScore: scoringResult.score,
    complianceSummary: generateScoringDecision(scoringResult),
  };
}
