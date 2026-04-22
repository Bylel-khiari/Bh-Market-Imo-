import {
  createCreditApplication,
  fetchAgentCreditApplicationSummary,
  fetchAgentCreditApplications,
  fetchClientCreditApplications,
  updateCreditApplicationReview,
} from "../models/creditApplicationModel.js";
import {
  renderAgentCreditApplicationList,
  renderClientCreditApplicationList,
  renderCreatedCreditApplication,
  renderUpdatedCreditApplication,
} from "../views/creditApplicationView.js";

export async function submitCreditApplication(req, res) {
  const application = await createCreditApplication({
    clientUserId: req.user?.sub,
    propertyId: req.body?.property_id,
    fullName: req.body?.full_name,
    email: req.body?.email,
    phone: req.body?.phone,
    cin: req.body?.cin,
    rib: req.body?.rib,
    fundingType: req.body?.funding_type,
    socioCategory: req.body?.socio_category,
    propertyTitle: req.body?.property_title,
    propertyLocation: req.body?.property_location,
    propertyPriceValue: req.body?.property_price_value,
    propertyPriceRaw: req.body?.property_price_raw,
    requestedAmount: req.body?.requested_amount,
    personalContribution: req.body?.personal_contribution,
    grossIncome: req.body?.gross_income,
    incomePeriod: req.body?.income_period,
    durationMonths: req.body?.duration_months,
    estimatedMonthlyPayment: req.body?.estimated_monthly_payment,
    estimatedRate: req.body?.estimated_rate,
    debtRatio: req.body?.debt_ratio,
    documents: req.body?.documents,
  });

  return renderCreatedCreditApplication(res, application);
}

export async function listMyCreditApplications(req, res) {
  const applications = await fetchClientCreditApplications({
    clientUserId: req.user?.sub,
    limit: req.query?.limit,
  });

  return renderClientCreditApplicationList(res, { applications });
}

export async function listAgentCreditApplications(req, res) {
  const [applications, summary] = await Promise.all([
    fetchAgentCreditApplications({
      limit: req.query?.limit,
      status: req.query?.status,
      search: req.query?.search,
    }),
    fetchAgentCreditApplicationSummary(),
  ]);

  return renderAgentCreditApplicationList(res, { applications, summary });
}

export async function updateAgentCreditApplication(req, res) {
  const application = await updateCreditApplicationReview(req.params.id, {
    status: req.body?.status,
    complianceScore: req.body?.compliance_score,
    complianceSummary: req.body?.compliance_summary,
    agentNote: req.body?.agent_note,
    agentUserId: req.user?.sub,
  });

  return renderUpdatedCreditApplication(res, application);
}
