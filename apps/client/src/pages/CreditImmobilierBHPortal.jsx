import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAuthSession, submitCreditApplicationApi } from '../lib/auth';

function formatCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Non renseigne';
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
  };
}

export default function CreditImmobilierBHPortal() {
  const location = useLocation();
  const navigate = useNavigate();
  const [authSession, setAuthSession] = useState(() => getAuthSession());
  const [formData, setFormData] = useState(() => createEmptyFormData(getAuthSession()));
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [formResetKey, setFormResetKey] = useState(0);
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const propertyContext = useMemo(() => {
    const propertyPrice = Number(params.get('price') || 0);
    const requestedAmount = Number(params.get('amount') || 0);
    const monthlyPayment = Number(params.get('monthlyPayment') || 0);
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

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDocumentChange = (docId, event) => {
    const file = event.target.files && event.target.files[0] ? event.target.files[0] : null;
    setUploadedFiles((prev) => ({
      ...prev,
      [docId]: file ? file.name : '',
    }));
  };

  const openSubmissionModal = () => {
    setSuccessMessage('');
    setErrorMessage('');
    setIsSubmissionOpen(true);
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
      navigate('/login', { state: { from: `/credit-immobilier-bh${location.search}` } });
      return;
    }

    if (authSession?.user?.role !== 'client') {
      setErrorMessage('Le depot de dossier est reserve aux comptes client.');
      return;
    }

    const documents = Object.values(uploadedFiles).filter(Boolean);

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
          gross_income: propertyContext.income > 0 ? propertyContext.income : null,
          income_period: propertyContext.incomePeriod || null,
          duration_months: propertyContext.duration > 0 ? propertyContext.duration : null,
          estimated_monthly_payment: propertyContext.monthlyPayment > 0 ? propertyContext.monthlyPayment : null,
          estimated_rate: propertyContext.rate > 0 ? propertyContext.rate : null,
          debt_ratio: propertyContext.debtRatio > 0 ? propertyContext.debtRatio : null,
          documents,
        },
        authSession.token,
      );

      setSuccessMessage('Votre dossier a ete transmis a l equipe bancaire avec succes.');
      setUploadedFiles({});
      setFormData(createEmptyFormData(authSession));
      setFormResetKey((prev) => prev + 1);
    } catch (requestError) {
      setErrorMessage(requestError.message || 'Impossible de deposer votre dossier.');
    } finally {
      setSubmitting(false);
    }
  };

  const documentCategories = [
    {
      title: 'Administratifs',
      documents: [
        { id: 'doc-cin-copy', label: 'CIN (copie recto/verso)' },
        { id: 'doc-birth', label: 'Extrait de naissance' },
        { id: 'doc-address', label: "Justificatif d'adresse" },
      ],
    },
    {
      title: 'Financiers',
      documents: [
        { id: 'doc-work', label: 'Attestation de travail' },
        { id: 'doc-payroll', label: 'Fiches de paie (3 a 6 mois)' },
        { id: 'doc-bank', label: 'Releves bancaires (6 mois)' },
        { id: 'doc-rib', label: 'RIB bancaire (document)' },
        { id: 'doc-tax', label: "Declaration d'impots / Patente" },
      ],
    },
    {
      title: 'Immobiliers',
      documents: [
        { id: 'doc-promise', label: 'Promesse de vente legalisee' },
        { id: 'doc-title', label: 'Certificat de propriete (Titre bleu)' },
        { id: 'doc-plan', label: 'Plan architectural' },
        { id: 'doc-tax-property', label: 'Quittance de taxe fonciere' },
      ],
    },
  ];

  const steps = [
    'Simulation de la capacite de remboursement',
    'Signature de la promesse de vente',
    'Montage et depot du dossier',
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

        .bh-dropzone {
          border: 2px dashed #7f9fbe;
          border-radius: 0.8rem;
          background: #f8fbff;
          padding: 1.25rem;
        }

        .bh-upload-group {
          border: 1px solid #dbe3ee;
          border-radius: 0.85rem;
          background: #fff;
          padding: 0.9rem;
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
      `}</style>

      <div className="container">
        <header className="bh-hero p-4 p-md-5 mb-4">
          <h1 className="display-6 fw-bold mb-2">Demande de credit immobilier BH Bank</h1>
          <p className="lead mb-0">Preparez votre dossier et deposez votre demande en quelques clics.</p>
        </header>

        {!!propertyContext.requestedAmount && (
          <section className="bh-summary-card mb-4">
            <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
              <div>
                <h2 className="h4 fw-bold text-primary-emphasis mb-1">Resume du projet a financer</h2>
                <p className="text-secondary mb-0">
                  Les donnees issues de la simulation sont reprises pour aider l agent bancaire a analyser votre dossier.
                </p>
              </div>
              <button type="button" className="btn btn-primary" onClick={openSubmissionModal}>
                Deposer ce dossier
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
                <strong>Mensualite estimee</strong>
                <small>{formatCurrency(propertyContext.monthlyPayment)}</small>
              </span>
              <span>
                <strong>Taux d endettement</strong>
                <small>{propertyContext.debtRatio ? `${propertyContext.debtRatio.toFixed(1)}%` : 'Non renseigne'}</small>
              </span>
              <span>
                <strong>Duree</strong>
                <small>{propertyContext.duration ? `${propertyContext.duration} mois` : 'Non renseignee'}</small>
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
          <h2 className="h4 fw-bold text-primary-emphasis mb-3">Les documents necessaires</h2>

          <details open>
            <summary>Administratifs</summary>
            <ul className="mt-2 mb-0">
              <li>CIN</li>
              <li>Extrait de naissance</li>
              <li>Justificatif d adresse</li>
            </ul>
          </details>

          <details>
            <summary>Financiers</summary>
            <ul className="mt-2 mb-0">
              <li>Attestation de travail</li>
              <li>Fiches de paie (3 a 6 mois)</li>
              <li>Releves bancaires (6 mois)</li>
              <li>Declaration d impots ou patente</li>
            </ul>
          </details>

          <details>
            <summary>Immobiliers</summary>
            <ul className="mt-2 mb-0">
              <li>Promesse de vente legalisee</li>
              <li>Certificat de propriete</li>
              <li>Plan architectural</li>
              <li>Quittance de taxe fonciere</li>
            </ul>
          </details>
        </section>

        <section className="alert alert-primary border-0 shadow-sm mb-4" role="alert">
          <h2 className="h5 fw-bold mb-2">Instructions pour le depot en ligne</h2>
          <p className="mb-0">
            Numerisez vos documents clairement, privilegiez les formats PDF ou JPG, et nommez les fichiers de facon explicite.
          </p>
        </section>

        <section className="bh-submit-launch p-4 p-md-5">
          <h2 className="h4 fw-bold text-primary-emphasis mb-2">Soumission de votre dossier</h2>
          <p className="text-secondary mb-3">
            Ouvrez le mini portail pour transmettre vos informations et documents. Les demandes deposees apparaissent ensuite
            dans le dashboard de l agent bancaire.
          </p>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <button type="button" className="btn btn-primary btn-lg" onClick={openSubmissionModal}>
              Acceder au formulaire
            </button>
            {!authSession?.token && (
              <button
                type="button"
                className="btn btn-outline-primary btn-lg"
                onClick={() => navigate('/login', { state: { from: `/credit-immobilier-bh${location.search}` } })}
              >
                Se connecter avant le depot
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
                    Completez les informations ci-dessous pour envoyer votre dossier a un agent bancaire.
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
                      <strong>Taux estime</strong>
                      <small>{propertyContext.rate ? `${propertyContext.rate.toFixed(2)}%` : 'Non renseigne'}</small>
                    </span>
                    <span>
                      <strong>Dette</strong>
                      <small>{propertyContext.debtRatio ? `${propertyContext.debtRatio.toFixed(1)}%` : 'Non renseignee'}</small>
                    </span>
                    <span>
                      <strong>Projet</strong>
                      <small>{propertyContext.propertyTitle || 'Projet libre'}</small>
                    </span>
                  </div>
                </div>
              )}

              <form key={formResetKey} onSubmit={handleSubmit} noValidate>
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
                    <label htmlFor="email" className="form-label fw-semibold">Adresse email</label>
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
                    <label htmlFor="phone" className="form-label fw-semibold">Numero de telephone</label>
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
                    <div className="small text-secondary mt-1">Veuillez renseigner le compte a debiter.</div>
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold">Joindre vos documents (un document par champ)</label>
                    <div className="bh-dropzone">
                      <div className="row g-3">
                        {documentCategories.map((category) => (
                          <div className="col-12" key={category.title}>
                            <div className="border rounded-3 p-3 bg-white">
                              <h3 className="h6 fw-bold text-primary-emphasis mb-3">{category.title}</h3>
                              <div className="row g-3">
                                {category.documents.map((doc) => (
                                  <div className="col-12 col-md-6" key={doc.id}>
                                    <div className="bh-upload-group">
                                      <label htmlFor={doc.id} className="bh-upload-label d-block">
                                        {doc.label}
                                      </label>
                                      <input
                                        id={doc.id}
                                        name={doc.id}
                                        type="file"
                                        className="form-control"
                                        accept=".pdf,.jpg,.png,.jpeg"
                                        onChange={(event) => handleDocumentChange(doc.id, event)}
                                        disabled={submitting}
                                      />
                                      <div className="small mt-1">
                                        {uploadedFiles[doc.id]
                                          ? <span className="text-success">Fichier ajoute: {uploadedFiles[doc.id]}</span>
                                          : <span className="text-secondary">Formats acceptes: PDF, JPG, PNG, JPEG</span>}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {errorMessage && <div className="alert alert-danger mt-4 mb-0">{errorMessage}</div>}
                {successMessage && <div className="alert alert-success mt-4 mb-0">{successMessage}</div>}

                <div className="mt-4 d-flex flex-wrap gap-2 align-items-center">
                  <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                    {submitting ? 'Envoi...' : 'Deposer ma demande'}
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
