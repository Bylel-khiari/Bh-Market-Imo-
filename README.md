# BH Marketplace Immobilier

Plateforme de crédit immobilier avec chatbot et tableaux de bord analytiques pour BH Bank.

## 🏦 À propos

BH Marketplace est une plateforme immobilière intégrée qui offre :
- **Marketplace Immobilière** : Consultation de milliers de biens immobiliers
- **Assistant Virtuel** : Chatbot intelligent pour accompagner les utilisateurs
- **Tableaux de Bord** : Suivi des KPI et évolution du marché immobilier
- **Simulation de Crédit** : Processus d'octroi simplifié et automatisé

## 🚀 Installation

### Prérequis
- Node.js (version 14 ou supérieure)
- npm ou yarn

### Étapes d'installation

1. Cloner le repository
```bash
git clone <repository-url>
cd Bh-Market-Imo-
```

2. Installer les dépendances du client
```bash
cd client
npm install
```

## 📦 Scripts disponibles

Dans le répertoire `client`, vous pouvez exécuter :

### `npm start`

Lance l'application en mode développement.\
Ouvrez [http://localhost:3000](http://localhost:3000) pour la voir dans votre navigateur.

La page se rechargera automatiquement quand vous ferez des modifications.\
Les erreurs de lint s'afficheront dans la console.

### `npm test`

Lance le testeur en mode interactif.\
Voir la section sur [running tests](https://facebook.github.io/create-react-app/docs/running-tests) pour plus d'informations.

### `npm run build`

Construit l'application pour la production dans le dossier `build`.\
Il regroupe correctement React en mode production et optimise la construction pour les meilleures performances.

La construction est minifiée et les noms de fichiers incluent les hashes.\
Votre application est prête à être déployée!

## 🛠️ Technologies utilisées

- **React** 18.2.0 - Bibliothèque JavaScript pour construire l'interface utilisateur
- **React Router DOM** 6.14.0 - Routage pour l'application
- **Axios** 1.4.0 - Client HTTP pour les requêtes API
- **Recharts** 2.7.2 - Bibliothèque de graphiques pour les tableaux de bord
- **React Icons** 4.10.1 - Icônes pour l'interface utilisateur
- **Material-UI** 5.13.6 - Composants UI Material Design
- **React Slick** 0.29.0 - Carrousel pour les biens immobiliers
- **Chart.js** 4.3.0 - Graphiques et visualisations de données

## 📂 Structure du projet

```
client/
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── robots.txt
├── src/
│   ├── assets/           # Images et ressources
│   ├── components/       # Composants réutilisables
│   │   ├── Navbar.js
│   │   ├── Footer.js
│   │   ├── Chatbot.js
│   │   └── PropertyCarousel.js
│   ├── pages/           # Pages de l'application
│   │   ├── Home.js
│   │   ├── Properties.js
│   │   ├── CreditSimulation.js
│   │   ├── Dashboard.js
│   │   ├── Login.js
│   │   └── Profile.js
│   ├── styles/          # Fichiers CSS
│   ├── App.js           # Composant principal
│   └── index.js         # Point d'entrée
└── package.json
```

## 🎨 Fonctionnalités

### 1. Page d'accueil
- Présentation des services BH Marketplace
- Carrousel de biens immobiliers à la une
- Accès rapide aux fonctionnalités principales

### 2. Simulation de crédit
- Formulaire en 3 étapes
- Calcul automatique des mensualités
- Téléchargement de la simulation

### 3. Tableaux de bord analytiques
- KPI en temps réel (visiteurs, consultations, demandes de crédit)
- Graphiques d'évolution du trafic
- Répartition par type de bien
- Taux de simulation de crédit

### 4. Chatbot intelligent
- Assistant virtuel pour accompagner les utilisateurs
- Réponses en temps réel
- Interface intuitive

## 👥 Auteurs

- Bilel Khiyari - bilel.khiyari@isgb.ucar.tn
- Khemiri Iheb - khemiriiheb40@gmail.com

## 📞 Contact

- Téléphone: 96 128 401 / 58 407 459
- Email: bilel.khiyari@isgb.ucar.tn / khemiriiheb40@gmail.com

## 📄 Licence

© 2024 BH Bank - Marketplace Immobilière. Tous droits réservés.


### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
