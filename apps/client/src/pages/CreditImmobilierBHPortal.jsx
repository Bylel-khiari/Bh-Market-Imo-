import React, { useEffect, useState } from 'react';

export default function CreditImmobilierBHPortal() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    cin: '',
    rib: '',
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [formResetKey, setFormResetKey] = useState(0);
  const [isSubmissionOpen, setIsSubmissionOpen] = useState(false);

  useEffect(() => {
    // Inject Bootstrap CSS only while this page is mounted.
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

  const handleSubmit = (event) => {
    event.preventDefault();

    setSuccessMessage('Vos documents ont été exportés et votre demande est envoyée avec succès !');

    setFormData({
      fullName: '',
      email: '',
      phone: '',
      cin: '',
      rib: '',
    });

    setUploadedFiles({});
    setFormResetKey((prev) => prev + 1);
  };

  const openSubmissionModal = () => {
    setSuccessMessage('');
    setIsSubmissionOpen(true);
  };

  const closeSubmissionModal = () => {
    setIsSubmissionOpen(false);
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
        { id: 'doc-payroll', label: 'Fiches de paie (3 à 6 mois)' },
        { id: 'doc-bank', label: 'Relevés bancaires (6 mois)' },
        { id: 'doc-rib', label: 'RIB bancaire (document)' },
        { id: 'doc-tax', label: "Déclaration d'impôts / Patente" },
      ],
    },
    {
      title: 'Immobiliers',
      documents: [
        { id: 'doc-promise', label: 'Promesse de vente légalisée' },
        { id: 'doc-title', label: 'Certificat de propriété (Titre bleu)' },
        { id: 'doc-plan', label: 'Plan architectural' },
        { id: 'doc-tax-property', label: 'Quittance de taxe foncière' },
      ],
    },
  ];

  const steps = [
    'Simulation de la capacité de remboursement',
    'Signature de la promesse de vente',
    'Montage et dépôt du dossier',
    'Expertise immobilière par la banque',
    'Accord de principe et assurances',
    'Signature des contrats et hypothèque',
    'Déblocage des fonds',
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

        .bh-dropzone:hover {
          border-color: #0f2a4f;
          background: #f1f7ff;
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
          <h1 className="display-6 fw-bold mb-2">Demande de Crédit Immobilier BH Bank - Guide & Soumission en ligne</h1>
          <p className="lead mb-0">Préparez votre dossier et déposez votre demande en quelques clics.</p>
        </header>

        <section className="bh-section-card bg-white p-4 mb-4">
          <h2 className="h4 fw-bold text-primary-emphasis mb-3">Les 7 étapes de votre parcours de financement</h2>
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
              <li>Fiches de paie (3 à 6 mois)</li>
              <li>Relevés bancaires (6 mois)</li>
              <li>Déclaration d'impôts (ou Patente pour les indépendants)</li>
            </ul>
          </details>

          <details>
            <summary>Immobiliers</summary>
            <ul className="mt-2 mb-0">
              <li>Promesse de vente légalisée</li>
              <li>Certificat de propriété (Titre bleu)</li>
              <li>Plan architectural</li>
              <li>Quittance de taxe foncière</li>
            </ul>
          </details>
        </section>

        <section className="alert alert-primary border-0 shadow-sm mb-4" role="alert">
          <h2 className="h5 fw-bold mb-2">Instructions pour le dépôt en ligne</h2>
          <p className="mb-0">
            Comment bien préparer vos fichiers : Numérisez vos documents clairement, regroupez-les idéalement au
            format PDF ou JPG de haute qualité, et assurez-vous que tous les noms de fichiers sont clairs
            (ex: CIN_Nom.pdf).
          </p>
        </section>

        <section className="bh-submit-launch p-4 p-md-5">
          <h2 className="h4 fw-bold text-primary-emphasis mb-2">Soumission de votre dossier</h2>
          <p className="text-secondary mb-3">Ouvrez le mini portail pour transmettre vos informations et documents en toute sécurité.</p>
          <button type="button" className="btn btn-primary btn-lg" onClick={openSubmissionModal}>
            Accéder au formulaire
          </button>
        </section>

        {isSubmissionOpen && (
          <div className="bh-submit-backdrop" role="dialog" aria-modal="true" onClick={closeSubmissionModal}>
            <section className="bh-submit-modal bg-white p-4 p-md-5" onClick={(event) => event.stopPropagation()}>
              <div className="bh-submit-modal-head mb-3">
                <h2 className="h4 fw-bold text-primary-emphasis mb-0">Formulaire de soumission</h2>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Fermer"
                  onClick={closeSubmissionModal}
                />
              </div>

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
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label htmlFor="email" className="form-label fw-semibold">Adresse Email</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className="form-control"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
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
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label htmlFor="cin" className="form-label fw-semibold">Numéro de CIN</label>
                    <input
                      id="cin"
                      name="cin"
                      type="text"
                      className="form-control"
                      required
                      value={formData.cin}
                      onChange={handleInputChange}
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
                    />
                    <div className="small text-secondary mt-1">Veuillez renseigner le RIB du compte à débiter.</div>
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold">Uploadez vos documents prêts ici (document par document)</label>
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
                                        {doc.label} <span className="text-danger">*</span>
                                      </label>
                                      <input
                                        id={doc.id}
                                        name={doc.id}
                                        type="file"
                                        className="form-control"
                                        required
                                        accept=".pdf, .jpg, .png, .jpeg"
                                        onChange={(event) => handleDocumentChange(doc.id, event)}
                                      />
                                      <div className="small mt-1">
                                        {uploadedFiles[doc.id]
                                          ? <span className="text-success">Fichier ajouté: {uploadedFiles[doc.id]}</span>
                                          : <span className="text-secondary">Formats acceptés : PDF, JPG, PNG, JPEG</span>}
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

                <div className="mt-4 d-flex flex-wrap gap-2 align-items-center">
                  <button type="submit" className="btn btn-primary btn-lg">Déposer ma demande</button>
                  {successMessage && <span className="badge text-bg-success p-2">{successMessage}</span>}
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
