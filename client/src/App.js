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
import { getAuthSession } from './lib/auth';
import './App.css';

function App() {
  const location = useLocation();
  const hideNavFooter = ['/login', '/register', '/forgot-password'].includes(location.pathname);
  const role = getAuthSession()?.user?.role;

  return (
    <div className="App">
      {!hideNavFooter && <Navbar />}
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
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/manage" element={<ProfileManagement />} />
      </Routes>
      {!hideNavFooter && <Footer />}
    </div>
  );
}

export default App;
