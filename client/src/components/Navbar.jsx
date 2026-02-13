import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaSearch, FaUser, FaBars, FaTimes } from 'react-icons/fa';
import '../styles/Navbar.css';
import logo from '../assets/favicon.ico';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navItems = [
    'ACCUEIL',
    'LA BANQUE',
    'CONFORMITE',
    'INDICATEURS FINANCIERS',
    'CONTACT',
  ];
  const userCategories = [
   
 ];

  return (
    <nav className="navbar">
      <div className="navbar-top">
        <div className="container">
          <div className="nav-top-content">
            <div className="logo-section">
              <Link to="/">
                <img src={logo} alt="BH BANK" className="logo" />
                <span className="marketplace-tag">MARKETPLACE</span>
              </Link>
            </div>
            <div className="nav-actions">
              <button className="search-toggle" onClick={() => setIsSearchOpen(!isSearchOpen)}>
                <FaSearch />
              </button>
              <Link to="/login" className="login-btn">
                <FaUser /> CONNEXION
              </Link>
              <button className="mobile-menu-btn" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <FaTimes /> : <FaBars />}
              </button>
            </div>
          </div>
          {isSearchOpen && (
            <div className="search-bar">
              <input type="text" placeholder="Rechercher..." />
              <button className="search-btn">Rechercher</button>
            </div>
          )}
        </div>
      </div>

      <div className="navbar-main">
        <div className="container">
          <ul className={`nav-menu ${isOpen ? 'active' : ''}`}>
            {navItems.map((item, index) => (
              <li key={index}>
                <Link to={`/${item.toLowerCase().replace(/\s+/g, '-')}`}>{item}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="navbar-categories">
        <div className="container">
          <ul className="category-menu">
            {userCategories.map((category, index) => (
              <li key={index}>
                <Link to={`/category/${category.toLowerCase().replace(/\s+/g, '-')}`}>
                  {category}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;