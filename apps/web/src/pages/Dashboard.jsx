import React, { useState } from 'react';
import { 
  FaUsers, FaHome, FaFileAlt, FaCheckCircle, 
  FaChartLine, FaUserTie, FaClock, FaEuroSign 
} from 'react-icons/fa';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer 
} from 'recharts';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState('month');

  // Données simulées pour les KPI
  const kpiData = [
    { title: 'Visiteurs', value: '45,289', change: '+12%', icon: FaUsers, color: '#003366' },
    { title: 'Biens consultés', value: '12,456', change: '+8%', icon: FaHome, color: '#ff8c00' },
    { title: 'Demandes crédit', value: '234', change: '+15%', icon: FaFileAlt, color: '#28a745' },
    { title: 'Crédits accordés', value: '156', change: '+10%', icon: FaCheckCircle, color: '#17a2b8' },
  ];

  const trafficData = [
    { month: 'Jan', visiteurs: 3500, consultations: 2400 },
    { month: 'Fév', visiteurs: 4200, consultations: 2800 },
    { month: 'Mar', visiteurs: 4800, consultations: 3200 },
    { month: 'Avr', visiteurs: 5100, consultations: 3500 },
    { month: 'Mai', visiteurs: 5900, consultations: 4100 },
    { month: 'Juin', visiteurs: 6500, consultations: 4800 },
  ];

  const propertyTypes = [
    { name: 'Appartement', value: 45 },
    { name: 'Villa', value: 25 },
    { name: 'Bureau', value: 15 },
    { name: 'Local', value: 10 },
    { name: 'Terrain', value: 5 },
  ];

  const COLORS = ['#003366', '#ff8c00', '#28a745', '#17a2b8', '#dc3545'];

  const creditSimulationRate = 68; // Pourcentage de visiteurs ayant simulé un crédit

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1>Tableaux de Bord Analytiques</h1>
          <div className="dashboard-controls">
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
              <option value="day">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="year">Cette année</option>
            </select>
            <button className="btn btn-primary">Exporter PDF</button>
          </div>
        </div>

        <div className="kpi-grid">
          {kpiData.map((kpi, index) => (
            <div key={index} className="kpi-card">
              <div className="kpi-icon" style={{ backgroundColor: `${kpi.color}20` }}>
                <kpi.icon style={{ color: kpi.color }} />
              </div>
              <div className="kpi-info">
                <h3>{kpi.title}</h3>
                <div className="kpi-value">{kpi.value}</div>
                <span className={`kpi-change ${kpi.change.includes('+') ? 'positive' : 'negative'}`}>
                  {kpi.change} vs période précédente
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-row">
          <div className="dashboard-card">
            <h2>Évolution du trafic et consultations</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trafficData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="visiteurs" stroke="#003366" name="Visiteurs" />
                <Line type="monotone" dataKey="consultations" stroke="#ff8c00" name="Consultations biens" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="dashboard-card">
            <h2>Répartition par type de bien</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={propertyTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {propertyTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dashboard-row">
          <div className="dashboard-card">
            <h2>Activité des crédits immobiliers</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trafficData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="visiteurs" fill="#003366" name="Demandes" />
                <Bar dataKey="consultations" fill="#ff8c00" name="Accordés" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="dashboard-card">
            <h2>Taux de simulation de crédit</h2>
            <div className="credit-rate-container">
              <div className="credit-rate-circle">
                <svg viewBox="0 0 36 36" className="circular-chart">
                  <path
                    className="circle-bg"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="circle"
                    strokeDasharray={`${creditSimulationRate}, 100`}
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <text x="18" y="20.35" className="percentage">{creditSimulationRate}%</text>
                </svg>
              </div>
              <p className="credit-rate-label">
                des visiteurs ont effectué une simulation de crédit bancaire
              </p>
            </div>
          </div>
        </div>

        <div className="dashboard-row">
          <div className="dashboard-card full-width">
            <h2>Pages les plus visitées</h2>
            <table className="pages-table">
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Vues</th>
                  <th>Visiteurs uniques</th>
                  <th>Taux de conversion</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Accueil</td>
                  <td>15,234</td>
                  <td>12,456</td>
                  <td>12%</td>
                </tr>
                <tr>
                  <td>Biens immobiliers</td>
                  <td>12,567</td>
                  <td>9,876</td>
                  <td>18%</td>
                </tr>
                <tr>
                  <td>Simulation crédit</td>
                  <td>8,945</td>
                  <td>7,234</td>
                  <td>68%</td>
                </tr>
                <tr>
                  <td>Contact</td>
                  <td>4,567</td>
                  <td>3,890</td>
                  <td>8%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
