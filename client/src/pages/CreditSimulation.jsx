import React, { useState } from 'react';
import { FaEuroSign, FaHome, FaUser, FaBriefcase, FaFileAlt } from 'react-icons/fa';
import '../styles/CreditSimulation.css';

const CreditSimulation = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    propertyPrice: '',
    contribution: '',
    duration: 20,
    monthlyIncome: '',
    employmentType: '',
    age: '',
    documents: []
  });

  const [simulationResult, setSimulationResult] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const calculateCredit = () => {
    const amount = parseFloat(formData.propertyPrice) - parseFloat(formData.contribution);
    const interestRate = 0.085; // 8.5% taux d'intérêt
    const months = formData.duration * 12;
    const monthlyRate = interestRate / 12;
    const monthlyPayment = amount * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    
    setSimulationResult({
      amount: amount.toFixed(0),
      monthlyPayment: monthlyPayment.toFixed(0),
      totalInterest: (amount * interestRate * formData.duration).toFixed(0),
      totalAmount: (amount + (amount * interestRate * formData.duration)).toFixed(0)
    });
  };

  const nextStep = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      calculateCredit();
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="credit-simulation">
      <div className="container">
        <div className="simulation-header">
          <h1>Simulation de crédit immobilier</h1>
          <p>Estimez votre capacité d'emprunt en quelques clics</p>
        </div>

        <div className="simulation-container">
          <div className="steps">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>
              <div className="step-number">1</div>
              <div className="step-label">Informations bien</div>
            </div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>
              <div className="step-number">2</div>
              <div className="step-label">Situation financière</div>
            </div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>
              <div className="step-number">3</div>
              <div className="step-label">Simulation</div>
            </div>
          </div>

          <div className="simulation-content">
            {step === 1 && (
              <div className="simulation-form">
                <h2>Informations sur le bien immobilier</h2>
                <div className="form-group">
                  <label>
                    <FaHome /> Prix du bien (DT)
                  </label>
                  <input
                    type="number"
                    name="propertyPrice"
                    value={formData.propertyPrice}
                    onChange={handleInputChange}
                    placeholder="Ex: 300000"
                  />
                </div>
                <div className="form-group">
                  <label>
                    <FaEuroSign /> Apport personnel (DT)
                  </label>
                  <input
                    type="number"
                    name="contribution"
                    value={formData.contribution}
                    onChange={handleInputChange}
                    placeholder="Ex: 50000"
                  />
                  <small>Minimum 10% du prix du bien</small>
                </div>
                <div className="form-group">
                  <label>Durée du crédit (années)</label>
                  <select
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                  >
                    <option value="10">10 ans</option>
                    <option value="15">15 ans</option>
                    <option value="20">20 ans</option>
                    <option value="25">25 ans</option>
                  </select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="simulation-form">
                <h2>Situation financière</h2>
                <div className="form-group">
                  <label>
                    <FaUser /> Âge
                  </label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="Votre âge"
                  />
                </div>
                <div className="form-group">
                  <label>
                    <FaBriefcase /> Situation professionnelle
                  </label>
                  <select
                    name="employmentType"
                    value={formData.employmentType}
                    onChange={handleInputChange}
                  >
                    <option value="">Sélectionnez</option>
                    <option value="cdi">CDI</option>
                    <option value="cdd">CDD</option>
                    <option value="independent">Indépendant</option>
                    <option value="retired">Retraité</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    <FaEuroSign /> Revenus mensuels nets (DT)
                  </label>
                  <input
                    type="number"
                    name="monthlyIncome"
                    value={formData.monthlyIncome}
                    onChange={handleInputChange}
                    placeholder="Ex: 3000"
                  />
                </div>
                <div className="form-group">
                  <label>
                    <FaFileAlt /> Documents justificatifs
                  </label>
                  <div className="file-upload">
                    <input type="file" multiple />
                    <p>Glissez vos fichiers ou cliquez pour ajouter</p>
                    <small>Pièce d'identité, justificatifs de revenus, etc.</small>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && simulationResult && (
              <div className="simulation-result">
                <h2>Résultat de votre simulation</h2>
                <div className="result-grid">
                  <div className="result-card">
                    <h3>Montant emprunté</h3>
                    <p className="result-value">{simulationResult.amount} DT</p>
                  </div>
                  <div className="result-card">
                    <h3>Mensualité estimée</h3>
                    <p className="result-value">{simulationResult.monthlyPayment} DT</p>
                    <small>sur {formData.duration} ans</small>
                  </div>
                  <div className="result-card">
                    <h3>Intérêts totaux</h3>
                    <p className="result-value">{simulationResult.totalInterest} DT</p>
                  </div>
                  <div className="result-card">
                    <h3>Coût total du crédit</h3>
                    <p className="result-value">{simulationResult.totalAmount} DT</p>
                  </div>
                </div>
                <div className="result-actions">
                  <button className="btn btn-primary">Demander mon crédit</button>
                  <button className="btn btn-secondary">Télécharger la simulation</button>
                </div>
              </div>
            )}
          </div>

          <div className="simulation-actions">
            {step > 1 && step < 3 && (
              <button className="btn btn-secondary" onClick={prevStep}>
                Précédent
              </button>
            )}
            {step < 3 && (
              <button className="btn btn-primary" onClick={nextStep}>
                {step === 2 ? 'Simuler' : 'Suivant'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditSimulation;
