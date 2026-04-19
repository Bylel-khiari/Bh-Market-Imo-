import {
  createPropertyReport,
  fetchAdminPropertyReports,
  fetchUnreadPropertyReportCount,
  updatePropertyReportStatus,
} from "../models/propertyReportModel.js";
import {
  renderAdminPropertyReportList,
  renderCreatedPropertyReport,
  renderUpdatedPropertyReport,
} from "../views/propertyReportView.js";

export async function submitPropertyReport(req, res) {
  const report = await createPropertyReport({
    propertyId: req.params.id,
    reporterUserId: req.user?.sub,
    category: req.body?.category,
    message: req.body?.message,
  });

  return renderCreatedPropertyReport(res, report);
}

export async function listAdminPropertyReports(req, res) {
  const reports = await fetchAdminPropertyReports({
    limit: req.query.limit,
    status: req.query.status,
  });

  const unreadCount = await fetchUnreadPropertyReportCount();
  return renderAdminPropertyReportList(res, { reports, unreadCount });
}

export async function updateAdminPropertyReportStatus(req, res) {
  const report = await updatePropertyReportStatus(req.params.id, {
    status: req.body?.status,
    adminNote: req.body?.admin_note,
    reviewedByAdminUserId: req.user?.sub,
  });

  return renderUpdatedPropertyReport(res, report);
}