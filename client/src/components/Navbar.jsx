import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaSearch, FaUser, FaBars, FaTimes, FaMapMarkerAlt, FaHome, FaBuilding, FaWarehouse, FaStore, FaArrowRight, FaUserCircle } from 'react-icons/fa';
import '../styles/Navbar.css';
import logo from '../assets/favicon.ico';
import { clearAuthSession, getAuthSession } from '../lib/auth';

const Navbar = () => {
  const routeLocation = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [authSession, setAuthSession] = useState(() => getAuthSession());
  const searchInputRef = useRef(null);

  const navItems = [
    { label: 'Accueil', to: '/' },
    { label: 'Biens immobiliers', to: '/properties' },
    { label: 'Simulation habitat', to: '/credit-simulation' },
    { label: 'Credit immobilier BH', to: '/credit-immobilier-bh' },
    { label: 'La banque', to: '/la-banque' },
    { label: 'Contact', to: '/contact' },
  ];

  const currentRole = authSession?.user?.role || null;

  if (currentRole === 'responsable_decisionnel') {
    navItems.push({ label: 'Indicateurs financiers', to: '/dashboard' });
  }

  if (currentRole === 'admin') {
    navItems.push({ label: 'Admin dashboard', to: '/admin/dashboard' });
  }

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

  useEffect(() => {
    setAuthSession(getAuthSession());
  }, [routeLocation.pathname]);

  useEffect(() => {
    const syncAuth = () => setAuthSession(getAuthSession());
    window.addEventListener('storage', syncAuth);
    return () => window.removeEventListener('storage', syncAuth);
  }, []);

  const handleSearchToggle = () => {
    setIsSearchOpen(!isSearchOpen);
    if (isSearchOpen) {
      setSearchQuery('');
      setSelectedType('');
      setSearchLocation('');
    }
  };

  const runSearch = (overrides = {}) => {
    const q = (overrides.q ?? searchQuery).trim();
    const city = (overrides.location ?? searchLocation).trim();
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

  const handleLogout = () => {
    clearAuthSession();
    setAuthSession(null);
    navigate('/');
  };

  return (
    <nav className="bh-navbar">
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
              {authSession?.token ? (
                <>
                  <Link to="/profile/manage" className="profile-icon-btn" title="Mon profil">
                    <FaUserCircle />
                  </Link>
                  <button type="button" className="login-btn" onClick={handleLogout}>
                    <FaUser /> Deconnexion
                  </button>
                </>
              ) : (
                <Link to="/login" className="login-btn">
                  <FaUser /> Connexion
                </Link>
              )}
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
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
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
            {navItems.map((item) => (
              <li key={item.to}>
                <Link to={item.to}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;