import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>BH Marketplace</h3>
            <p>Votre plateforme immobilière intégrée pour des crédits immobiliers simplifiés.</p>
          </div>
          <div className="footer-section">
            <h4>Liens Rapides</h4>
            <ul>
              <li><Link to="/properties">Biens immobiliers</Link></li>
              <li><Link to="/credit-simulation">Simulation crédit</Link></li>
              <li><Link to="/dashboard">Tableaux de bord</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Services</h4>
            <ul>
              <li><Link to="/">Particuliers</Link></li>
              <li><Link to="/">Professionnels</Link></li>
              <li><Link to="/">Promoteurs immobiliers</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>Contact</h4>
            <p></p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 BH Bank - Marketplace Immobilière. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
