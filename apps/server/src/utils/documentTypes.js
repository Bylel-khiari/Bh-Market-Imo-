/**
 * Document types for credit applications
 * Each document type defines: key, label, description, required flag
 */

export const DOCUMENT_TYPES = {
  BH_FORM: {
    key: "BH_FORM",
    label: "BH Habitat Form",
    description: "Demande de Crédit Habitat",
    required: true,
    downloadUrl: "/documents/BH-Demande-Credit-Habitat.pdf",
  },
  ID_COPY: {
    key: "ID_COPY",
    label: "Identity Document",
    description: "CIN / Passport copy",
    required: true,
    downloadUrl: null,
  },
  INCOME_PROOF: {
    key: "INCOME_PROOF",
    label: "Income Proof",
    description: "Pay stubs, tax returns, or income statement",
    required: true,
    downloadUrl: null,
  },
  PROPERTY_DOCS: {
    key: "PROPERTY_DOCS",
    label: "Property Documents",
    description: "Deed, survey, or property-related documents",
    required: true,
    downloadUrl: null,
  },
  BANK_STATEMENTS: {
    key: "BANK_STATEMENTS",
    label: "Bank Statements",
    description: "Last 3-6 months of bank statements",
    required: true,
    downloadUrl: null,
  },
  EMPLOYMENT_CONTRACT: {
    key: "EMPLOYMENT_CONTRACT",
    label: "Employment Contract",
    description: "Employment contract or professional status proof",
    required: true,
    downloadUrl: null,
  },
};

export const DOCUMENT_TYPE_KEYS = Object.keys(DOCUMENT_TYPES);

export const REQUIRED_DOCUMENTS = Object.values(DOCUMENT_TYPES)
  .filter(doc => doc.required)
  .map(doc => doc.key);

/**
 * Get document type by key
 * @param {string} key
 * @returns {object|null}
 */
export function getDocumentType(key) {
  return DOCUMENT_TYPES[key] || null;
}

/**
 * Validate document type key
 * @param {string} key
 * @returns {boolean}
 */
export function isValidDocumentType(key) {
  return DOCUMENT_TYPE_KEYS.includes(key);
}

/**
 * Get all required document keys
 * @returns {string[]}
 */
export function getRequiredDocumentKeys() {
  return REQUIRED_DOCUMENTS;
}

/**
 * Check if all required documents are present
 * @param {Array<{type: string, name: string}>} documents
 * @returns {object} { isComplete: boolean, missing: string[] }
 */
export function validateDocumentCompleteness(documents) {
  if (!Array.isArray(documents)) {
    return {
      isComplete: false,
      missing: REQUIRED_DOCUMENTS,
    };
  }

  const providedTypes = new Set(documents.map(doc => doc.type));
  const missing = REQUIRED_DOCUMENTS.filter(type => !providedTypes.has(type));

  return {
    isComplete: missing.length === 0,
    missing,
  };
}
