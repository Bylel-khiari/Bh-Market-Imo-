import React from 'react';
import {
  FaEnvelope,
  FaLaptop,
  FaMapMarkerAlt,
  FaMobileAlt,
  FaPhoneAlt,
  FaShieldAlt,
  FaUniversity,
  FaUsers,
} from 'react-icons/fa';
import '../styles/LaBanque.css';

const factSheet = [
  {
    label: 'Statut',
    value: 'Banque universelle',
    detail: 'BH Bank propose des services bancaires pour les particuliers, les professionnels et les entreprises.',
  },
  {
    label: 'Spécialité',
    value: 'Expertise habitat',
    detail: 'La banque est particulièrement connue pour son ancrage historique dans le financement immobilier.',
  },
  {
    label: 'Présence',
    value: 'Réseau national',
    detail: 'Elle combine une présence en agence avec des services accessibles à distance.',
  },
  {
    label: 'Positionnement',
    value: 'Banque de proximité',
    detail: 'Son approche met l’accent sur l’accompagnement, les services utiles et la relation client.',
  },
];

const overviewCards = [
  {
    title: 'Présentation',
    text: 'BH Bank est une banque tunisienne qui accompagne les besoins bancaires du quotidien ainsi que les projets de financement.',
    Icon: FaUniversity,
  },
  {
    title: 'Services essentiels',
    text: 'La banque propose notamment des comptes, des cartes, des solutions d’épargne, des crédits et des services digitaux.',
    Icon: FaShieldAlt,
  },
  {
    title: 'Clientèles',
    text: 'Les offres s’adressent à plusieurs profils, dont les particuliers, les professionnels, les entreprises et les Tunisiens résidant à l’étranger.',
    Icon: FaUsers,
  },
];

const digitalChannels = [
  {
    title: 'BH Net',
    text: 'Un espace en ligne pour consulter les comptes et suivre les opérations courantes.',
    items: ['Consultation des comptes', 'Suivi des opérations', 'Accès à distance'],
    Icon: FaLaptop,
  },
  {
    title: 'BH MPAY',
    text: 'Une solution mobile qui facilite certains paiements et usages bancaires du quotidien.',
    items: ['Usage mobile', 'Paiement', 'Services pratiques'],
    Icon: FaMobileAlt,
  },
];

const contactRows = [
  { label: 'Téléphone', value: '(+216) 71 126 000', Icon: FaPhoneAlt },
  { label: 'E-mail', value: 'Contact@bhbank.tn', Icon: FaEnvelope },
  { label: 'Siège', value: '18 Avenue Mohamed V, Tunis 1023', Icon: FaMapMarkerAlt },
];

export default function LaBanque() {
  return (
    <div className="bank-info-page">
      <section className="bank-info-hero-section">
        <div className="container bank-info-shell">
          <div className="bank-info-hero-grid">
            <div className="bank-info-main">
              <span className="bank-info-kicker">BH Bank Tunisie</span>
              <h1>La banque</h1>
              <p className="bank-info-lead">
                BH Bank est une banque tunisienne de proximité, reconnue pour son expertise dans
                l’habitat et pour une offre qui couvre les services bancaires essentiels.
              </p>

              <div className="bank-info-summary">
                <span>Banque universelle</span>
                <span>Expertise habitat</span>
                <span>Accès en ligne</span>
              </div>
            </div>

            <div className="bank-info-facts-grid">
              {factSheet.map(({ label, value, detail }) => (
                <article className="bank-info-fact-card" key={label}>
                  <span className="bank-info-panel-label">{label}</span>
                  <strong>{value}</strong>
                  <p>{detail}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="container bank-info-content-shell">
        <div className="bank-info-body-grid">
          <div className="bank-info-content">
            <section className="bank-info-panel">
              <div className="bank-info-section-head">
                <span className="bank-info-section-tag">Vue d’ensemble</span>
                <h2>BH Bank en bref</h2>
                <p>
                  Une présentation courte de la banque, de ses services principaux et de sa place
                  dans le financement de l’habitat.
                </p>
              </div>

              <div className="bank-info-overview-grid">
                {overviewCards.map(({ title, text, Icon }) => (
                  <article className="bank-info-overview-card" key={title}>
                    <div className="bank-info-card-icon">
                      <Icon />
                    </div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="bank-info-panel">
              <div className="bank-info-section-head">
                <span className="bank-info-section-tag">Canaux digitaux</span>
                <h2>Services à distance</h2>
                <p>
                  BH Bank met aussi en avant des solutions digitales pour consulter les comptes et
                  réaliser certaines opérations courantes.
                </p>
              </div>

              <div className="bank-info-digital-grid">
                {digitalChannels.map(({ title, text, items, Icon }) => (
                  <article className="bank-info-digital-card" key={title}>
                    <div className="bank-info-card-icon">
                      <Icon />
                    </div>
                    <h3>{title}</h3>
                    <p>{text}</p>

                    <ul className="bank-info-digital-list">
                      {items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="bank-info-sidebar">
            <div className="bank-info-contact-card">
              <span className="bank-info-card-label">Coordonnées</span>
              <h3>Informations générales de contact</h3>

              <div className="bank-info-contact-list">
                {contactRows.map(({ label, value, Icon }) => (
                  <div className="bank-info-contact-row" key={label}>
                    <div className="bank-info-contact-icon">
                      <Icon />
                    </div>
                    <div>
                      <strong>{label}</strong>
                      <span>{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
}
