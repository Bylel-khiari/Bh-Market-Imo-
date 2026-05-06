import React, { useEffect, useMemo, useState } from 'react';
import {
  FaCheckCircle,
  FaCloudUploadAlt,
  FaDownload,
  FaExclamationTriangle,
  FaFileAlt,
} from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAuthSession, safeRecordClientActivity, submitCreditApplicationApi } from '../lib/auth';

// Document types configuration - must match backend documentTypes.js
const DOCUMENT_TYPES = {
  BH_FORM: {
    key: "BH_FORM",
    label: "Formulaire BH Habitat",
    description: "Demande de Crédit Habitat",
    required: true,
    downloadUrl: "/documents/BH-Demande-Credit-Habitat.pdf",
    fileInputId: "doc-bh-form",
  },
  ID_COPY: {
    key: "ID_COPY",
    label: "Pièce d’identité",
    description: "Copie CIN ou passeport",
    required: true,
    downloadUrl: null,
    fileInputId: "doc-id-copy",
  },
  INCOME_PROOF: {
    key: "INCOME_PROOF",
    label: "Justificatifs de revenus",
    description: "Fiches de paie, declaration fiscale ou attestation de revenu",
    required: true,
    downloadUrl: null,
    fileInputId: "doc-income-proof",
  },
  PROPERTY_DOCS: {
    key: "PROPERTY_DOCS",
    label: "Documents du bien",
    description: "Promesse de vente, titre ou documents immobiliers",
    required: true,
    downloadUrl: null,
    fileInputId: "doc-property-docs",
  },
  BANK_STATEMENTS: {
    key: "BANK_STATEMENTS",
    label: "Releves bancaires",
    description: "Releves des 3 a 6 derniers mois",
    required: true,
    downloadUrl: null,
    fileInputId: "doc-bank-statements",
  },
  EMPLOYMENT_CONTRACT: {
    key: "EMPLOYMENT_CONTRACT",
    label: "Situation professionnelle",
    description: "Contrat de travail ou justificatif d'activite",
    required: true,
    downloadUrl: null,
    fileInputId: "doc-employment-contract",
  },
};

const REQUIRED_DOCUMENT_KEYS = Object.values(DOCUMENT_TYPES)
  .filter(doc => doc.required)
  .map(doc => doc.key);

function formatCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Non renseigné';
  }

  return `${new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(Math.round(amount))} DT`;
}

function createEmptyFormData(authSession) {
  return {
    fullName: authSession?.user?.name || '',
    email: authSession?.user?.email || '',
    phone: '',
    cin: '',
    rib: '',
    scoringAnnualIncome: '',
    scoringAnnualCharges: '',
    familySituation: '',
    contractType: '',
    otherMonthlyCharges: '',
  };
}

