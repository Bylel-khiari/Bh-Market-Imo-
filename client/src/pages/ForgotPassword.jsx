import React from "react";
import { Link } from "react-router-dom";
import "../styles/Login.css";

const ForgotPassword = () => {
  return (
    <div className="login-page">
      <div className="container">
        <div className="login-container">
          <h1>Mot de passe oublie</h1>
          <p>Recevez un lien de reinitialisation par email</p>
          <form className="login-form">
            <div className="form-group">
              <label>Email</label>
              <input type="email" placeholder="Votre email" />
            </div>
            <button type="submit" className="btn btn-primary">Envoyer le lien</button>
            <div className="login-links">
              <Link to="/login">Retour a la connexion</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
