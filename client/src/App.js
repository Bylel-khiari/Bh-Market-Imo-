import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Properties from './pages/Properties';
import CreditSimulation from './pages/CreditSimulation';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Profile from './pages/Profile';
import './App.css';

function App() {
  const location = useLocation();
  const hideNavFooter = location.pathname === '/login';

  return (
    <div className="App">
      {!hideNavFooter && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/credit-simulation" element={<CreditSimulation />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      {!hideNavFooter && <Footer />}
    </div>
  );
}

export default App;
