import { httpError } from "../utils/httpError.js";

const PYTHON_SCORING_API_URL =
  process.env.BH_ASSISTANT_API_URL || "http://localhost:8000";
const CHARGES_RATIO_LIMIT = 0.4;
const ACCEPTANCE_SCORE = 60;
const CONTRACT_RULES = [
  ["fonctionnaire", 25, "Situation contractuelle tres stable"],
  ["titulaire", 25, "Situation contractuelle tres stable"],
  ["cdi", 25, "Contrat stable"],
  ["retraite", 18, "Revenu regulier"],
  ["profession liberale", 18, "Revenu professionnel a verifier"],
  ["profession libre", 18, "Revenu professionnel a verifier"],
  ["independant", 16, "Revenu independant a consolider"],
  ["cdd", 12, "Contrat acceptable avec vigilance"],
  ["stage", 4, "Situation contractuelle fragile"],
  ["sans contrat", 0, "Absence de contrat stable"],
  ["sans emploi", 0, "Absence de revenu professionnel stable"],
  ["chomeur", 0, "Absence de revenu professionnel stable"],
];
const FAMILY_RULES = [
  ["celibataire", 15, "Charges familiales limitees"],
  ["marie sans enfant", 15, "Situation familiale stable"],
  ["avec enfant", 11, "Charges familiales a prendre en compte"],
  ["marie", 13, "Situation familiale stable"],
  ["divorce", 10, "Situation familiale a verifier"],
  ["veuf", 10, "Situation familiale a verifier"],
];

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
function normalizeFiniteNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalizedValue = Number(value);
  return Number.isFinite(normalizedValue) ? normalizedValue : null;
}

function normalizeRuleText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function matchScoringRule(value, rules, defaultScore, defaultMessage) {
  const normalizedValue = normalizeRuleText(value);

  for (const [keyword, score, message] of rules) {
    if (normalizedValue.includes(normalizeRuleText(keyword))) {
      return { score, message };
    }
  }

  return { score: defaultScore, message: defaultMessage };
}

function calculateCapacityScore(chargesRatio) {
  if (chargesRatio <= CHARGES_RATIO_LIMIT) {
    const margin = (CHARGES_RATIO_LIMIT - chargesRatio) / CHARGES_RATIO_LIMIT;
    return Math.round(40 + Math.max(0, margin) * 20);
  }

  const overflow = Math.min((chargesRatio - CHARGES_RATIO_LIMIT) / (1 - CHARGES_RATIO_LIMIT), 1);
  return Math.round(Math.max(0, 40 - overflow * 40));
}

function getRiskLevel(score) {
  if (score >= 80) return "faible";
  if (score >= ACCEPTANCE_SCORE) return "moyen";
  return "eleve";
}

function firstPositiveNumber(...values) {
  for (const value of values) {
    const normalizedValue = normalizeFiniteNumber(value);

    if (normalizedValue !== null && normalizedValue > 0) {
      return normalizedValue;
    }
  }

  return null;
}

function firstTextValue(...values) {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }

    const normalizedValue = String(value).trim();

    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return null;
}

function collectClientProvidedText(data = {}) {
  const parts = [
    data.fullName,
    data.socioCategory,
    data.familySituation,
    data.situationFamiliale,
    data.situation_familiale,
    data.contractType,
    data.situationContractuelle,
    data.situation_contractuelle,
  ];

  if (Array.isArray(data.documents)) {
    data.documents.forEach((document) => {
      if (!document) return;

      if (typeof document === "string") {
        parts.push(document);
        return;
      }

      parts.push(document.name, document.type, document.extracted_text, document.text);
    });
  }

  return parts.filter(Boolean).join(" ").replace(/[_-]+/g, " ").toLowerCase();
}

function calculateAnnualIncome(grossIncome, incomePeriod) {
  const income = normalizeFiniteNumber(grossIncome);
  if (!income || income <= 0) return 0;

  return incomePeriod === "annual" ? income : income * 12;
}

/**
 * Calculate annual charges (monthly payment * 12)
 */
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

function resolveFamilySituation(data = {}) {
  const explicitValue = firstTextValue(
    data.familySituation,
    data.situationFamiliale,
    data.situation_familiale
  );

  if (explicitValue) {
    return {
      value: explicitValue,
      source: "champ situation familiale du formulaire",
    };
  }

  const searchableText = collectClientProvidedText(data);

  if (/\b(marie|mariee|marié|mariée)\b/.test(searchableText)) {
    return {
      value: /\b(enfant|enfants)\b/.test(searchableText) ? "marie avec enfant" : "marie",
      source: "donnees client/documents",
    };
  }

  if (/\b(celibataire|célibataire)\b/.test(searchableText)) {
    return {
      value: "celibataire",
      source: "donnees client/documents",
    };
  }

  if (/\b(divorce|divorcé|divorcee|divorcée)\b/.test(searchableText)) {
    return {
      value: "divorce",
      source: "donnees client/documents",
    };
  }

  return {
    value: "non renseignee",
    source: "valeur a verifier par agent bancaire",
  };
}

