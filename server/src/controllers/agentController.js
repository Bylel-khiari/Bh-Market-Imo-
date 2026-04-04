import { fetchAgentProfile } from "../services/agentService.js";

export async function getMyAgentProfile(req, res) {
  try {
    const userId = req.user?.sub;
    const profile = await fetchAgentProfile(userId);

    if (!profile) {
      return res.status(404).json({ message: "Agent profile not found" });
    }

    return res.json({ profile });
  } catch (error) {
    console.error("Failed to fetch agent profile:", error);
    return res.status(500).json({ message: "Failed to fetch agent profile" });
  }
}
