import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  FaSearch,
  FaUser,
  FaBars,
  FaTimes,
  FaMapMarkerAlt,
  FaHome,
  FaBuilding,
  FaWarehouse,
  FaStore,
  FaArrowRight,
  FaUserCircle,
  FaChevronDown,
  FaHeart,
  FaSignOutAlt,
  FaChartLine,
  FaUserShield,
  FaUserTie,
} from 'react-icons/fa';
import '../styles/Navbar.css';
import logo from '../assets/favicon.ico';
import { clearAuthSession, getAuthSession } from '../lib/auth';

const Navbar = () => {
  const routeLocation = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [authSession, setAuthSession] = useState(() => getAuthSession());
  const searchInputRef = useRef(null);
  const accountMenuRef = useRef(null);

  const navItems = [
    { label: 'Accueil', to: '/' },
    { label: 'Biens', to: '/properties' },
    { label: 'Simulation', to: '/credit-simulation' },
    { label: 'Cr\u00E9dit', to: '/credit-immobilier-bh' },
    { label: 'Banque', to: '/la-banque' },
    { label: 'Contact', to: '/contact' },
  ];

  const currentRole = authSession?.user?.role || null;
  const isPropertiesPage = routeLocation.pathname === '/properties';
  const accountMenuLinks = [{ label: 'Mon compte', to: '/profile/manage', icon: FaUserCircle }];

  if (currentRole === 'client') {
    accountMenuLinks.push({
      label: 'Mes favoris',
      to: '/properties?favorites=1',
      icon: FaHeart,
    });
  }

  if (currentRole === 'responsable_decisionnel') {
    accountMenuLinks.push({
      label: 'Dashboard decisionnel',
      to: '/dashboard',
      icon: FaChartLine,
    });
  }

  if (currentRole === 'agent_bancaire') {
    accountMenuLinks.push({
      label: 'Dashboard agent',
      to: '/agent/dashboard',
      icon: FaUserTie,
    });
  }

  if (currentRole === 'admin') {
    accountMenuLinks.push({
      label: 'Admin dashboard',
      to: '/admin/dashboard',
      icon: FaUserShield,
    });
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
    setIsOpen(false);
    setIsAccountMenuOpen(false);
    setIsSearchOpen(false);
  }, [routeLocation.pathname]);

  useEffect(() => {
    const syncAuth = () => setAuthSession(getAuthSession());
    window.addEventListener('storage', syncAuth);
    return () => window.removeEventListener('storage', syncAuth);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsAccountMenuOpen(false);
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSearchToggle = () => {
    setIsAccountMenuOpen(false);
    setIsOpen(false);
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
    setIsAccountMenuOpen(false);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    runSearch();
  };

  const handleAccountMenuToggle = () => {
    setIsSearchOpen(false);
    setIsOpen(false);
    setIsAccountMenuOpen((prev) => !prev);
  };

  const handleMobileMenuToggle = () => {
    setIsSearchOpen(false);
    setIsAccountMenuOpen(false);
    setIsOpen((prev) => !prev);
  };

  const closeMenuPanels = () => {
    setIsOpen(false);
    setIsAccountMenuOpen(false);
    setIsSearchOpen(false);
  };

  const handleLogout = () => {
    clearAuthSession();
    setAuthSession(null);
    closeMenuPanels();
    navigate('/');
  };

  const accountDisplayName =
    authSession?.user?.name || authSession?.user?.email || 'Mon compte';

  const isAccountLinkActive = (to) => {
    const [pathname, queryString] = to.split('?');
    if (routeLocation.pathname !== pathname) return false;
    if (!queryString) return true;
    return routeLocation.search === `?${queryString}`;
  };

  return (
    <nav className="bh-navbar">
      <div className="navbar-top">
        <div className="container">
          <div className="nav-top-content">
            <div className="logo-section">
              <Link to="/" className="brand-link" onClick={closeMenuPanels}>
                <span className="brand-mark">
                  <img src={logo} alt="BH BANK" className="logo" />
                </span>
                <span className="brand-copy">
                  <span className="brand-kicker">BH Bank Tunisie</span>
                  <span className="marketplace-tag">Marketplace</span>
                </span>
              </Link>
            </div>
            <div className="nav-actions">
              {isPropertiesPage ? (
                <button
                  type="button"
                  className={`search-toggle ${isSearchOpen ? 'active' : ''}`}
                  onClick={handleSearchToggle}
                  aria-label={isSearchOpen ? 'Fermer la recherche' : 'Ouvrir la recherche'}
                >
                  {isSearchOpen ? <FaTimes /> : <FaSearch />}
                </button>
              ) : null}
              {authSession?.token ? (
                <div
                  ref={accountMenuRef}
                  className={`account-menu ${isAccountMenuOpen ? 'is-open' : ''}`}
                >
                  <button
                    type="button"
                    className="profile-menu-trigger"
                    aria-haspopup="menu"
                    aria-expanded={isAccountMenuOpen}
                    onClick={handleAccountMenuToggle}
                  >
                    <FaUserCircle className="profile-menu-trigger-icon" />
                    <span className="profile-menu-trigger-text">Mon compte</span>
                    <FaChevronDown className="profile-menu-trigger-caret" />
                  </button>

                  <div
                    className="account-dropdown"
                    role="menu"
                    aria-label="Menu du compte"
                  >
                    <div className="account-dropdown-head">
                      <span className="account-dropdown-label">Espace utilisateur</span>
                      <strong>{accountDisplayName}</strong>
                    </div>

                    <div className="account-dropdown-links">
                      {accountMenuLinks.map(({ label, to, icon: Icon }) => (
                        <Link
                          key={to}
                          to={to}
                          role="menuitem"
                          className={`account-dropdown-link${
                            isAccountLinkActive(to) ? ' is-active' : ''
                          }`}
                          onClick={() => setIsAccountMenuOpen(false)}
                        >
                          <Icon />
                          <span>{label}</span>
                        </Link>
                      ))}
                    </div>

                    <div className="account-dropdown-divider" />

                    <button
                      type="button"
                      role="menuitem"
                      className="account-dropdown-link account-dropdown-link--logout"
                      onClick={handleLogout}
                    >
                      <FaSignOutAlt />
                      <span>Déconnexion</span>
                    </button>
                  </div>
                </div>
              ) : (
                <Link to="/login" className="login-btn">
                  <FaUser /> Connexion
                </Link>
              )}
              <button
                type="button"
                className="mobile-menu-btn"
                onClick={handleMobileMenuToggle}
                aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                aria-expanded={isOpen}
              >
                {isOpen ? <FaTimes /> : <FaBars />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isPropertiesPage ? (
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
      ) : null}

      <div className="navbar-main">
        <div className="container">
          <div className={`navbar-menu-panel ${isOpen ? 'active' : ''}`}>
            <ul className="nav-menu">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => `bh-nav-link${isActive ? ' is-active' : ''}`}
                    onClick={closeMenuPanels}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="mobile-account-panel">
              <span className="mobile-menu-section-title">Compte</span>

              {authSession?.token ? (
                <>
                  {accountMenuLinks.map(({ label, to, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      className={`mobile-account-link${
                        isAccountLinkActive(to) ? ' is-active' : ''
                      }`}
                      onClick={closeMenuPanels}
                    >
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  ))}

                  <button
                    type="button"
                    className="mobile-account-link mobile-account-link--logout"
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt />
                    <span>Déconnexion</span>
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="mobile-account-link mobile-account-link--login"
                  onClick={closeMenuPanels}
                >
                  <FaUser />
                  <span>Connexion</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
