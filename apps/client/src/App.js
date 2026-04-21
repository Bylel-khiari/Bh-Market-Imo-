import React from 'react';
import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Properties from './pages/Properties';
import CreditSimulation from './pages/CreditSimulation';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Profile from './pages/Profile';
import ProfileManagement from './pages/ProfileManagement';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Contact from './pages/Contact';
import CreditImmobilierBHPortal from './pages/CreditImmobilierBHPortal';
import LaBanque from './pages/LaBanque';
import { getAuthSession } from './lib/auth';
import './App.css';

function App() {
  const location = useLocation();
  const fullscreenRoutes = ['/dashboard', '/admin/dashboard'];
  const hideNavFooter = ['/login', '/register', '/forgot-password', ...fullscreenRoutes].includes(location.pathname);
  const isFullscreenRoute = fullscreenRoutes.includes(location.pathname);
  const role = getAuthSession()?.user?.role;

  return (
    <div className={`App${isFullscreenRoute ? ' App--fullscreen' : ''}`}>
      {!hideNavFooter && <Navbar />}
      <main className={`App__content${isFullscreenRoute ? ' App__content--fullscreen' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/credit-simulation" element={<CreditSimulation />} />
          <Route
            path="/dashboard"
            element={role === 'responsable_decisionnel' ? <Dashboard /> : <Navigate to="/" replace />}
          />
          <Route
            path="/admin/dashboard"
            element={role === 'admin' ? <AdminDashboard /> : <Navigate to="/" replace />}
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/la-banque" element={<LaBanque />} />
          <Route path="/credit-immobilier-bh" element={<CreditImmobilierBHPortal />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/manage" element={<ProfileManagement />} />
        </Routes>
      </main>
      {!hideNavFooter && <Footer />}
    </div>
  );
}

export default App;
