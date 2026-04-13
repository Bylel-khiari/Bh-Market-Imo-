import { fetchAgentProfile } from "../services/agentService.js";
import { httpError } from "../utils/httpError.js";

export async function getMyAgentProfile(req, res) {
  const userId = req.user?.sub;
  const profile = await fetchAgentProfile(userId);

  if (!profile) {
    throw httpError(404, "Agent profile not found");
  }

  return res.json({ profile });
}
