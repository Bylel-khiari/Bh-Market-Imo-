import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch, FaUser, FaBars, FaTimes, FaMapMarkerAlt, FaHome, FaBuilding, FaWarehouse, FaStore, FaArrowRight } from 'react-icons/fa';
import '../styles/Navbar.css';
import logo from '../assets/favicon.ico';

const Navbar = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [location, setLocation] = useState('');
  const searchInputRef = useRef(null);

  const navItems = [
    'ACCUEIL',
    'LA BANQUE',
    'CONFORMITE',
    'INDICATEURS FINANCIERS',
    'CONTACT',
  ];
  const userCategories = [

 ];

  const propertyTypes = [
    { label: 'Appartement', icon: <FaBuilding /> },
    { label: 'Villa', icon: <FaHome /> },
    { label: 'Terrain', icon: <FaWarehouse /> },
    { label: 'Commercial', icon: <FaStore /> },
  ];

  const popularSearches = [
    'Appartement Tunis',
    'Villa Sousse',
    'Terrain La Marsa',
    'Bureau Lac 2',
  ];

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSearchToggle = () => {
    setIsSearchOpen(!isSearchOpen);
    if (isSearchOpen) {
      setSearchQuery('');
      setSelectedType('');
      setLocation('');
    }
  };

  const runSearch = (overrides = {}) => {
    const q = (overrides.q ?? searchQuery).trim();
    const city = (overrides.location ?? location).trim();
    const type = (overrides.type ?? selectedType).trim();

    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (city) params.set('location', city);
    if (type) params.set('type', type);

    const queryString = params.toString();
    navigate(queryString ? `/properties?${queryString}` : '/properties');
    setIsSearchOpen(false);
    setIsOpen(false);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    runSearch();
  };

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
              <button className={`search-toggle ${isSearchOpen ? 'active' : ''}`} onClick={handleSearchToggle}>
                {isSearchOpen ? <FaTimes /> : <FaSearch />}
              </button>
              <Link to="/login" className="login-btn">
                <FaUser /> CONNEXION
              </Link>
              <button className="mobile-menu-btn" onClick={() => setIsOpen(!isOpen)}>
                {isOpen ? <FaTimes /> : <FaBars />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`search-panel ${isSearchOpen ? 'open' : ''}`}>
        <div className="search-panel-inner">
          <form className="search-main-row" onSubmit={handleSearchSubmit}>
            <div className="search-input-group">
              <FaSearch className="search-input-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Rechercher un bien immobilier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="search-input-group search-location">
              <FaMapMarkerAlt className="search-input-icon" />
              <input
                type="text"
                placeholder="Ville ou quartier"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <button className="search-submit-btn" type="submit">
              <FaSearch /> Rechercher
            </button>
          </form>

          <div className="search-filters-row">
            <span className="search-filter-label">Type de bien :</span>
            <div className="search-type-pills">
              {propertyTypes.map((type) => (
                <button
                  key={type.label}
                  type="button"
                  className={`search-type-pill ${selectedType === type.label ? 'active' : ''}`}
                  onClick={() => setSelectedType(selectedType === type.label ? '' : type.label)}
                >
                  {type.icon} {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="search-popular-row">
            <span className="search-popular-label">Recherches populaires :</span>
            <div className="search-popular-tags">
              {popularSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  className="search-popular-tag"
                  onClick={() => runSearch({ q: term })}
                >
                  {term} <FaArrowRight />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="navbar-main">
        <div className="container">
          <ul className={`nav-menu ${isOpen ? 'active' : ''}`}>
            {navItems.map((item, index) => (
              <li key={index}>
                <Link to={
                  item === 'ACCUEIL' ? '/' : 
                  item === 'INDICATEURS FINANCIERS' ? '/dashboard' :
                  `/${item.toLowerCase().replace(/\s+/g, '-')}`
                }>{item}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {userCategories.length > 0 && (
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
      )}
    </nav>
  );
};

export default Navbar;