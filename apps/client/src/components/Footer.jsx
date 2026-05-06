import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Footer.css';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Plateforme immobilière BH</h3>
            <p>
              Plateforme immobilière BH Bank pour rechercher un bien, simuler un crédit habitat
              et déposer votre demande avec un parcours clair.
            </p>
          </div>
          <div className="footer-section">
            <h4>Navigation</h4>
            <ul>
              <li><Link to="/properties">Biens immobiliers</Link></li>
              <li><Link to="/credit-simulation">Simulation crédit</Link></li>
              <li><Link to="/credit-immobilier-bh">Crédit immobilier BH</Link></li>
              <li><Link to="/la-banque">La banque</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Assistance</h4>
            <ul>
              <li>Accompagnement crédit habitat</li>
              <li>Suivi des dossiers clients</li>
              <li>Assistance pour les simulations</li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Contact</h4>
            <p>BH Bank Tunisie</p>
            <p>Tél. : +216 71 000 000</p>
            <p>E-mail : support@bhbank.tn</p>
            <p>Lun-Ven: 08:00 - 17:00</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {year} BH Bank - Plateforme immobilière. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