function resolveContractType(data = {}) {
  const explicitValue = firstTextValue(
    data.contractType,
    data.situationContractuelle,
    data.situation_contractuelle
  );

  if (explicitValue) {
    return {
      value: explicitValue,
      source: "champ situation contractuelle du formulaire",
    };
  }

  const mappedContract = mapSocioCategoryToContractType(data.socioCategory);

  if (mappedContract !== "sans contrat") {
    return {
      value: mappedContract,
      source: "categorie socioprofessionnelle",
    };
  }

  const searchableText = collectClientProvidedText(data);
  const knownContracts = [
    ["fonctionnaire", "fonctionnaire"],
    ["titulaire", "titulaire"],
    ["cdi", "CDI"],
    ["cdd", "CDD"],
    ["retraite", "retraite"],
    ["profession liberale", "profession liberale"],
    ["profession libre", "profession liberale"],
    ["independant", "independant"],
    ["stage", "stage"],
  ];

  for (const [keyword, contract] of knownContracts) {
    if (searchableText.includes(keyword)) {
      return {
        value: contract,
        source: "donnees client/documents",
      };
    }
  }

  return {
    value: "sans contrat",
    source: "valeur a verifier par agent bancaire",
  };
}

function resolveAnnualIncome(data = {}) {
  const explicitAnnualIncome = firstPositiveNumber(
    data.revenuAnnuel,
    data.revenu_annuel,
    data.annualIncome,
    data.scoringAnnualIncome
  );

  if (explicitAnnualIncome) {
    return {
      value: explicitAnnualIncome,
      source: "champ revenu annuel du formulaire",
    };
  }

  const annualIncome = calculateAnnualIncome(data.grossIncome, data.incomePeriod);

  return {
    value: annualIncome,
    source: annualIncome > 0 ? "donnees de simulation" : "non renseigne",
  };
}

function resolveAnnualCharges(data = {}, annualIncome = 0) {
  const explicitAnnualCharges = firstPositiveNumber(
    data.chargesImpayees,
    data.charges_impayees,
    data.annualCharges,
    data.scoringAnnualCharges
  );

  if (explicitAnnualCharges) {
    return {
      value: explicitAnnualCharges,
      source: "champ charges annuelles du formulaire",
    };
  }

  const estimatedMonthlyPayment = normalizeFiniteNumber(data.estimatedMonthlyPayment) || 0;
  const otherMonthlyCharges =
    normalizeFiniteNumber(data.otherMonthlyCharges) ??
    normalizeFiniteNumber(data.other_monthly_charges) ??
    0;
  const monthlyCharges = estimatedMonthlyPayment + otherMonthlyCharges;

  if (monthlyCharges > 0) {
    return {
      value: monthlyCharges * 12,
      source: "mensualite estimee et engagements declares",
    };
  }

  const debtRatio = normalizeFiniteNumber(data.debtRatio);

  if (annualIncome > 0 && debtRatio && debtRatio > 0) {
    return {
      value: annualIncome * (debtRatio / 100),
      source: "taux d'endettement de simulation",
    };
  }

  return {
    value: 0,
    source: "aucune charge declaree",
  };
}

export function prepareCreditScoringRequest(applicationData = {}) {
  const annualIncome = resolveAnnualIncome(applicationData);
  const annualCharges = resolveAnnualCharges(applicationData, annualIncome.value);
  const familySituation = resolveFamilySituation(applicationData);
  const contractType = resolveContractType(applicationData);

  return {
    scoringRequest: {
      revenu_annuel: annualIncome.value,
      charges_impayees: annualCharges.value,
      situation_familiale: familySituation.value,
      situation_contractuelle: contractType.value,
    },
    sources: {
      revenu_annuel: annualIncome.source,
      charges_impayees: annualCharges.source,
      situation_familiale: familySituation.source,
      situation_contractuelle: contractType.source,
    },
  };
}

