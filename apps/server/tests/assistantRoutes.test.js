import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/assistantProxyService.js", () => ({
  sendAssistantChatMessage: vi.fn(),
}));

vi.mock("../src/services/assistantExperienceService.js", () => ({
  enhanceAssistantResponse: vi.fn((payload, response) => ({
    ...response,
    actions: [{ label: "Explorer les biens", path: "/properties", type: "navigate" }],
    recommendations: [],
    needsLocation: false,
  })),
}));

const { sendAssistantChatMessage } = await import("../src/services/assistantProxyService.js");
const { enhanceAssistantResponse } = await import("../src/services/assistantExperienceService.js");
const { app } = await import("../src/app.js");

describe("assistantRoutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("proxies a valid assistant chat payload", async () => {
    sendAssistantChatMessage.mockResolvedValue({
      reply: "Bonjour, je peux vous aider.",
      suggestions: ["Chercher un bien"],
      handoff: false,
    });

    const response = await request(app)
      .post("/api/assistant/chat")
      .send({ message: "Bonjour" })
      .expect(200);

    expect(response.body).toEqual({
      reply: "Bonjour, je peux vous aider.",
      suggestions: ["Chercher un bien"],
      handoff: false,
      actions: [{ label: "Explorer les biens", path: "/properties", type: "navigate" }],
      recommendations: [],
      needsLocation: false,
    });
    expect(sendAssistantChatMessage).toHaveBeenCalledWith({
      message: "Bonjour",
      history: [],
      context: {},
    });
    expect(enhanceAssistantResponse).toHaveBeenCalledWith(
      {
        message: "Bonjour",
        history: [],
        context: {},
      },
      {
        reply: "Bonjour, je peux vous aider.",
        suggestions: ["Chercher un bien"],
        handoff: false,
      }
    );
  });

  it("rejects an empty assistant message", async () => {
    const response = await request(app)
      .post("/api/assistant/chat")
      .send({ message: "" })
      .expect(400);

    expect(response.body.message).toBe("Request validation failed");
    expect(sendAssistantChatMessage).not.toHaveBeenCalled();
  });
});
