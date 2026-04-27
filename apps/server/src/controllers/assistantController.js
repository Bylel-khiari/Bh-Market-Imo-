import { sendAssistantChatMessage } from "../services/assistantProxyService.js";
import { enhanceAssistantResponse } from "../services/assistantExperienceService.js";

export async function chatWithAssistant(req, res) {
  const assistantResponse = await sendAssistantChatMessage(req.body);
  const enhancedResponse = await enhanceAssistantResponse(req.body, assistantResponse);
  return res.status(200).json(enhancedResponse);
}
