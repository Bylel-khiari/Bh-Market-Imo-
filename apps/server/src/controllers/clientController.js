import { fetchClientProfile } from "../models/clientModel.js";
import { httpError } from "../utils/httpError.js";
import { renderClientProfile } from "../views/clientView.js";

export async function getMyClientProfile(req, res) {
  const userId = req.user?.sub;
  const profile = await fetchClientProfile(userId);

  if (!profile) {
    throw httpError(404, "Client profile not found");
  }

  return renderClientProfile(res, profile);
}
