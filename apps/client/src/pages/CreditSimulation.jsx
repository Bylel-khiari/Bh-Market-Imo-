import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FaCalculator, FaHome, FaMoneyCheckAlt, FaPercent, FaUserClock } from 'react-icons/fa';
import '../styles/CreditSimulation.css';

const MAX_MATURITY_AGE = 75;

const DEBT_RATIO_LIMITS = {
  salarie: 40,
  fonctionnaire: 42,
  profession_libre: 38,
  retraite: 33,
};

const CreditSimulation = () => {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const [formData, setFormData] = useState({
    fundingType: 'acquisition',
    socioCategory: 'salarie',
    tmm: 6.99,
    directRate: 10.24,
    age: 30,
    incomePeriod: 'monthly',
    grossIncome: 2500,
    creditAmount: 150000,
    otherLoansMonthly: 0,
    personalContribution: 30000,
    durationMonths: 240,
    normalLinkedSavings: false,
    complementaryLinkedSavings: false,
    jedidLinkedSavings: false,
    directCredit: true,
    propertyId: '',
    propertyTitle: '',
    propertyLocation: '',
    propertyPrice: 0,
  });
  const [simulationResult, setSimulationResult] = useState(null);

  const durationMaxMonths = useMemo(() => {
    const age = Number(formData.age || 18);
    const remainingMonths = Math.max((MAX_MATURITY_AGE - age) * 12, 12);
    return Math.min(remainingMonths, 300);
  }, [formData.age]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  useEffect(() => {
    const propertyId = params.get('propertyId') || '';
    const title = params.get('title') || '';
    const propertyLocation = params.get('location') || '';
    const propertyPrice = Number(params.get('price') || 0);

    if (!propertyId && !title && !propertyPrice) return;

    setFormData((prev) => {
      const next = {
        ...prev,
        propertyId,
        propertyTitle: title,
        propertyLocation,
        propertyPrice: Number.isFinite(propertyPrice) ? propertyPrice : 0,
      };

      if (propertyPrice > 0) {
        const contribution = Number(prev.personalContribution || 0);
        next.creditAmount = Math.max(propertyPrice - contribution, 10000);
      }
      return next;
    });
  }, [params]);

  const computeAppliedRate = () => {
    const tmm = Number(formData.tmm || 0);
    const directRate = Number(formData.directRate || 0);

    if (formData.directCredit) return directRate;
    if (formData.jedidLinkedSavings) return tmm + 2.2;
    if (formData.normalLinkedSavings) return tmm + 1.8;
    if (formData.complementaryLinkedSavings) return tmm + 2;
    return tmm + 2.5;
  };

  const calculateSimulation = () => {
    const amount = Number(formData.creditAmount || 0);
    const durationMonths = Number(formData.durationMonths || 0);
    const incomeRaw = Number(formData.grossIncome || 0);
    const otherLoans = Number(formData.otherLoansMonthly || 0);
    const monthlyIncome = formData.incomePeriod === 'annual' ? incomeRaw / 12 : incomeRaw;

    if (amount <= 0 || durationMonths <= 0 || monthlyIncome <= 0) {
      setSimulationResult(null);
      return;
    }

    const yearlyRate = computeAppliedRate();
    const monthlyRate = yearlyRate / 100 / 12;

    const mensualite =
      monthlyRate > 0
        ? amount * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -durationMonths)))
        : amount / durationMonths;

    const debtRatio = ((mensualite + otherLoans) / monthlyIncome) * 100;
    const totalRepayment = mensualite * durationMonths;
    const totalInterest = totalRepayment - amount;

    const policyDebtLimit = DEBT_RATIO_LIMITS[formData.socioCategory] || 40;
    const maturityAge = Number(formData.age || 0) + durationMonths / 12;
    const contributionRate = amount > 0 ? (Number(formData.personalContribution || 0) / (amount + Number(formData.personalContribution || 0))) * 100 : 0;

    const checks = [
      {
        key: 'debt_ratio',
        ok: debtRatio <= policyDebtLimit,
        label: `Taux d'endettement <= ${policyDebtLimit}%`,
      },
      {
        key: 'maturity_age',
        ok: maturityAge <= MAX_MATURITY_AGE,
        label: `Age en fin de credit <= ${MAX_MATURITY_AGE} ans`,
      },
      {
        key: 'contribution',
        ok: contributionRate >= 10,
        label: 'Apport personnel >= 10%',
      },
    ];

    const eligible = checks.every((c) => c.ok);

    setSimulationResult({
      amount,
      monthlyPayment: mensualite,
      totalInterest,
      totalAmount: totalRepayment,
      debtRatio,
      monthlyIncome,
      appliedRate: yearlyRate,
      policyDebtLimit,
      maturityAge,
      contributionRate,
      checks,
      eligible,
    });
  };

  const formatCurrency = (value) => `${new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(value)} DT`;

  const syncCreditWithPropertyPrice = () => {
    const propertyPrice = Number(formData.propertyPrice || 0);
    const contribution = Number(formData.personalContribution || 0);
    if (propertyPrice > 0) {
      setFormData((prev) => ({
        ...prev,
        creditAmount: Math.max(propertyPrice - contribution, 10000),
      }));
    }
  };

  return (
    <div className="credit-simulation">
      <div className="container">
        <div className="simulation-header">
          <h1>Simulateur Credit Habitat</h1>
          <p>Simulez votre credit avec les donnees necessaires BH Bank et reliez directement le bien choisi.</p>
        </div>

        <div className="simulation-container">
          <div className="simulation-top-grid">
            <div className="simulation-card">
              <h2><FaHome /> Bien immobilier selectionne</h2>
              {formData.propertyTitle || formData.propertyPrice > 0 ? (
                <div className="selected-property-box">
                  <p><strong>Bien:</strong> {formData.propertyTitle || 'Bien selectionne'}</p>
                  <p><strong>Localisation:</strong> {formData.propertyLocation || 'Non specifiee'}</p>
                  <p><strong>Prix:</strong> {formData.propertyPrice > 0 ? formatCurrency(formData.propertyPrice) : 'Non specifie'}</p>
                  <button type="button" className="btn btn-secondary" onClick={syncCreditWithPropertyPrice}>
                    Utiliser ce prix dans la simulation
                  </button>
                </div>
              ) : (
                <p className="placeholder-note">
                  Aucun bien preselectionne. Vous pouvez choisir un bien depuis la page Biens immobiliers.
                </p>
              )}
            </div>

            <div className="simulation-card">
              <h2><FaCalculator /> Parametres banque</h2>
              <div className="inline-grid">
                <div className="form-group">
                  <label>TMM (%)</label>
                  <input type="number" step="0.01" name="tmm" value={formData.tmm} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Taux credit direct (%)</label>
                  <input type="number" step="0.01" name="directRate" value={formData.directRate} onChange={handleInputChange} />
                </div>
              </div>
            </div>
          </div>

          <div className="simulation-card full">
            <h2><FaMoneyCheckAlt /> Donnees de simulation</h2>
            <div className="simulation-form-grid">
              <div className="form-group">
                <label>Type de financement</label>
                <select name="fundingType" value={formData.fundingType} onChange={handleInputChange}>
                  <option value="acquisition">Acquisition</option>
                  <option value="construction">Construction</option>
                  <option value="amenagement">Amenagement</option>
                </select>
              </div>

              <div className="form-group">
                <label>Categorie socioprofessionnelle</label>
                <select name="socioCategory" value={formData.socioCategory} onChange={handleInputChange}>
                  <option value="salarie">Salarie</option>
                  <option value="profession_libre">Profession liberale</option>
                  <option value="fonctionnaire">Fonctionnaire</option>
                  <option value="retraite">Retraite</option>
                </select>
              </div>

              <div className="form-group">
                <label><FaUserClock /> Age (ans)</label>
                <input type="number" min="18" max="80" name="age" value={formData.age} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label>Revenus bruts</label>
                <div className="inline-grid mini">
                  <select name="incomePeriod" value={formData.incomePeriod} onChange={handleInputChange}>
                    <option value="monthly">Mensuels</option>
                    <option value="annual">Annuels</option>
                  </select>
                  <input type="number" min="0" name="grossIncome" value={formData.grossIncome} onChange={handleInputChange} />
                </div>
              </div>

              <div className="form-group">
                <label>Montant credit (DT)</label>
                <input type="number" min="10000" name="creditAmount" value={formData.creditAmount} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label>Mensualite autres financements (DT)</label>
                <input type="number" min="0" name="otherLoansMonthly" value={formData.otherLoansMonthly} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label>Apport propre (DT)</label>
                <input type="number" min="0" name="personalContribution" value={formData.personalContribution} onChange={handleInputChange} />
              </div>

              <div className="form-group">
                <label>Duree (mois)</label>
                <input type="number" min="12" max={durationMaxMonths} name="durationMonths" value={formData.durationMonths} onChange={handleInputChange} />
                <small className="field-hint">Maximum autorise pour cet age: {durationMaxMonths} mois</small>
              </div>
            </div>

            <div className="credit-options-grid">
              <label><input type="checkbox" name="normalLinkedSavings" checked={formData.normalLinkedSavings} onChange={handleInputChange} /> Credit Normal lie a l'epargne logement</label>
              <label><input type="checkbox" name="complementaryLinkedSavings" checked={formData.complementaryLinkedSavings} onChange={handleInputChange} /> Credit Complementaire lie a l'epargne logement</label>
              <label><input type="checkbox" name="jedidLinkedSavings" checked={formData.jedidLinkedSavings} onChange={handleInputChange} /> Credit Jedid lie a l'epargne Jedid</label>
              <label><input type="checkbox" name="directCredit" checked={formData.directCredit} onChange={handleInputChange} /> Credit direct sans epargne prealable</label>
            </div>

            <div className="simulation-actions">
              <button className="btn btn-primary" type="button" onClick={calculateSimulation}>Calculer</button>
            </div>
          </div>

          {simulationResult && (
            <div className="simulation-result">
              <h2><FaPercent /> Resultat de simulation</h2>
              <div className="result-grid">
                <div className="result-card">
                  <h3>Montant emprunte</h3>
                  <p className="result-value">{formatCurrency(simulationResult.amount)}</p>
                </div>
                <div className="result-card">
                  <h3>Mensualite estimee</h3>
                  <p className="result-value">{formatCurrency(simulationResult.monthlyPayment)}</p>
                  <small>Sur {formData.durationMonths} mois</small>
                </div>
                <div className="result-card">
                  <h3>Taux applique</h3>
                  <p className="result-value">{simulationResult.appliedRate.toFixed(2)}%</p>
                </div>
                <div className="result-card">
                  <h3>Taux d'endettement</h3>
                  <p className="result-value">{simulationResult.debtRatio.toFixed(1)}%</p>
                  <small>Seuil profil: {simulationResult.policyDebtLimit}%</small>
                </div>
                <div className="result-card">
                  <h3>Interets totaux</h3>
                  <p className="result-value">{formatCurrency(simulationResult.totalInterest)}</p>
                </div>
                <div className="result-card">
                  <h3>Cout total credit</h3>
                  <p className="result-value">{formatCurrency(simulationResult.totalAmount)}</p>
                </div>
              </div>

              <div className="policy-checks">
                {simulationResult.checks.map((check) => (
                  <div key={check.key} className={`policy-check ${check.ok ? 'ok' : 'ko'}`}>
                    <span>{check.ok ? 'OK' : 'A revoir'}</span>
                    <p>{check.label}</p>
                  </div>
                ))}
              </div>

              <div className={`eligibility-banner ${simulationResult.eligible ? 'good' : 'warn'}`}>
                {simulationResult.eligible
                  ? 'Resultat indicatif: dossier potentiellement eligible selon ces criteres.'
                  : 'Resultat indicatif: dossier a revoir avec un conseiller (regles non respectees).'}
              </div>

              <div className="result-actions">
                <button className="btn btn-primary">Demander ce credit</button>
                <button className="btn btn-secondary">Exporter ma simulation</button>
              </div>
            </div>
          )}

          {!simulationResult && (
            <div className="simulation-empty">
              Lancez le calcul pour afficher le resultat de votre simulation.
            </div>
          )}
          </div>
      </div>
    </div>
  );
};

export default CreditSimulation;
