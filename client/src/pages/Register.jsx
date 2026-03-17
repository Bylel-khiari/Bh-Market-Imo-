import React from "react";
import { Link } from "react-router-dom";
import "../styles/Login.css";

const Register = () => {
  return (
    <div className="login-page">
      <div className="container">
        <div className="login-container">
          <h1>Creer un compte</h1>
          <p>Inscrivez-vous pour acceder a votre espace client</p>
          <form className="login-form">
            <div className="form-group">
              <label>Nom complet</label>
              <input type="text" placeholder="Votre nom" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" placeholder="Votre email" />
            </div>
            <div className="form-group">
              <label>Mot de passe</label>
              <input type="password" placeholder="Choisissez un mot de passe" />
            </div>
            <button type="submit" className="btn btn-primary">S'inscrire</button>
            <div className="login-links">
              <Link to="/login">J'ai deja un compte</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;
