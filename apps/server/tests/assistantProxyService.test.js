import { describe, expect, it, vi } from "vitest";

import { sendAssistantChatMessage } from "../src/services/assistantProxyService.js";

describe("assistantProxyService", () => {
  it("returns the Python assistant response when the service is reachable", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        reply: "Réponse du service Python",
        suggestions: ["Simulation crédit"],
        handoff: false,
      }),
    });

    const response = await sendAssistantChatMessage(
      { message: "Simulation crédit", history: [], context: {} },
      { fetchImpl, serviceUrl: "http://assistant.test", timeoutMs: 100 }
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://assistant.test/chat",
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(response).toEqual({
      reply: "Réponse du service Python",
      suggestions: ["Simulation crédit"],
      handoff: false,
    });
  });

  it("falls back to a useful local reply when the Python service is unavailable", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await sendAssistantChatMessage(
      { message: "Je veux acheter une maison", history: [], context: {} },
      { fetchImpl, serviceUrl: "http://assistant.test", timeoutMs: 100 }
    );

    expect(response.reply).toContain("acheter un bien");
    expect(response.suggestions).toContain("Simulation crédit");
    expect(response.handoff).toBe(false);
  });
});

