import { fetchClientProfile } from "../models/clientModel.js";
import { recordClientActivityLog } from "../models/clientActivityLogModel.js";
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

export async function recordMyClientActivity(req, res) {
  const log = await recordClientActivityLog(req, {
    eventType: req.body?.event_type,
    page: req.body?.page,
    targetType: req.body?.target_type,
    targetId: req.body?.target_id,
    metadata: req.body?.metadata,
  });

  return res.status(201).json({
    recorded: Boolean(log),
    log,
  });
}
