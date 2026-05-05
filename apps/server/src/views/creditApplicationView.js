/**
 * Generates a French message based on the application status.
 */
function getStatusMessage(application) {
  const statusMessages = {
    SOUMIS: "Votre demande a été reçue et sera examinée par notre équipe bancaire.",
    DOCUMENTS_MANQUANTS: "Nous avons besoin de documents supplémentaires pour traiter votre demande.",
    EN_VERIFICATION: "Votre demande est en cours de vérification par notre équipe bancaire.",
    EN_ETUDE: "Votre demande est en étude approfondie par notre équipe bancaire.",
    ACCEPTE: "Votre demande de crédit a été acceptée.",
    REFUSE: "Votre demande de crédit a été refusée.",
  };

  return statusMessages[application?.status] || "Statut de votre demande en cours d'actualisation.";
}

/**
 * Generates the public client-facing decision text.
 */
function getClientDecisionMessage(application) {
  if (application?.status === "ACCEPTE") {
    return "Votre demande a été acceptée après analyse bancaire. Un conseiller BH vous contactera pour les prochaines étapes.";
  }

  if (application?.status === "REFUSE") {
    return "Votre demande n'a pas été retenue après analyse bancaire. Vous pouvez contacter votre agence pour plus d'informations.";
  }

  return getStatusMessage(application);
}

function toClientCreditApplication(application) {
  if (!application) return null;

  const {
    assigned_agent_user_id,
    compliance_score,
    compliance_level,
    compliance_summary,
    agent_note,
    decision_motif,
    gross_income_value,
    income_period,
    revenu_annuel,
    charges_impayees,
    situation_familiale,
    situation_contractuelle,
    other_monthly_charges,
    debt_ratio,
    ...clientApplication
  } = application;

  return {
    ...clientApplication,
    statusMessage: getStatusMessage(application),
    client_decision_message: getClientDecisionMessage(application),
  };
}

export function renderCreatedCreditApplication(res, application) {
  const message = getStatusMessage(application);

  return res.status(201).json({
    message: "Votre demande de crédit a été reçue avec succès.",
    statusMessage: message,
    application: toClientCreditApplication(application),
  });
}

export function renderClientCreditApplicationList(res, payload) {
  const applications = Array.isArray(payload?.applications) ? payload.applications : [];
  return res.json({
    count: applications.length,
    applications: applications.map(toClientCreditApplication),
  });
}

export function renderAgentCreditApplicationList(res, payload) {
  const applications = Array.isArray(payload?.applications) ? payload.applications : [];
  const summary = payload?.summary || {};

  return res.json({
    count: applications.length,
    summary: {
      ...summary,
      // Add localized status labels
      statuses: {
        SOUMIS: "Soumises",
        DOCUMENTS_MANQUANTS: "Documents manquants",
        EN_VERIFICATION: "En vérification",
        EN_ETUDE: "En étude",
        ACCEPTE: "Acceptées",
        REFUSE: "Refusées",
      },
    },
    applications: applications.map((app) => ({
      ...app,
      statusMessage: getStatusMessage(app),
    })),
  });
}

export function renderUpdatedCreditApplication(res, application) {
  return res.json({
    message: "Demande de crédit mise à jour avec succès.",
    application: {
      ...application,
      statusMessage: getStatusMessage(application),
    },
  });
}
