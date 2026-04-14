import { fetchAgentProfile } from "../models/agentModel.js";
import { httpError } from "../utils/httpError.js";
import { renderAgentProfile } from "../views/agentView.js";

export async function getMyAgentProfile(req, res) {
  const userId = req.user?.sub;
  const profile = await fetchAgentProfile(userId);

  if (!profile) {
    throw httpError(404, "Agent profile not found");
  }

  return renderAgentProfile(res, profile);
}
