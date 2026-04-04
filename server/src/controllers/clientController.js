import { fetchClientProfile } from "../services/clientService.js";

export async function getMyClientProfile(req, res) {
  try {
    const userId = req.user?.sub;
    const profile = await fetchClientProfile(userId);

    if (!profile) {
      return res.status(404).json({ message: "Client profile not found" });
    }

    return res.json({ profile });
  } catch (error) {
    console.error("Failed to fetch client profile:", error);
    return res.status(500).json({ message: "Failed to fetch client profile" });
  }
}
