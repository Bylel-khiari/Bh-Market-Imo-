/**
 * Generates a French message based on the application status
 */
function getStatusMessage(application) {
  const statusMessages = {
    SOUMIS: "Votre demande a été reçue et sera examinée par notre équipe bancaire.",
    DOCUMENTS_MANQUANTS: "Nous avons besoin de documents supplémentaires pour traiter votre demande.",
    EN_VERIFICATION: "Votre demande est en cours de vérification par notre agent de scoring.",
    EN_ETUDE: "Votre demande est en étude approfondie par notre équipe bancaire.",
    ACCEPTE: "✓ Félicitations! Votre demande de crédit a été ACCEPTÉE.",
    REFUSE: "✗ Malheureusement, votre demande de crédit a été REFUSÉE.",
  };

  return statusMessages[application?.status] || "Statut de votre demande en cours d'actualisation.";
}

/**
 * Generates detailed scoring feedback in French
 */
function getScoringFeedback(application) {
  if (!application?.compliance_summary) {
    return null;
  }

  return {
    score: application.compliance_score,
    level: {
      75: "Excellent",
      50: "Acceptable",
      0: "À revoir",
    }[application.compliance_score >= 75 ? 75 : application.compliance_score >= 50 ? 50 : 0],
    summary: application.compliance_summary,
  };
}

export function renderCreatedCreditApplication(res, application) {
  const message = getStatusMessage(application);
  const feedback = getScoringFeedback(application);

  return res.status(201).json({
    message: feedback
      ? "Votre demande de crédit a été reçue avec succès. Le score a été calculé et sera vérifié par un agent bancaire."
      : "Votre demande de crédit a été reçue avec succès.",
    statusMessage: message,
    scoring: feedback,
    application,
  });
}

export function renderClientCreditApplicationList(res, payload) {
  const applications = Array.isArray(payload?.applications) ? payload.applications : [];
  return res.json({
    count: applications.length,
    applications: applications.map((app) => ({
      ...app,
      statusMessage: getStatusMessage(app),
    })),
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
