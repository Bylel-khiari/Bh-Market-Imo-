import { fetchClientProfile } from "../services/clientService.js";
import { httpError } from "../utils/httpError.js";

export async function getMyClientProfile(req, res) {
  const userId = req.user?.sub;
  const profile = await fetchClientProfile(userId);

  if (!profile) {
    throw httpError(404, "Client profile not found");
  }

  return res.json({ profile });
}
