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
    label: 'Specialite',
    value: 'Expertise habitat',
    detail: 'La banque est particulierement connue pour son ancrage historique dans le financement immobilier.',
  },
  {
    label: 'Presence',
    value: 'Reseau national',
    detail: 'Elle combine une presence en agence avec des services accessibles a distance.',
  },
  {
    label: 'Positionnement',
    value: 'Banque de proximite',
    detail: 'Son approche met l accent sur l accompagnement, les services utiles et la relation client.',
  },
];

const overviewCards = [
  {
    title: 'Presentation',
    text: 'BH Bank est une banque tunisienne qui accompagne les besoins bancaires du quotidien ainsi que les projets de financement.',
    Icon: FaUniversity,
  },
  {
    title: 'Services essentiels',
    text: 'La banque propose notamment des comptes, des cartes, des solutions d epargne, des credits et des services digitaux.',
    Icon: FaShieldAlt,
  },
  {
    title: 'Clienteles',
    text: 'Les offres s adressent a plusieurs profils, dont les particuliers, les professionnels, les entreprises et les Tunisiens residant a l etranger.',
    Icon: FaUsers,
  },
];

const digitalChannels = [
  {
    title: 'BH Net',
    text: 'Un espace en ligne pour consulter les comptes et suivre les operations courantes.',
    items: ['Consultation des comptes', 'Suivi des operations', 'Acces a distance'],
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
  { label: 'Telephone', value: '(+216) 71 126 000', Icon: FaPhoneAlt },
  { label: 'Email', value: 'Contact@bhbank.tn', Icon: FaEnvelope },
  { label: 'Siege', value: '18 Avenue Mohamed V, Tunis 1023', Icon: FaMapMarkerAlt },
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
                BH Bank est une banque tunisienne de proximite, reconnue pour son expertise dans
                l habitat et pour une offre qui couvre les services bancaires essentiels.
              </p>

              <div className="bank-info-summary">
                <span>Banque universelle</span>
                <span>Expertise habitat</span>
                <span>Acces en ligne</span>
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
                <span className="bank-info-section-tag">Vue d ensemble</span>
                <h2>BH Bank en bref</h2>
                <p>
                  Une presentation courte de la banque, de ses services principaux et de sa place
                  dans le financement de l habitat.
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
                <h2>Services a distance</h2>
                <p>
                  BH Bank met aussi en avant des solutions digitales pour consulter les comptes et
                  realiser certaines operations courantes.
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
              <span className="bank-info-card-label">Coordonnees</span>
              <h3>Informations generales de contact</h3>

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

            <div className="bank-info-source-card">
              <span className="bank-info-card-label">Source</span>
              <h3>Reference officielle</h3>
              <p>
                Les informations generales de cette page s appuient sur la presentation publique de
                BH Bank.
              </p>
              <a href="https://www.bhbank.tn/" target="_blank" rel="noreferrer">
                Visiter le site BH Bank
              </a>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