export function scoreCreditApplicationLocally(scoringRequest = {}) {
  const annualIncome = normalizeFiniteNumber(scoringRequest.revenu_annuel) || 0;
  const annualCharges = normalizeFiniteNumber(scoringRequest.charges_impayees) || 0;
  const chargesLimit = annualIncome * CHARGES_RATIO_LIMIT;
  const remainingIncome = annualIncome - annualCharges;
  const chargesRatio = annualIncome > 0 ? annualCharges / annualIncome : 1;
  const chargesPassed = annualCharges <= chargesLimit;
  const capacityScore = calculateCapacityScore(chargesRatio);
  const contract = matchScoringRule(
    scoringRequest.situation_contractuelle,
    CONTRACT_RULES,
    8,
    "Situation contractuelle non standard a verifier"
  );
  const family = matchScoringRule(
    scoringRequest.situation_familiale,
    FAMILY_RULES,
    8,
    "Situation familiale non standard a verifier"
  );
  const contractPassed = contract.score >= 12;
  const score = Math.max(0, Math.min(100, capacityScore + contract.score + family.score));
  const favorable = chargesPassed && contractPassed && score >= ACCEPTANCE_SCORE;
  const decision = favorable ? "FAVORABLE" : "DEFAVORABLE";
  const chargesMessage = chargesPassed
    ? `Charges conformes: ${roundMoney(annualCharges)} <= ${roundMoney(chargesLimit)}`
    : `Charges trop elevees: ${roundMoney(annualCharges)} > ${roundMoney(chargesLimit)}`;

  return {
    decision,
    score,
    niveau_risque: getRiskLevel(score),
    formule: "charges_impayees <= revenu_annuel * 0.40",
    taux_charges: roundMoney(chargesRatio * 100),
    plafond_charges: roundMoney(chargesLimit),
    reste_apres_charges: roundMoney(remainingIncome),
    criteres: [
      {
        nom: "Capacite de remboursement",
        valide: chargesPassed,
        score: capacityScore,
        message: chargesMessage,
      },
      {
        nom: "Situation contractuelle",
        valide: contractPassed,
        score: contract.score,
        message: contract.message,
      },
      {
        nom: "Situation familiale",
        valide: family.score >= 8,
        score: family.score,
        message: family.message,
      },
    ],
    resume: `Avis ${decision.toLowerCase()} avec un score de ${score}/100. Le taux de charges est de ${roundMoney(
      chargesRatio * 100
    )}% pour un seuil maximal de ${Math.round(CHARGES_RATIO_LIMIT * 100)}%.`,
    recommandation: favorable
      ? "Le dossier respecte la regle principale. L'agent bancaire doit verifier le dossier puis prendre la decision finale."
      : "Le dossier presente un risque. L'agent bancaire doit verifier les elements avant toute decision finale.",
  };
}

/**
 * Prepare and call the scoring service for a credit application
 */
export async function scoreCreditApplication(applicationData) {
  const { scoringRequest, sources } = prepareCreditScoringRequest(applicationData);

  if (scoringRequest.revenu_annuel <= 0) {
    throw httpError(
      400,
      "Le revenu annuel doit être supérieur à 0 pour calculer le score"
    );
  }

  let scoringResult = null;

  try {
    scoringResult = await callPythonScoringApi(scoringRequest);
  } catch (error) {
    console.warn(
      "Python scoring API unavailable, using local scoring formula:",
      error.message
    );
    scoringResult = scoreCreditApplicationLocally(scoringRequest);
  }

  return {
    ...scoringResult,
    // Add metadata
    scoring_date: new Date().toISOString(),
    scoring_request_data: scoringRequest,
    scoring_input_sources: sources,
  };
}

/**
 * Generate a French summary based on scoring result
 */
export function generateScoringDecision(scoringResult) {
  const { decision, score, niveau_risque, resume, scoring_input_sources: sources } = scoringResult;

  const decisionText =
    decision === "ACCEPTE" || decision === "FAVORABLE"
      ? "Avis scoring favorable"
      : decision === "REFUSE" || decision === "DEFAVORABLE"
        ? "Avis scoring defavorable"
        : "Avis scoring a verifier";

  const riskText =
    {
      faible: "faible",
      moyen: "moyen",
      eleve: "élevé",
    }[niveau_risque] || niveau_risque;

  const sourceText = sources
    ? ` Donnees utilisees: revenu (${sources.revenu_annuel}), charges (${sources.charges_impayees}), situation familiale (${sources.situation_familiale}), situation contractuelle (${sources.situation_contractuelle}).`
    : "";

  return `${decisionText}. Score: ${score}/100 (risque ${riskText}). ${resume}${sourceText} Decision finale reservee a l'agent bancaire.`;
}

/**
 * Determine the review status after scoring.
 * Scoring gives an advisory score only; it never accepts or rejects a credit application.
 */
export function determineApplicationStatus(scoringResult) {
  return {
    status: "EN_ETUDE",
    autoApproved: false,
    complianceScore: scoringResult.score,
    complianceSummary: generateScoringDecision(scoringResult),
    scoringAdvice: scoringResult.decision || null,
  };
}
