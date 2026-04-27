import { describe, expect, it, vi } from "vitest";

import {
  detectAssistantExperienceIntent,
  enhanceAssistantResponse,
} from "../src/services/assistantExperienceService.js";

describe("assistantExperienceService", () => {
  it("detects property search intent and recommends properties near the client city", async () => {
    const fetchPropertiesImpl = vi.fn().mockResolvedValue([
      {
        id: 42,
        title: "Appartement S+2 à Sousse",
        city: "Sousse",
        location_raw: "Sousse Corniche",
        price_raw: "320 000 DT",
        image: "https://example.test/image.jpg",
      },
    ]);

    const response = await enhanceAssistantResponse(
      {
        message: "Je veux acheter un appartement proche de moi",
        history: [],
        context: { clientCity: "Sousse" },
      },
      { reply: "Bien sûr.", suggestions: [], handoff: false },
      { fetchPropertiesImpl }
    );

    expect(fetchPropertiesImpl).toHaveBeenCalledWith({ limit: 80, city: "Sousse" });
    expect(response.actions[0].path).toContain("location=Sousse");
    expect(response.recommendations).toHaveLength(1);
    expect(response.recommendations[0]).toMatchObject({
      id: 42,
      city: "Sousse",
      path: expect.stringContaining("focusId=42"),
    });
    expect(response.needsLocation).toBe(false);
  });

  it("asks for location when property search has no known city", async () => {
    const response = await enhanceAssistantResponse(
      {
        message: "Recommande-moi des biens près de moi",
        history: [],
        context: {},
      },
      { reply: "Je peux chercher.", suggestions: [], handoff: false },
      { fetchPropertiesImpl: vi.fn().mockResolvedValue([]) }
    );

    expect(response.needsLocation).toBe(true);
    expect(response.actions[0].path).toBe("/properties");
  });

  it("builds credit navigation actions for credit questions", () => {
    expect(detectAssistantExperienceIntent("Je veux faire une simulation crédit")).toBe("credit");
  });
});

