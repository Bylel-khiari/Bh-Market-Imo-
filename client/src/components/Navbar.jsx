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
    'ACCUEIL',
    'BIEN IMMOBILIERE',
    'LA BANQUE',
    'CONFORMITE',
    'INDICATEURS FINANCIERS',
    'CONTACT',
  ];
  const currentRole = authSession?.user?.role || null;
  const visibleNavItems = navItems.filter(
    (item) => item !== 'INDICATEURS FINANCIERS' || currentRole === 'responsable_decisionnel'
  );
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
              {authSession?.token ? (
                <>
                  <Link to="/profile/manage" className="profile-icon-btn" title="Mon profil">
                    <FaUserCircle />
                  </Link>
                  <button type="button" className="login-btn" onClick={handleLogout}>
                    <FaUser /> DECONNEXION
                  </button>
                </>
              ) : (
                <Link to="/login" className="login-btn">
                  <FaUser /> CONNEXION
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
            {visibleNavItems.map((item, index) => (
              <li key={index}>
                <Link to={
                  item === 'ACCUEIL' ? '/' : 
                  item === 'BIEN IMMOBILIERE' ? '/properties' :
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