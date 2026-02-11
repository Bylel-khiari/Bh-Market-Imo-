import React from 'react';
import '../styles/Profile.css';

const Profile = () => {
  return (
    <div className="profile-page">
      <div className="container">
        <h1>Mon Profil</h1>
        <div className="profile-content">
          <div className="profile-section">
            <h2>Informations personnelles</h2>
            <p>Gérez vos informations personnelles et vos préférences</p>
          </div>
          <div className="profile-section">
            <h2>Mes demandes de crédit</h2>
            <p>Consultez l'état de vos demandes de crédit immobilier</p>
          </div>
          <div className="profile-section">
            <h2>Mes biens favoris</h2>
            <p>Retrouvez les biens immobiliers que vous avez sauvegardés</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
