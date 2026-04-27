import { fetchProperties } from "../models/propertyModel.js";

const TUNISIAN_LOCATIONS = [
  "Tunis",
  "Ariana",
  "Ben Arous",
  "Manouba",
  "Nabeul",
  "Zaghouan",
  "Bizerte",
  "Béja",
  "Jendouba",
  "Kef",
  "Siliana",
  "Sousse",
  "Monastir",
  "Mahdia",
  "Sfax",
  "Kairouan",
  "Kasserine",
  "Sidi Bouzid",
  "Gabès",
  "Médenine",
  "Tataouine",
  "Gafsa",
  "Tozeur",
  "Kébili",
  "La Marsa",
  "Carthage",
  "Lac 1",
  "Lac 2",
  "Menzah",
  "Marsa",
  "Hammamet",
  "Djerba",
];

const PROPERTY_TYPES = [
  { label: "Appartement", keywords: ["appartement", "appart", "studio", "s+1", "s+2", "s+3"] },
  { label: "Villa", keywords: ["villa"] },
  { label: "Maison", keywords: ["maison"] },
  { label: "Terrain", keywords: ["terrain"] },
  { label: "Bureau", keywords: ["bureau", "local", "commerce", "commercial"] },
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

function containsAny(normalizedMessage, keywords) {
  return keywords.some((keyword) => normalizedMessage.includes(normalizeText(keyword)));
}

export function detectAssistantExperienceIntent(message = "") {
  const normalizedMessage = normalizeText(message);

  if (containsAny(normalizedMessage, ["simulation", "credit", "pret", "mensualite", "financement"])) {
    return "credit";
  }

  if (containsAny(normalizedMessage, ["documents", "dossier", "pieces", "papier", "justificatif"])) {
    return "documents";
  }

  if (containsAny(normalizedMessage, ["contacter", "contact", "agent", "conseiller", "rendez vous", "rdv"])) {
    return "contact";
  }

  if (containsAny(normalizedMessage, ["vendre", "vente", "publier", "mettre en vente"])) {
    return "sell";
  }

  if (containsAny(normalizedMessage, ["favoris", "favori", "sauvegarde"])) {
    return "favorites";
  }

  if (
    containsAny(normalizedMessage, [
      "chercher",
      "trouver",
      "recommande",
      "recommander",
      "proche",
      "pres de moi",
      "autour de moi",
      "acheter",
      "louer",
      "location",
      "maison",
      "appartement",
      "villa",
      "terrain",
    ])
  ) {
    return "property_search";
  }

  return "general";
}

function detectPropertyType(message = "") {
  const normalizedMessage = normalizeText(message);
  return PROPERTY_TYPES.find((type) => containsAny(normalizedMessage, type.keywords))?.label || "";
}

function extractLocationFromText(value = "") {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) return "";

  const found = TUNISIAN_LOCATIONS.find((location) => normalizedValue.includes(normalizeText(location)));
  return found || "";
}

function resolveClientLocation(payload = {}) {
  const context = payload.context || {};

  return (
    context.clientCity ||
    context.location?.city ||
    extractLocationFromText(context.clientAddress) ||
    extractLocationFromText(context.location?.address) ||
    extractLocationFromText(payload.message) ||
    ""
  );
}

function buildPropertiesPath({ city, type, query, focusId } = {}) {
  const params = new URLSearchParams();

  if (query) params.set("q", query);
  if (city) params.set("location", city);
  if (type) params.set("type", type);
  if (focusId) params.set("focusId", String(focusId));

  const queryString = params.toString();
  return `/properties${queryString ? `?${queryString}` : ""}`;
}

function buildActions({ intent, city, type, message } = {}) {
  const actions = [];
  const normalizedMessage = normalizeText(message);

  if (intent === "credit") {
    actions.push({ label: "Ouvrir la simulation", path: "/credit-simulation", type: "navigate" });
    actions.push({ label: "Demande de crédit", path: "/credit-immobilier-bh", type: "navigate" });
  }

  if (intent === "documents") {
    actions.push({ label: "Voir le portail crédit", path: "/credit-immobilier-bh", type: "navigate" });
    actions.push({ label: "Contacter un conseiller", path: "/contact", type: "navigate" });
  }

  if (intent === "contact" || intent === "sell") {
    actions.push({ label: "Contacter l'équipe", path: "/contact", type: "navigate" });
  }

  if (intent === "favorites") {
    actions.push({ label: "Voir mes favoris", path: "/properties?favorites=1", type: "navigate" });
  }

  if (intent === "property_search") {
    actions.push({
      label: city ? `Voir les biens à ${city}` : "Voir les biens",
      path: buildPropertiesPath({
        city,
        type,
        query: normalizedMessage.includes("louer") || normalizedMessage.includes("location") ? "location" : "",
      }),
      type: "navigate",
    });
  }

  if (!actions.length) {
    actions.push({ label: "Explorer les biens", path: "/properties", type: "navigate" });
    actions.push({ label: "Simulation crédit", path: "/credit-simulation", type: "navigate" });
  }

  return actions.slice(0, 3);
}

function scoreProperty(property, { city, type, message }) {
  const haystack = normalizeText(
    [property.title, property.city, property.governorate, property.location_raw, property.description].join(" ")
  );
  let score = 0;

  if (city && haystack.includes(normalizeText(city))) score += 40;
  if (type && haystack.includes(normalizeText(type))) score += 20;
  if (containsAny(normalizeText(message), ["acheter", "achat"]) && !haystack.includes("location")) score += 8;
  if (property.image) score += 4;
  if (Number(property.price_value) > 0 || property.price_raw) score += 4;
  if (property.description) score += 2;

  return score;
}

function toRecommendation(property, city, type) {
  return {
    id: property.id,
    title: property.title || "Bien immobilier",
    city: property.city || property.governorate || "",
    location: property.location_raw || property.city || "",
    price: property.price_raw || "",
    priceValue: property.price_value || null,
    image: property.image || "",
    path: buildPropertiesPath({ city: property.city || city, type, focusId: property.id }),
    simulationPath: property.id ? `/credit-simulation?propertyId=${encodeURIComponent(property.id)}` : "/credit-simulation",
  };
}

async function fetchRecommendations({ payload, intent, city, type, fetchPropertiesImpl }) {
  if (intent !== "property_search" || !city) {
    return [];
  }

  const limit = 80;
  let rows = [];

  if (city) {
    rows = await fetchPropertiesImpl({ limit, city });
  }

  if (!rows.length) {
    rows = await fetchPropertiesImpl({ limit });
  }

  return rows
    .map((property) => ({ property, score: scoreProperty(property, { city, type, message: payload.message }) }))
    .filter((item) => item.score > 0 || !city)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ property }) => toRecommendation(property, city, type));
}

export async function enhanceAssistantResponse(payload = {}, response = {}, options = {}) {
  const fetchPropertiesImpl = options.fetchPropertiesImpl || fetchProperties;
  const intent = detectAssistantExperienceIntent(payload.message);
  const city = resolveClientLocation(payload);
  const type = detectPropertyType(payload.message);
  const actions = buildActions({ intent, city, type, message: payload.message });
  const needsLocation = intent === "property_search" && !city;

  let recommendations = [];
  try {
    recommendations = await fetchRecommendations({ payload, intent, city, type, fetchPropertiesImpl });
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("BH Assistant recommendations unavailable:", error?.message || "Unknown error");
    }
  }

  return {
    ...response,
    actions,
    recommendations,
    needsLocation,
  };
}
