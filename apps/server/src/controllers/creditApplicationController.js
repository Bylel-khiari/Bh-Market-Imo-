import {
  createCreditApplication,
  fetchAgentCreditApplicationSummary,
  fetchAgentCreditApplications,
  fetchCreditApplicationById,
  fetchClientCreditApplications,
  updateCreditApplicationScoring,
  updateCreditApplicationReview,
} from "../models/creditApplicationModel.js";
import {
  renderAgentCreditApplicationList,
  renderClientCreditApplicationList,
  renderCreatedCreditApplication,
  renderUpdatedCreditApplication,
} from "../views/creditApplicationView.js";
import {
  scoreCreditApplication,
  determineApplicationStatus,
} from "../services/creditScoringService.js";

function toScoringApplicationData(application) {
  return {
    fullName: application?.full_name,
    socioCategory: application?.socio_category,
    grossIncome: application?.gross_income_value,
    incomePeriod: application?.income_period,
    revenu_annuel: application?.revenu_annuel,
    charges_impayees: application?.charges_impayees,
    situation_familiale: application?.situation_familiale,
    situation_contractuelle: application?.situation_contractuelle,
    other_monthly_charges: application?.other_monthly_charges,
    estimatedMonthlyPayment: application?.estimated_monthly_payment,
    debtRatio: application?.debt_ratio,
    documents: application?.typed_documents?.length
      ? application.typed_documents
      : application?.documents,
  };
}

export async function submitCreditApplication(req, res) {
  // Prepare application data
  const applicationData = {
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
    revenuAnnuel: req.body?.revenu_annuel,
    chargesImpayees: req.body?.charges_impayees,
    familySituation: req.body?.situation_familiale,
    contractType: req.body?.situation_contractuelle,
    otherMonthlyCharges: req.body?.other_monthly_charges,
    durationMonths: req.body?.duration_months,
    estimatedMonthlyPayment: req.body?.estimated_monthly_payment,
    estimatedRate: req.body?.estimated_rate,
    debtRatio: req.body?.debt_ratio,
    documents: req.body?.documents,
  };

  let scoringResult = null;
  let applicationStatus = null;

  // Attempt to score the application
  try {
    scoringResult = await scoreCreditApplication(applicationData);
    applicationData.revenuAnnuel =
      scoringResult.scoring_request_data?.revenu_annuel ?? applicationData.revenuAnnuel;
    applicationData.chargesImpayees =
      scoringResult.scoring_request_data?.charges_impayees ?? applicationData.chargesImpayees;
    applicationData.familySituation =
      scoringResult.scoring_request_data?.situation_familiale ?? applicationData.familySituation;
    applicationData.contractType =
      scoringResult.scoring_request_data?.situation_contractuelle ?? applicationData.contractType;

    applicationStatus = determineApplicationStatus(scoringResult);
  } catch (scoringError) {
    // Log scoring error but continue with application submission
    console.error("Credit scoring failed:", scoringError.message);
    // If scoring fails, the application will be created with status "SOUMIS"
    // and an agent will need to review it manually
  }

  // Create the credit application with scoring results (if available)
  const application = await createCreditApplication({
    ...applicationData,
    complianceScore: applicationStatus?.complianceScore,
    complianceSummary: applicationStatus?.complianceSummary,
    initialStatus: applicationStatus?.status,
    scoringResult: scoringResult,
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

export async function scoreAgentCreditApplication(req, res) {
  const currentApplication = await fetchCreditApplicationById(req.params.id);
  const scoringResult = await scoreCreditApplication(toScoringApplicationData(currentApplication));
  const applicationStatus = determineApplicationStatus(scoringResult);

  const application = await updateCreditApplicationScoring(req.params.id, {
    scoringResult: {
      ...scoringResult,
      complianceSummary: applicationStatus.complianceSummary,
    },
    nextStatus: applicationStatus.status,
    agentUserId: req.user?.sub,
  });

  return renderUpdatedCreditApplication(res, application);
}
