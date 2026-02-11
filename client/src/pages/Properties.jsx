import React from 'react';
import '../styles/Properties.css';

const Properties = () => {
  return (
    <div className="properties-page">
      <div className="container">
        <h1>Biens Immobiliers</h1>
        <p>Découvrez notre sélection de biens immobiliers</p>
        <div className="properties-grid">
          <div className="property-item">
            <h3>Appartement</h3>
            <p>Consultez nos appartements disponibles</p>
          </div>
          <div className="property-item">
            <h3>Villa</h3>
            <p>Découvrez nos villas de prestige</p>
          </div>
          <div className="property-item">
            <h3>Bureau</h3>
            <p>Trouvez votre local professionnel</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Properties;
