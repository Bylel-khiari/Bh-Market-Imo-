const DEFAULT_SUGGESTIONS = [
  "Chercher un bien",
  "Simulation crédit",
  "Documents nécessaires",
  "Contacter un agent",
];

const INTENTS = [
  {
    keywords: [
      "simulation credit",
      "simuler credit",
      "credit immobilier",
      "mensualite",
      "taux",
      "financement",
    ],
    reply:
      "Pour une simulation de crédit immobilier BH, indiquez le prix du bien, votre apport, le montant souhaité, vos revenus et la durée envisagée. Les taux, mensualités et conditions exactes doivent être confirmés via la simulation officielle ou par un conseiller BH.",
    suggestions: ["Documents nécessaires", "Étapes du crédit", "Contacter un conseiller"],
    handoff: false,
  },
  {
    keywords: ["documents", "dossier", "pieces", "papier", "justificatif", "cin", "rib"],
    reply:
      "Pour préparer un dossier de crédit immobilier, prévoyez généralement une pièce d'identité, des justificatifs de revenus, un RIB et les informations liées au bien. La liste exacte dépend de votre profil et doit être confirmée par un conseiller BH.",
    suggestions: ["Simulation crédit", "Étapes du crédit", "Contacter un agent"],
    handoff: false,
  },
  {
    keywords: ["contacter", "contact", "agent", "conseiller", "rendez vous", "rdv", "appeler"],
    reply:
      "Vous pouvez demander à être recontacté par un agent BH Market Imo. Indiquez votre besoin, vos coordonnées et, si possible, la référence ou le lien du bien concerné.",
    suggestions: ["Je veux acheter", "Simulation crédit", "Chercher un bien"],
    handoff: true,
  },
  {
    keywords: ["acheter", "achat", "je veux acheter", "acquisition"],
    reply:
      "Pour acheter un bien, commencez par définir votre budget, la zone souhaitée et le type de bien. BH Market Imo peut vous aider à chercher des annonces, lancer une simulation de crédit et contacter un agent.",
    suggestions: ["Chercher un bien", "Simulation crédit", "Documents nécessaires"],
    handoff: false,
  },
  {
    keywords: ["vendre", "vente", "je veux vendre", "mettre en vente", "publier mon bien"],
    reply:
      "Pour vendre un bien, préparez la localisation, la surface, le prix souhaité, des photos, une description et les documents de propriété. Un agent pourra ensuite vous aider à qualifier l'annonce.",
    suggestions: ["Contacter un agent", "Documents nécessaires", "Questions plateforme"],
    handoff: true,
  },
  {
    keywords: ["louer", "location", "je veux louer", "locataire", "loyer"],
    reply:
      "Pour louer un appartement ou une maison, précisez la ville, le quartier, le budget mensuel, la surface et vos critères prioritaires. Je peux vous aider à formuler votre recherche.",
    suggestions: ["Chercher un bien", "Contacter un agent", "Documents nécessaires"],
    handoff: false,
  },
  {
    keywords: ["chercher", "recherche", "bien immobilier", "annonce", "maison", "appartement", "terrain", "villa"],
    reply:
      "Pour chercher un bien, choisissez la ville ou la zone, votre budget, le type de bien et la transaction souhaitée. Vous pourrez ensuite comparer les annonces et ouvrir les détails.",
    suggestions: ["Je veux acheter", "Je veux louer", "Contacter un agent"],
    handoff: false,
  },
];

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function generateAssistantFallbackReply(payload = {}) {
  const message = normalizeText(payload.message);

  if (!message) {
    return {
      reply:
        "Je peux vous aider sur la recherche de biens, l'achat, la vente, la location, la simulation de crédit immobilier BH ou la préparation des documents. Pouvez-vous préciser votre besoin ?",
      suggestions: DEFAULT_SUGGESTIONS,
      handoff: false,
    };
  }

  const intent = INTENTS.find((candidate) =>
    candidate.keywords.some((keyword) => message.includes(normalizeText(keyword)))
  );

  if (intent) {
    return {
      reply: intent.reply,
      suggestions: intent.suggestions,
      handoff: intent.handoff,
    };
  }

  return {
    reply:
      "Je peux vous orienter sur la recherche d'un bien, l'achat, la vente, la location, la simulation de crédit ou la prise de contact avec un agent. Dites-moi ce que vous souhaitez faire en priorité.",
    suggestions: DEFAULT_SUGGESTIONS,
    handoff: false,
  };
}

