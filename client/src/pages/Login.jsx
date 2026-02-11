import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Login.css';

const Login = () => {
  return (
    <div className="login-page">
      <div className="container">
        <div className="login-container">
          <h1>Connexion</h1>
          <p>Accédez à votre espace client BH Bank</p>
          <form className="login-form">
            <div className="form-group">
              <label>Identifiant</label>
              <input type="text" placeholder="Votre identifiant" />
            </div>
            <div className="form-group">
              <label>Mot de passe</label>
              <input type="password" placeholder="Votre mot de passe" />
            </div>
            <button type="submit" className="btn btn-primary">Se connecter</button>
            <div className="login-links">
              <Link to="/forgot-password">Mot de passe oublié ?</Link>
              <Link to="/register">Créer un compte</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
