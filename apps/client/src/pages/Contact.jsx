import React from 'react';
import {
  FaBuilding,
  FaCalendarCheck,
  FaClock,
  FaEnvelope,
  FaHeadset,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaShieldAlt,
  FaUserShield,
} from 'react-icons/fa';
import '../styles/Contact.css';

const quickContacts = [
  {
    label: 'Standard',
    value: '(+216) 71 126 000',
    detail: 'Telephone general',
    Icon: FaPhoneAlt,
  },
  {
    label: 'Email',
    value: 'Contact@bhbank.tn',
    detail: 'Demande generale',
    Icon: FaEnvelope,
  },
  {
    label: 'Centre client',
    value: '1800',
    detail: 'Assistance rapide',
    Icon: FaHeadset,
  },
  {
    label: 'Horaires',
    value: '08H15 - 17H00',
    detail: 'Lundi au vendredi',
    Icon: FaClock,
  },
];

const requestRoutes = [
  {
    title: 'Question generale',
    text: 'Pour une information, une orientation ou une demande de contact classique.',
    detail: 'Canal conseille : Contactez-nous',
    Icon: FaEnvelope,
  },
  {
    title: 'Rendez-vous en agence',
    text: 'Pour organiser un echange avec une agence ou preparer un entretien sur place.',
    detail: 'Canal conseille : prise de rendez-vous',
    Icon: FaCalendarCheck,
  },
  {
    title: 'Reclamation',
    text: 'Pour signaler une reclamation et suivre son traitement dans le parcours dedie.',
    detail: 'Canal conseille : portail de reclamations',
    Icon: FaShieldAlt,
  },
  {
    title: 'Orientation rapide',
    text: 'Pour joindre rapidement les canaux les plus directs sans formulaire detaille.',
    detail: 'Telephone, email et centre relation client',
    Icon: FaHeadset,
  },
];

const officialEntries = [
  {
    title: 'Contactez-nous',
    text: 'Le point d entree general pour envoyer une demande d information ou etre oriente.',
    href: 'https://www.bhbank.tn/contactez-nous',
    action: 'Ouvrir la page de contact',
    Icon: FaEnvelope,
  },
  {
    title: 'Prise de rendez-vous',
    text: 'Le bon acces pour fixer un echange en agence avec un motif de visite clair.',
    href: 'https://www.bhbank.tn/prise-de-rendez-vous',
    action: 'Prendre un rendez-vous',
    Icon: FaCalendarCheck,
  },
  {
    title: 'Site officiel',
    text: 'Pour consulter les rubriques institutionnelles et les autres services BH Bank.',
    href: 'https://www.bhbank.tn/',
    action: 'Visiter BH Bank',
    Icon: FaBuilding,
  },
];

const directory = [
  {
    label: 'Telephone',
    value: '(+216) 71 126 000',
    detail: 'Standard BH Bank',
    Icon: FaPhoneAlt,
  },
  {
    label: 'Email',
    value: 'Contact@bhbank.tn',
    detail: 'Demande generale et orientation',
    Icon: FaEnvelope,
  },
  {
    label: 'Centre relation client',
    value: '1800',
    detail: 'Assistance client',
    Icon: FaHeadset,
  },
  {
    label: 'Siege social',
    value: '18 Avenue Mohamed V, Tunis 1023',
    detail: 'Adresse publiee sur la page officielle',
    Icon: FaMapMarkerAlt,
  },
];

const mediatorRows = [
  { label: 'Nom', value: 'Meftah Ziadi', Icon: FaUserShield },
  { label: 'Telephone', value: '(+216) 50428037 / 94371576', Icon: FaPhoneAlt },
  { label: 'Email', value: 'ziadi.meftah@cbf.org.tn', Icon: FaEnvelope },
  { label: 'Adresse', value: '20, rue Mohamed Triki - 2037 - Ennasr 2', Icon: FaMapMarkerAlt },
];

export default function Contact() {
  return (
    <div className="contact-info-page">
      <section className="contact-info-hero-section">
        <div className="container contact-info-shell">
          <div className="contact-info-hero-grid">
            <div className="contact-info-main">
              <span className="contact-info-kicker">BH Bank Tunisie</span>
              <h1>Contact</h1>
              <p className="contact-info-lead">
                Retrouvez ici les informations essentielles pour joindre BH Bank, choisir le bon
                canal selon votre besoin et consulter les coordonnees utiles.
              </p>

              <div className="contact-info-summary">
                <span>Contact general</span>
                <span>Rendez-vous</span>
                <span>Mediation</span>
              </div>
            </div>

            <div className="contact-info-facts-grid">
              {quickContacts.map(({ label, value, detail, Icon }) => (
                <article className="contact-info-fact-card" key={label}>
                  <div className="contact-info-card-icon">
                    <Icon />
                  </div>
                  <strong>{label}</strong>
                  <span>{value}</span>
                  <p>{detail}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="container contact-info-content-shell">
        <div className="contact-info-body-grid">
          <div className="contact-info-content">
            <section className="contact-info-panel">
              <div className="contact-info-section-head">
                <span className="contact-info-section-tag">Orientation</span>
                <h2>Choisir le bon canal</h2>
                <p>
                  BH Bank distingue plusieurs points d entree. L objectif est de montrer clairement
                  a quoi sert chaque canal sans charger la page inutilement.
                </p>
              </div>

              <div className="contact-info-route-grid">
                {requestRoutes.map(({ title, text, detail, Icon }) => (
                  <article className="contact-info-route-card" key={title}>
                    <div className="contact-info-card-icon">
                      <Icon />
                    </div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                    <span>{detail}</span>
                  </article>
                ))}
              </div>
            </section>

            <section className="contact-info-panel">
              <div className="contact-info-section-head">
                <span className="contact-info-section-tag">Entrees officielles</span>
                <h2>Pages utiles</h2>
                <p>
                  Les principales demarches a distance reposent sur ces pages officielles de
                  reference.
                </p>
              </div>

              <div className="contact-info-entry-grid">
                {officialEntries.map(({ title, text, href, action, Icon }) => (
                  <article className="contact-info-entry-card" key={title}>
                    <div className="contact-info-card-icon">
                      <Icon />
                    </div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                    <a href={href} target="_blank" rel="noreferrer">
                      {action}
                    </a>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="contact-info-sidebar">
            <div className="contact-info-directory-card">
              <span className="contact-info-card-label">Coordonnees</span>
              <h3>Informations generales de contact</h3>

              <div className="contact-info-directory-list">
                {directory.map(({ label, value, detail, Icon }) => (
                  <div className="contact-info-directory-row" key={label}>
                    <div className="contact-info-directory-icon">
                      <Icon />
                    </div>
                    <div>
                      <strong>{label}</strong>
                      <span>{value}</span>
                      <p>{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="contact-info-mediator-card">
              <span className="contact-info-card-label">Mediation</span>
              <h3>Coordonnees du mediateur</h3>
              <p>
                Ces coordonnees sont publiees pour les situations qui necessitent un niveau
                d escalade supplementaire.
              </p>

              <div className="contact-info-mediator-list">
                {mediatorRows.map(({ label, value, Icon }) => (
                  <div className="contact-info-mediator-row" key={label}>
                    <div className="contact-info-mediator-icon">
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

            <div className="contact-info-source-card">
              <span className="contact-info-card-label">Source</span>
              <h3>Reference officielle</h3>
              <p>Les informations de cette page s appuient sur les pages publiques BH Bank.</p>
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
