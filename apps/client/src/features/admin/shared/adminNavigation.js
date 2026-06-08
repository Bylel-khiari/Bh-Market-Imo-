import {
  FaBuilding,
  FaEnvelope,
  FaGlobe,
  FaHome,
  FaListAlt,
  FaUsers,
} from 'react-icons/fa';

export const ADMIN_PARAMETER_MENU_ITEMS = [
  { key: 'users', label: 'Utilisateurs', icon: FaUsers },
  { key: 'properties', label: 'Biens', icon: FaBuilding },
  { key: 'sites', label: 'Sites scrapés', icon: FaGlobe },
];

export const ADMIN_MENU_ITEMS = [
  { key: 'dashboard', label: 'Tableau de bord', icon: FaHome },
  { key: 'mail', label: 'Réclamation', icon: FaEnvelope },
  { key: 'activities', label: 'Activités', icon: FaListAlt },
];

export const ADMIN_SECTION_TITLES = {
  dashboard: 'Tableau de bord',
  users: 'Gestion des utilisateurs',
  properties: 'Gestion des biens immobiliers',
  mail: 'Réclamation',
  sites: 'Gestion des sites scrapés',
  activities: 'Activités récentes',
};