function toPositiveNumberOrNull(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function mapSocioCategoryToContractType(socioCategory) {
  const categoryMap = {
    salarie: 'CDI',
    fonctionnaire: 'fonctionnaire',
    profession_libre: 'profession liberale',
    profession_liberale: 'profession liberale',
    retraite: 'retraite',
    independant: 'independant',
  };

  return categoryMap[socioCategory] || '';
}

function calculateAnnualIncome(income, incomePeriod) {
  const amount = Number(income || 0);
  if (!Number.isFinite(amount) || amount <= 0) return '';
  return Math.round(incomePeriod === 'annual' ? amount : amount * 12);
}

export default function CreditImmobilierBHPortal() {
  const location = useLocation();
  const navigate = useNavigate();
  const [authSession, setAuthSession] = useState(() => getAuthSession());
  const [formData, setFormData] = useState(() => createEmptyFormData(getAuthSession()));
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadedDocuments, setUploadedDocuments] = useState({});
  const [formResetKey, setFormResetKey] = useState(0);
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const propertyContext = useMemo(() => {
    const propertyPrice = Number(params.get('price') || 0);
    const requestedAmount = Number(params.get('amount') || 0);
    const monthlyPayment = Number(params.get('monthlyPayment') || 0);
    const otherMonthlyCharges = Number(params.get('otherMonthlyCharges') || 0);
    const debtRatio = Number(params.get('debtRatio') || 0);

    return {
      propertyId: params.get('propertyId') || '',
      propertyTitle: params.get('title') || '',
      propertyLocation: params.get('location') || '',
      propertyPrice: Number.isFinite(propertyPrice) ? propertyPrice : 0,
      requestedAmount: Number.isFinite(requestedAmount) ? requestedAmount : 0,
      contribution: Number(params.get('contribution') || 0) || 0,
      income: Number(params.get('income') || 0) || 0,
      incomePeriod: params.get('incomePeriod') || '',
      duration: Number(params.get('duration') || 0) || 0,
      monthlyPayment: Number.isFinite(monthlyPayment) ? monthlyPayment : 0,
      otherMonthlyCharges: Number.isFinite(otherMonthlyCharges) ? otherMonthlyCharges : 0,
      rate: Number(params.get('rate') || 0) || 0,
      debtRatio: Number.isFinite(debtRatio) ? debtRatio : 0,
      fundingType: params.get('fundingType') || '',
      socioCategory: params.get('socioCategory') || '',
    };
  }, [params]);

  useEffect(() => {
    const bootstrapId = 'bh-bootstrap-css';
    let injectedBootstrapLink = null;

    if (!document.getElementById(bootstrapId)) {
      const link = document.createElement('link');
      link.id = bootstrapId;
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css';
      document.head.appendChild(link);
      injectedBootstrapLink = link;
    }

    return () => {
      if (injectedBootstrapLink?.parentNode) {
        injectedBootstrapLink.parentNode.removeChild(injectedBootstrapLink);
      }
    };
  }, []);

  useEffect(() => {
    const syncAuthSession = () => {
      const nextSession = getAuthSession();
      setAuthSession(nextSession);
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || nextSession?.user?.name || '',
        email: prev.email || nextSession?.user?.email || '',
      }));
    };

    window.addEventListener('storage', syncAuthSession);
    return () => window.removeEventListener('storage', syncAuthSession);
  }, []);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      fullName: prev.fullName || authSession?.user?.name || '',
      email: prev.email || authSession?.user?.email || '',
    }));
  }, [authSession]);

  useEffect(() => {
    const annualIncome = calculateAnnualIncome(propertyContext.income, propertyContext.incomePeriod);
    const annualCharges = Math.round(
      (Number(propertyContext.monthlyPayment || 0) + Number(propertyContext.otherMonthlyCharges || 0)) * 12,
    );
    const contractType = mapSocioCategoryToContractType(propertyContext.socioCategory);

    setFormData((prev) => ({
      ...prev,
      scoringAnnualIncome: prev.scoringAnnualIncome || annualIncome || '',
      scoringAnnualCharges: prev.scoringAnnualCharges || (annualCharges > 0 ? String(annualCharges) : ''),
      otherMonthlyCharges:
        prev.otherMonthlyCharges ||
        (propertyContext.otherMonthlyCharges > 0 ? String(Math.round(propertyContext.otherMonthlyCharges)) : ''),
      contractType: prev.contractType || contractType,
    }));
  }, [propertyContext]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDocumentChange = (documentType, event) => {
    const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
    setUploadedDocuments((prev) => ({
      ...prev,
      [documentType]: file ? file.name : null,
    }));
  };

  const trackCreditApplicationEvent = (eventType, metadata = {}) => {
    const propertyId = propertyContext.propertyId ? String(propertyContext.propertyId) : null;

    safeRecordClientActivity({
      event_type: eventType,
      page: '/credit-immobilier-bh',
      target_type: propertyId ? 'property' : null,
      target_id: propertyId,
      metadata: {
        property_title: propertyContext.propertyTitle || null,
        requested_amount: propertyContext.requestedAmount || null,
        property_price: propertyContext.propertyPrice || null,
        ...metadata,
      },
    });
  };

  const getMissingRequiredDocuments = () => {
    return REQUIRED_DOCUMENT_KEYS.filter(key => !uploadedDocuments[key]);
  };

  const openSubmissionModal = () => {
    setSuccessMessage('');
    setErrorMessage('');
    setIsSubmissionOpen(true);
    trackCreditApplicationEvent('credit_application_form_open', {
      has_authenticated_client: Boolean(authSession?.token && authSession?.user?.role === 'client'),
    });
  };

  const closeSubmissionModal = () => {
    if (submitting) return;
    setIsSubmissionOpen(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    if (!authSession?.token) {
      navigate('/login', {
        state: { from: `/credit-immobilier-bh${location.search}` },
      });
      return;
    }

    if (authSession?.user?.role !== 'client') {
      setErrorMessage('Le dépôt de dossier est réservé aux comptes client.');
      return;
    }

    const missingDocs = getMissingRequiredDocuments();
    if (missingDocs.length > 0) {
      setErrorMessage(`Documents manquants: ${missingDocs.map(key => DOCUMENT_TYPES[key]?.label).join(', ')}`);
      return;
    }

    // Convert uploadedDocuments to typed documents format
    const documents = Object.entries(uploadedDocuments)
      .filter(([, fileName]) => fileName)
      .map(([docType, fileName]) => ({
        type: docType,
        name: fileName,
      }));
    const scoringAnnualIncome = toPositiveNumberOrNull(formData.scoringAnnualIncome);
    const scoringAnnualCharges = toPositiveNumberOrNull(formData.scoringAnnualCharges);
    const otherMonthlyCharges = toPositiveNumberOrNull(formData.otherMonthlyCharges);

    try {
      setSubmitting(true);

      await submitCreditApplicationApi(
        {
          property_id: propertyContext.propertyId ? Number(propertyContext.propertyId) : undefined,
          full_name: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          cin: formData.cin.trim(),
          rib: formData.rib.trim(),
          funding_type: propertyContext.fundingType || null,
          socio_category: propertyContext.socioCategory || null,
          property_title: propertyContext.propertyTitle || null,
          property_location: propertyContext.propertyLocation || null,
          property_price_value: propertyContext.propertyPrice > 0 ? propertyContext.propertyPrice : null,
          property_price_raw: propertyContext.propertyPrice > 0 ? formatCurrency(propertyContext.propertyPrice) : null,
          requested_amount: propertyContext.requestedAmount > 0 ? propertyContext.requestedAmount : null,
          personal_contribution: propertyContext.contribution > 0 ? propertyContext.contribution : null,
          gross_income: propertyContext.income > 0 ? propertyContext.income : scoringAnnualIncome,
          income_period: propertyContext.incomePeriod || (scoringAnnualIncome ? 'annual' : null),
          revenu_annuel: scoringAnnualIncome,
          charges_impayees: scoringAnnualCharges,
          situation_familiale: formData.familySituation || null,
          situation_contractuelle: formData.contractType || null,
          other_monthly_charges: otherMonthlyCharges,
          duration_months: propertyContext.duration > 0 ? propertyContext.duration : null,
          estimated_monthly_payment: propertyContext.monthlyPayment > 0 ? propertyContext.monthlyPayment : null,
          estimated_rate: propertyContext.rate > 0 ? propertyContext.rate : null,
          debt_ratio: propertyContext.debtRatio > 0 ? propertyContext.debtRatio : null,
          documents,
        },
        authSession.token,
      );

      setSuccessMessage('Votre dossier a été transmis à l’équipe bancaire avec succès.');
      setUploadedDocuments({});
      setFormData(createEmptyFormData(authSession));
      setFormResetKey((prev) => prev + 1);
    } catch (requestError) {
      setErrorMessage(requestError.message || 'Impossible de déposer votre dossier.');
    } finally {
      setSubmitting(false);
    }
  };

  const requiredDocumentsList = REQUIRED_DOCUMENT_KEYS.map(key => DOCUMENT_TYPES[key]);

  const steps = [
    'Simulation de la capacite de remboursement',
    'Signature de la promesse de vente',
    'Montage et dépôt du dossier',
    'Expertise immobiliere par la banque',
    'Accord de principe et assurances',
    'Signature des contrats et hypotheque',
    'Deblocage des fonds',
  ];

  return (
    <div className="bh-page-bg min-vh-100 py-5">
      <style>{`
        .bh-page-bg {
          background:
            radial-gradient(1200px 500px at -10% -10%, rgba(15, 42, 79, 0.18), transparent 65%),
            radial-gradient(1000px 500px at 110% -10%, rgba(36, 83, 135, 0.14), transparent 60%),
            #eef2f7;
        }

        .bh-hero {
          background: linear-gradient(145deg, #0f2a4f, #173d6b);
          color: #fff;
          border-radius: 1rem;
          box-shadow: 0 20px 40px rgba(15, 42, 79, 0.25);
        }

        .bh-section-card {
          border: 1px solid #dbe3ee;
          border-radius: 1rem;
          box-shadow: 0 10px 24px rgba(17, 34, 68, 0.07);
        }

        .bh-step-card {
          border: 1px solid #dbe3ee;
          border-radius: 0.8rem;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          background: #fff;
        }

        .bh-step-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 18px rgba(23, 61, 107, 0.12);
        }

        .bh-step-index {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #0f2a4f;
          color: #fff;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .bh-docs details {
          border: 1px solid #dbe3ee;
          border-radius: 0.75rem;
          background: #fff;
          padding: 0.75rem 1rem;
        }

        .bh-docs details + details {
          margin-top: 0.85rem;
        }

        .bh-docs summary {
          cursor: pointer;
          font-weight: 700;
          color: #173d6b;
        }

        .bh-doc-upload-panel {
          border: 1px solid #d7e3f2;
          border-radius: 1rem;
          background: #f7fafe;
          padding: 1rem;
        }

        .bh-doc-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        .bh-upload-group {
          border: 1px solid #d7e3f2;
          border-radius: 0.85rem;
          background: #fff;
          padding: 1rem;
          min-height: 190px;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
        }

        .bh-upload-group:hover {
          border-color: #9eb9db;
          box-shadow: 0 12px 28px rgba(15, 42, 79, 0.08);
          transform: translateY(-1px);
        }

        .bh-upload-group.is-uploaded {
          border-color: #86c59b;
          background: #fbfffc;
        }

        .bh-upload-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.85rem;
        }

        .bh-upload-title {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          min-width: 0;
        }

        .bh-document-icon {
          width: 40px;
          height: 40px;
          border-radius: 0.75rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #0f2a4f;
          background: #eef5ff;
          flex: 0 0 auto;
        }

        .bh-upload-title h4 {
          margin: 0;
          color: #0f2a4f;
          font-size: 1rem;
          font-weight: 800;
        }

        .bh-upload-title p {
          margin: 0.25rem 0 0;
          color: #5a6d84;
          line-height: 1.45;
          font-size: 0.9rem;
        }

        .bh-required-badge {
          border-radius: 999px;
          background: #fff1f3;
          color: #a51224;
          padding: 0.25rem 0.55rem;
          font-size: 0.72rem;
          font-weight: 800;
          white-space: nowrap;
        }

        .bh-file-control {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: center;
          border: 1px solid #d7e3f2;
          border-radius: 0.75rem;
          overflow: hidden;
          background: #f9fbfe;
        }

        .bh-file-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          min-height: 46px;
          padding: 0 0.95rem;
          color: #fff;
          background: #0f2a4f;
          font-weight: 800;
          cursor: pointer;
          border-right: 1px solid #d7e3f2;
          margin: 0;
          white-space: nowrap;
        }

        .bh-file-action:hover {
          background: #153967;
        }

        .bh-file-input {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .bh-file-name {
          min-width: 0;
          padding: 0 0.9rem;
          color: #324b66;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .bh-upload-status {
          display: inline-flex;
          align-items: flex-start;
          gap: 0.45rem;
          color: #a86c00;
          font-size: 0.88rem;
          line-height: 1.45;
        }

        .bh-upload-status.is-uploaded {
          color: #267344;
        }

        .bh-download-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          border: 1px solid #bcd0e8;
          border-radius: 0.65rem;
          color: #0f2a4f;
          background: #fff;
          min-height: 36px;
          padding: 0 0.75rem;
          font-weight: 800;
          text-decoration: none;
          white-space: nowrap;
        }

        .bh-download-link:hover {
          border-color: #0f2a4f;
          background: #f4f8fd;
          color: #0f2a4f;
        }

        .bh-form-section {
          border: 1px solid #dbe3ee;
          border-radius: 0.9rem;
          padding: 1rem;
          background: #fbfdff;
        }

        .bh-form-section + .bh-form-section {
          margin-top: 1rem;
        }

        .bh-section-title {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          color: #0f2a4f;
          font-weight: 800;
          margin-bottom: 0.85rem;
        }

        .bh-section-title span {
          width: 30px;
          height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: #fff;
          background: #c5162e;
          font-size: 0.9rem;
        }

        .bh-scoring-panel {
          border-color: #bfd4ea;
          background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
        }

        .bh-form-note {
          border-left: 4px solid #c5162e;
          background: #fff7f8;
          color: #5d2730;
          border-radius: 0.7rem;
          padding: 0.75rem 0.9rem;
          font-size: 0.9rem;
        }

        .bh-progress-strip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.6rem;
          margin-bottom: 1rem;
        }

        .bh-progress-strip span {
          border: 1px solid #dbe3ee;
          border-radius: 0.75rem;
          padding: 0.65rem 0.75rem;
          color: #324b66;
          background: #f8fbff;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .bh-upload-label {
          margin-bottom: 0.45rem;
          font-weight: 600;
          color: #223652;
        }

        .bh-submit-launch {
          background: #fff;
          border: 1px solid #dbe3ee;
          border-radius: 1rem;
          box-shadow: 0 10px 24px rgba(17, 34, 68, 0.07);
        }

        .bh-summary-card {
          border: 1px solid #dbe3ee;
          border-radius: 1rem;
          background: #ffffff;
          padding: 1.2rem;
          box-shadow: 0 10px 24px rgba(17, 34, 68, 0.07);
        }

        .bh-summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 0.9rem;
        }

        .bh-summary-grid span {
          display: grid;
          gap: 0.25rem;
          border-radius: 0.85rem;
          background: #f6f9fd;
          padding: 0.9rem 1rem;
        }

        .bh-summary-grid strong {
          color: #0f2a4f;
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .bh-summary-grid small {
          color: #425a76;
          font-size: 0.98rem;
        }

        .bh-submit-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(8, 22, 38, 0.34);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3000;
          padding: 12px;
        }

        .bh-submit-modal {
          width: min(920px, 100%);
          max-height: calc(100vh - 24px);
          overflow-y: auto;
          border: 1px solid #cfdae8;
          border-radius: 1rem;
          box-shadow: 0 30px 64px rgba(8, 22, 38, 0.35);
          animation: bhModalIn 0.2s ease-out;
        }

        .bh-submit-modal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .bh-submit-modal-head .btn-close {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 1px solid #a8bdd2;
          background-size: 10px;
          opacity: 1;
        }

        .bh-submit-modal-head .btn-close:hover {
          background-color: #fff1f1;
          border-color: #e08f8f;
        }

        @keyframes bhModalIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (max-width: 720px) {
          .bh-progress-strip,
          .bh-doc-grid {
            grid-template-columns: 1fr;
          }

          .bh-file-control {
            grid-template-columns: 1fr;
          }

          .bh-file-action {
            border-right: 0;
            border-bottom: 1px solid #d7e3f2;
          }
        }
      `}</style>

      <div className="container">
        <header className="bh-hero p-4 p-md-5 mb-4">
          <h1 className="display-6 fw-bold mb-2">Demande de crédit immobilier BH Bank</h1>
          <p className="lead mb-0">Préparez votre dossier et déposez votre demande en quelques clics.</p>
        </header>

        {!!propertyContext.requestedAmount && (
          <section className="bh-summary-card mb-4">
            <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
              <div>
                <h2 className="h4 fw-bold text-primary-emphasis mb-1">Résumé du projet à financer</h2>
                <p className="text-secondary mb-0">
                  Les données issues de la simulation sont reprises pour aider l’agent bancaire à analyser votre dossier.
                </p>
              </div>
              <button type="button" className="btn btn-primary" onClick={openSubmissionModal}>
                Déposer ce dossier
              </button>
            </div>

            <div className="bh-summary-grid">
              <span>
                <strong>Bien</strong>
                <small>{propertyContext.propertyTitle || 'Projet libre'}</small>
              </span>
              <span>
                <strong>Montant demande</strong>
                <small>{formatCurrency(propertyContext.requestedAmount)}</small>
              </span>
              <span>
                <strong>Apport</strong>
                <small>{formatCurrency(propertyContext.contribution)}</small>
              </span>
              <span>
                <strong>Mensualité estimée</strong>
                <small>{formatCurrency(propertyContext.monthlyPayment)}</small>
              </span>
              <span>
                <strong>Autres engagements</strong>
                <small>{formatCurrency(propertyContext.otherMonthlyCharges)}</small>
              </span>
              <span>
                <strong>Taux d endettement</strong>
                <small>{propertyContext.debtRatio ? `${propertyContext.debtRatio.toFixed(1)}%` : 'Non renseigné'}</small>
              </span>
              <span>
                <strong>Durée</strong>
                <small>{propertyContext.duration ? `${propertyContext.duration} mois` : 'Non renseignée'}</small>
              </span>
            </div>
          </section>
        )}

        <section className="bh-section-card bg-white p-4 mb-4">
          <h2 className="h4 fw-bold text-primary-emphasis mb-3">Les 7 etapes de votre parcours de financement</h2>
          <div className="row g-3">
            {steps.map((step, index) => (
              <div className="col-12 col-md-6 col-xl-4" key={step}>
                <div className="bh-step-card h-100 p-3 d-flex gap-3 align-items-start">
                  <span className="bh-step-index">{index + 1}</span>
                  <p className="mb-0 fw-semibold text-secondary-emphasis">{step}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bh-section-card bg-white p-4 mb-4 bh-docs">
          <h2 className="h4 fw-bold text-primary-emphasis mb-3">Les documents nécessaires</h2>

          <details open>
            <summary>Administratifs</summary>
            <ul className="mt-2 mb-0">
              <li>CIN</li>
              <li>Extrait de naissance</li>
              <li>Justificatif d'adresse</li>
            </ul>
          </details>

          <details>
            <summary>Financiers</summary>
            <ul className="mt-2 mb-0">
              <li>Attestation de travail</li>
              <li>Fiches de paie (3 a 6 mois)</li>
              <li>Releves bancaires (6 mois)</li>
              <li>Déclaration d'impôts ou patente</li>
            </ul>
          </details>

          <details>
            <summary>Immobiliers</summary>
            <ul className="mt-2 mb-0">
              <li>Promesse de vente légalisée</li>
              <li>Certificat de propriété</li>
              <li>Plan architectural</li>
              <li>Quittance de taxe fonciere</li>
            </ul>
          </details>
        </section>

        <section className="alert alert-primary border-0 shadow-sm mb-4" role="alert">
          <h2 className="h5 fw-bold mb-2">Instructions pour le dépôt en ligne</h2>
          <p className="mb-0">
            Numérisez vos documents clairement, privilégiez les formats PDF ou JPG, et nommez les fichiers de façon explicite.
          </p>
        </section>

        <section className="bh-submit-launch p-4 p-md-5">
          <h2 className="h4 fw-bold text-primary-emphasis mb-2">Soumission de votre dossier</h2>
          <p className="text-secondary mb-3">
            Ouvrez le mini portail pour transmettre vos informations et documents. Les demandes déposées apparaissent ensuite
            dans le tableau de bord de l’agent bancaire.
          </p>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <button type="button" className="btn btn-primary btn-lg" onClick={openSubmissionModal}>
              Accéder au formulaire
            </button>
            {!authSession?.token && (
              <button
                type="button"
                className="btn btn-outline-primary btn-lg"
                onClick={() =>
                  navigate('/login', {
                    state: { from: `/credit-immobilier-bh${location.search}` },
                  })
                }
              >
                Se connecter avant le dépôt
              </button>
            )}
          </div>
          {errorMessage && <div className="alert alert-danger mt-3 mb-0">{errorMessage}</div>}
          {successMessage && <div className="alert alert-success mt-3 mb-0">{successMessage}</div>}
        </section>

        {isSubmissionOpen && (
          <div className="bh-submit-backdrop" role="dialog" aria-modal="true" onClick={closeSubmissionModal}>
            <section className="bh-submit-modal bg-white p-4 p-md-5" onClick={(event) => event.stopPropagation()}>
              <div className="bh-submit-modal-head mb-3">
                <div>
                  <h2 className="h4 fw-bold text-primary-emphasis mb-0">Formulaire de soumission</h2>
                  <p className="text-secondary mb-0">
                    Complétez les informations ci-dessous pour envoyer votre dossier à un agent bancaire.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Fermer"
                  onClick={closeSubmissionModal}
                  disabled={submitting}
                />
              </div>

              {propertyContext.requestedAmount > 0 && (
                <div className="bh-summary-card mb-4">
                  <div className="bh-summary-grid">
                    <span>
                      <strong>Montant demande</strong>
                      <small>{formatCurrency(propertyContext.requestedAmount)}</small>
                    </span>
                    <span>
                      <strong>Taux estimé</strong>
                      <small>{propertyContext.rate ? `${propertyContext.rate.toFixed(2)}%` : 'Non renseigné'}</small>
                    </span>
                    <span>
                      <strong>Dette</strong>
                      <small>{propertyContext.debtRatio ? `${propertyContext.debtRatio.toFixed(1)}%` : 'Non renseignée'}</small>
                    </span>
                    <span>
                      <strong>Projet</strong>
                      <small>{propertyContext.propertyTitle || 'Projet libre'}</small>
                    </span>
                  </div>
                </div>
              )}

              <form key={formResetKey} onSubmit={handleSubmit} noValidate>
                <div className="bh-progress-strip">
                  <span>1. Identité client</span>
                  <span>2. Variables de scoring</span>
                  <span>3. Pieces justificatives</span>
                </div>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label htmlFor="fullName" className="form-label fw-semibold">Nom complet</label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      className="form-control"
                      required
                      value={formData.fullName}
                      onChange={handleInputChange}
                      disabled={submitting}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label htmlFor="email" className="form-label fw-semibold">Adresse e-mail</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className="form-control"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={submitting}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label htmlFor="phone" className="form-label fw-semibold">Numéro de téléphone</label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      className="form-control"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={submitting}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label htmlFor="cin" className="form-label fw-semibold">Numero de CIN</label>
                    <input
                      id="cin"
                      name="cin"
                      type="text"
                      className="form-control"
                      required
                      value={formData.cin}
                      onChange={handleInputChange}
                      disabled={submitting}
                    />
                  </div>

                  <div className="col-12">
                    <div className="bh-form-section bh-scoring-panel">
                      <div className="bh-section-title">
                        <span>2</span>
                        <strong>Variables necessaires au scoring bancaire</strong>
                      </div>

                      <div className="row g-3">
                        <div className="col-12 col-md-6">
                          <label htmlFor="scoringAnnualIncome" className="form-label fw-semibold">
                            Revenu annuel a retenir (DT)
                          </label>
                          <input
                            id="scoringAnnualIncome"
                            name="scoringAnnualIncome"
                            type="number"
                            min="0"
                            className="form-control"
                            value={formData.scoringAnnualIncome}
                            onChange={handleInputChange}
                            disabled={submitting}
                          />
                        </div>

                        <div className="col-12 col-md-6">
                          <label htmlFor="scoringAnnualCharges" className="form-label fw-semibold">
                            Charges annuelles de remboursement (DT)
                          </label>
                          <input
                            id="scoringAnnualCharges"
                            name="scoringAnnualCharges"
                            type="number"
                            min="0"
                            className="form-control"
                            value={formData.scoringAnnualCharges}
                            onChange={handleInputChange}
                            disabled={submitting}
                          />
                        </div>

                        <div className="col-12 col-md-4">
                          <label htmlFor="otherMonthlyCharges" className="form-label fw-semibold">
                            Autres mensualites en cours (DT)
                          </label>
                          <input
                            id="otherMonthlyCharges"
                            name="otherMonthlyCharges"
                            type="number"
                            min="0"
                            className="form-control"
                            value={formData.otherMonthlyCharges}
                            onChange={handleInputChange}
                            disabled={submitting}
                          />
                        </div>

                        <div className="col-12 col-md-4">
                          <label htmlFor="familySituation" className="form-label fw-semibold">
                            Situation familiale
                          </label>
                          <select
                            id="familySituation"
                            name="familySituation"
                            className="form-select"
                            value={formData.familySituation}
                            onChange={handleInputChange}
                            disabled={submitting}
                          >
                            <option value="">A completer depuis le dossier si absent</option>
                            <option value="celibataire">Celibataire</option>
                            <option value="marie sans enfant">Marie sans enfant</option>
                            <option value="marie avec enfant">Marie avec enfant</option>
                            <option value="divorce">Divorce</option>
                            <option value="veuf">Veuf</option>
                          </select>
                        </div>

                        <div className="col-12 col-md-4">
                          <label htmlFor="contractType" className="form-label fw-semibold">
                            Situation contractuelle
                          </label>
                          <select
                            id="contractType"
                            name="contractType"
                            className="form-select"
                            value={formData.contractType}
                            onChange={handleInputChange}
                            disabled={submitting}
                          >
                            <option value="">A completer depuis le dossier si absent</option>
                            <option value="fonctionnaire">Fonctionnaire</option>
                            <option value="CDI">CDI</option>
                            <option value="CDD">CDD</option>
                            <option value="profession liberale">Profession liberale</option>
                            <option value="independant">Independant</option>
                            <option value="retraite">Retraite</option>
                            <option value="stage">Stage</option>
                            <option value="sans contrat">Sans contrat</option>
                          </select>
                        </div>

                        <div className="col-12">
                          <div className="bh-form-note">
                            Si une valeur reste vide, l’agent de scoring utilisera les données de simulation, les engagements déclarés et les pièces jointes disponibles.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <label htmlFor="rib" className="form-label fw-semibold">RIB bancaire</label>
                    <input
                      id="rib"
                      name="rib"
                      type="text"
                      className="form-control"
                      required
                      placeholder="Ex: 04 123 000 12345678901 23"
                      value={formData.rib}
                      onChange={handleInputChange}
                      disabled={submitting}
                    />
                    <div className="small text-secondary mt-1">Veuillez renseigner le compte à débiter.</div>
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold">Documents requis * (tous les documents doivent être fournis)</label>
                    <div className="bh-doc-upload-panel">
                      <div className="bh-doc-grid">
                        {requiredDocumentsList.map((doc) => {
                          const uploadedFileName = uploadedDocuments[doc.key];

                          return (
                          <article
                            className={`bh-upload-group ${uploadedFileName ? 'is-uploaded' : ''}`}
                            key={doc.key}
                          >
                              <div className="bh-upload-card-head">
                                <div className="bh-upload-title">
                                  <span className="bh-document-icon" aria-hidden="true">
                                    <FaFileAlt />
                                  </span>
                                  <div>
                                    <h4>{doc.label}</h4>
                                    <p>{doc.description}</p>
                                  </div>
                                </div>
                                {doc.downloadUrl && (
                                  <a href={doc.downloadUrl} download className="bh-download-link" title="Telecharger le formulaire">
                                    <FaDownload aria-hidden="true" />
                                    Modele
                                  </a>
                                )}
                              </div>
                              <div className="bh-file-control">
                                <label htmlFor={doc.fileInputId} className="bh-file-action">
                                  <FaCloudUploadAlt aria-hidden="true" />
                                  Parcourir
                                </label>
                                <span className="bh-file-name">
                                  {uploadedFileName || 'Aucun fichier selectionne'}
                                </span>
                              </div>
                              <input
                                id={doc.fileInputId}
                                name={doc.fileInputId}
                                type="file"
                                className="bh-file-input"
                                accept=".pdf,.jpg,.png,.jpeg"
                                onChange={(event) => handleDocumentChange(doc.key, event)}
                                disabled={submitting}
                              />
                              <div className={`bh-upload-status ${uploadedFileName ? 'is-uploaded' : ''}`}>
                                {uploadedFileName ? (
                                  <>
                                    <FaCheckCircle aria-hidden="true" />
                                    <span>Fichier ajoute</span>
                                  </>
                                ) : (
                                  <>
                                    <FaExclamationTriangle aria-hidden="true" />
                                    <span>En attente - PDF, JPG, PNG ou JPEG</span>
                                  </>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                    {getMissingRequiredDocuments().length > 0 && (
                      <div className="alert alert-warning mt-3 mb-0" role="alert">
                        <strong>Documents manquants:</strong> {getMissingRequiredDocuments().map(key => DOCUMENT_TYPES[key]?.label).join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {errorMessage && <div className="alert alert-danger mt-4 mb-0">{errorMessage}</div>}
                {successMessage && <div className="alert alert-success mt-4 mb-0">{successMessage}</div>}

                <div className="mt-4 d-flex flex-wrap gap-2 align-items-center">
                  <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                    {submitting ? 'Envoi...' : 'Déposer ma demande'}
                  </button>
                  <button type="button" className="btn btn-outline-secondary btn-lg" onClick={closeSubmissionModal} disabled={submitting}>
                    Fermer
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
