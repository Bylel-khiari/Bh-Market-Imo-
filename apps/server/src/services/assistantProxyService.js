import { generateAssistantFallbackReply } from "./assistantFallbackService.js";

const DEFAULT_ASSISTANT_SERVICE_URL = "http://localhost:8001";
const DEFAULT_TIMEOUT_MS = 5000;

const FALLBACK_SUGGESTIONS = ["Chercher un bien", "Simulation crédit", "Contacter un agent"];

export function resolveAssistantServiceUrl(env = process.env) {
  return String(env.ASSISTANT_SERVICE_URL || DEFAULT_ASSISTANT_SERVICE_URL).replace(/\/+$/, "");
}

function normalizeAssistantResponse(payload, originalPayload) {
  const reply = typeof payload?.reply === "string" ? payload.reply.trim() : "";
  const suggestions = Array.isArray(payload?.suggestions)
    ? payload.suggestions.filter((item) => typeof item === "string" && item.trim()).slice(0, 6)
    : FALLBACK_SUGGESTIONS;

  if (!reply) {
    return generateAssistantFallbackReply(originalPayload);
  }

  return {
    reply,
    suggestions,
    handoff: Boolean(payload?.handoff),
  };
}

export async function sendAssistantChatMessage(payload, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;

  if (!fetchImpl) {
    return generateAssistantFallbackReply(payload);
  }

  const baseUrl = options.serviceUrl || resolveAssistantServiceUrl(options.env);
  const timeoutMs = Number(options.timeoutMs || process.env.ASSISTANT_PROXY_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(`${baseUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Assistant service returned HTTP ${response.status}`);
    }

    const data = await response.json();
    return normalizeAssistantResponse(data, payload);
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("BH Assistant proxy unavailable:", error?.message || "Unknown error");
    }

    return generateAssistantFallbackReply(payload);
  } finally {
    clearTimeout(timeout);
  }
}
