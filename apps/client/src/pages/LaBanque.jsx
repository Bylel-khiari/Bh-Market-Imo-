import React from 'react';

export default function LaBanque() {
  const keyFigures = [
    { value: '150+', label: 'Agences' },
    { value: '545+', label: 'Conseillers dedies' },
    { value: '24/7', label: 'Services en ligne' },
    { value: '85%+', label: 'Parcours digitalises' },
  ];

  const commitments = [
    'Engagement client et proximite',
    "Esprit d'equipe et accompagnement",
    'Excellence operationnelle',
    'Innovation et transformation digitale',
  ];

  const projectPillars = [
    {
      title: 'Marketplace immobiliere',
      text: 'Centraliser les annonces, simplifier la recherche et proposer des filtres utiles selon le type de bien et la localisation.',
    },
    {
      title: 'Simulation et orientation credit',
      text: 'Aider les clients a estimer leur capacite de financement et les orienter vers un parcours de demande plus clair.',
    },
    {
      title: 'Soumission digitale du dossier',
      text: 'Permettre la transmission structuree des pieces justificatives pour accelerer le traitement des demandes.',
    },
  ];

  return (
    <div className="bh-bank-page min-vh-100 py-5">
      <style>{`
        .bh-bank-page {
          background:
            radial-gradient(1100px 500px at -10% -10%, rgba(15, 42, 79, 0.16), transparent 65%),
            radial-gradient(900px 450px at 110% -10%, rgba(36, 83, 135, 0.12), transparent 60%),
            #eef2f7;
        }

        .bh-bank-hero {
          background: linear-gradient(145deg, #0f2a4f, #173d6b);
          color: #fff;
          border-radius: 1rem;
          box-shadow: 0 20px 40px rgba(15, 42, 79, 0.24);
        }

        .bh-bank-card {
          border: 1px solid #dbe3ee;
          border-radius: 1rem;
          box-shadow: 0 10px 24px rgba(17, 34, 68, 0.07);
          background: #fff;
        }

        .bh-kpi-card {
          border: 1px solid #dbe3ee;
          border-radius: 0.85rem;
          background: linear-gradient(180deg, #ffffff 0%, #f9fbfe 100%);
          text-align: center;
          padding: 1rem 0.75rem;
          height: 100%;
        }

        .bh-kpi-value {
          color: #0f2a4f;
          font-size: 1.5rem;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 0.35rem;
        }

        .bh-kpi-label {
          color: #4b6078;
          font-size: 0.92rem;
          font-weight: 600;
          margin: 0;
        }

        .bh-list {
          margin: 0;
          padding-left: 1.1rem;
          color: #27415f;
        }

        .bh-list li + li {
          margin-top: 0.45rem;
        }

        .bh-project-card {
          border: 1px solid #dbe3ee;
          border-radius: 0.85rem;
          padding: 1rem;
          background: #ffffff;
          height: 100%;
        }

        .bh-project-title {
          margin: 0 0 0.45rem;
          color: #153960;
          font-size: 1.03rem;
          font-weight: 700;
        }

        .bh-project-text {
          margin: 0;
          color: #3b5370;
          line-height: 1.55;
        }

        .bh-source {
          font-size: 0.86rem;
          color: #607791;
        }
      `}</style>

      <div className="container">
        <header className="bh-bank-hero p-4 p-md-5 mb-4">
          <h1 className="display-6 fw-bold mb-2">BH Bank - Informations generales</h1>
          <p className="lead mb-0">
            BH Bank se positionne comme un partenaire financier de proximite, avec un reseau national,
            des canaux digitaux et une expertise historique sur le financement immobilier.
          </p>
        </header>

        <section className="bh-bank-card p-4 mb-4">
          <h2 className="h4 fw-bold text-primary-emphasis mb-3">Profil institutionnel</h2>
          <p className="text-secondary mb-3">
            D apres la page officielle Univers BH Bank, la banque met en avant une promesse client
            orientee accompagnement, innovation et qualite de service, avec une logique multicanale
            agence + digital pour fluidifier les parcours.
          </p>
          <div className="row g-3">
            {keyFigures.map((item) => (
              <div className="col-6 col-md-3" key={item.label}>
                <div className="bh-kpi-card">
                  <div className="bh-kpi-value">{item.value}</div>
                  <p className="bh-kpi-label">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bh-bank-card p-4 mb-4">
          <h2 className="h4 fw-bold text-primary-emphasis mb-3">Axes et engagements</h2>
          <ul className="bh-list">
            {commitments.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="bh-bank-card p-4 mb-3">
          <h2 className="h4 fw-bold text-primary-emphasis mb-3">Notre projet BH Market Imo</h2>
          <p className="text-secondary mb-3">
            Ce projet digital complete la relation client BH Bank en proposant un parcours immobilier
            unifie, de la recherche du bien jusqu a la preparation du dossier de credit.
          </p>
          <div className="row g-3">
            {projectPillars.map((pillar) => (
              <div className="col-12 col-md-4" key={pillar.title}>
                <article className="bh-project-card">
                  <h3 className="bh-project-title">{pillar.title}</h3>
                  <p className="bh-project-text">{pillar.text}</p>
                </article>
              </div>
            ))}
          </div>
        </section>

        <p className="bh-source mb-0">
          Source d information generale: page publique Univers BH Bank (https://www.bhbank.tn/univers/bh-bank).
        </p>
      </div>
    </div>
  );
}
