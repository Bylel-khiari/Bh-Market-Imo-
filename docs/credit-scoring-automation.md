# Système Automatisé de Scoring et Validation de Crédit

## Vue d'ensemble

Ce système automatise le processus de scoring et de validation des demandes de crédit habitat. Lorsqu'un client soumet une demande, le système :

1. **Accepte la demande** du client
2. **Appelle automatiquement l'agent de scoring** pour évaluer le dossier
3. **Reçoit le score de crédit** et le risque associé
4. **L'agent bancaire valide ou refuse** la demande en fonction du score

## Architecture

### Composants

```
Client Frontend (CreditSimulation/CreditImmobilierBHPortal)
        ↓
   Node.js Server
        ↓
   Credit Scoring Service
        ↓
   Python Assistant API (/credit-scoring endpoint)
        ↓
   Credit Scoring Engine
        ↓
   Returns: score, decision, risk_level
```

## Flux de Traitement

### 1. Soumission de la Demande
Le client remplit le formulaire de demande de crédit avec les informations suivantes :
- Données personnelles (nom, email, téléphone, CIN, RIB)
- Données financières (revenu brut, mensualité estimée, durée)
- Situation professionnelle (catégorie socioprofessionnelle)
- Documents requis (formulaire BH, pièce d'identité, preuves de revenus, etc.)

### 2. Calcul du Score Automatique
Le service `creditScoringService.js` effectue les étapes suivantes :

#### a. Préparation des données
```javascript
{
  revenu_annuel: Number (calculé depuis grossIncome + incomePeriod)
  charges_impayees: Number (estimatedMonthlyPayment * 12)
  situation_familiale: String (défaut: "célibataire")
  situation_contractuelle: String (dérivée de socioCategory)
}
```

#### b. Appel à l'API de Scoring Python
- Envoie les données au service Python (http://localhost:8000/credit-scoring)
- Reçoit le résultat avec score, décision et critères d'évaluation

#### c. Critères d'Évaluation
Le scoring évalue trois critères principaux :

1. **Capacité de Remboursement**
   - Formule : `charges_impayées ≤ revenu_annuel × 0.40`
   - Score : 40-60 points
   - Messages : Charges conformes / Charges trop élevées

2. **Situation Contractuelle**
   - Fonctionnaire/Titulaire : 25 points (très stable)
   - CDI : 25 points (stable)
   - Retraite : 18 points (régulier)
   - Profession libérale : 18 points
   - Indépendant : 16 points
   - CDD : 12 points (avec vigilance)
   - Stage : 4 points (fragile)
   - Sans emploi : 0 points

3. **Situation Familiale**
   - Célibataire : 15 points
   - Marié sans enfant : 15 points
   - Marié avec enfant : 11 points
   - Divorcé/Veuf : 10 points

### 3. Décision Automatique
Le système détermine automatiquement le statut de la demande :

#### Si Score ≥ 60 ET Critères valides : **ACCEPTÉ**
- Statut : ACCEPTE
- Message : "Félicitations! Votre demande de crédit a été ACCEPTÉE."
- Agent bancaire peut procéder à l'étude approfondie

#### Si Score < 60 OU Critères non valides : **REFUSÉ**
- Statut : REFUSE
- Message : "Votre demande de crédit a été REFUSÉE."
- Client peut contacterle conseiller pour discuter des options

#### En cas d'erreur de scoring : **EN ATTENTE DE RÉVISION**
- Statut : EN_VERIFICATION
- Un agent bancaire révisera manuellement

### 4. Niveau de Risque
Le système détermine aussi le niveau de risque du crédit :

- **Faible risque** : Score ≥ 80
- **Risque moyen** : Score 60-79
- **Risque élevé** : Score < 60

## Fichiers Modifiés

### 1. `services/creditScoringService.js` (NOUVEAU)
**Responsabilités :**
- Appeler l'API Python de scoring
- Préparer les données pour le scoring
- Transformer les résultats en décision de crédit
- Générer les messages français

**Fonctions principales :**
- `scoreCreditApplication()` : Effectue l'évaluation
- `determineApplicationStatus()` : Détermine le statut final
- `generateScoringDecision()` : Génère le message de décision

### 2. `controllers/creditApplicationController.js` (MODIFIÉ)
**Changements :**
- Appel au service de scoring lors de la soumission
- Passage des résultats au modèle
- Gestion des erreurs de scoring (continue même en cas d'erreur)

### 3. `models/creditApplicationModel.js` (MODIFIÉ)
**Changements :**
- Paramètres supplémentaires : `complianceScore`, `complianceSummary`, `initialStatus`, `scoringResult`
- Insertion des scores et résumé dans la base de données
- Utilisation du statut initial au lieu du statut "SOUMIS" par défaut

### 4. `views/creditApplicationView.js` (MODIFIÉ)
**Changements :**
- Messages d'état en français
- Affichage du résultat du scoring au client
- Feedback détaillé sur le score obtenu

## Format de Réponse API

### Soumission de Demande (POST /api/credit-applications)

**Réponse en cas d'acceptation automatique :**
```json
{
  "message": "Votre demande de crédit a été acceptée automatiquement!",
  "statusMessage": "✓ Félicitations! Votre demande de crédit a été ACCEPTÉE.",
  "scoring": {
    "score": 75,
    "level": "Excellent",
    "summary": "Dossier accepté avec un score de 75/100..."
  },
  "application": {
    "id": 123,
    "status": "ACCEPTE",
    "compliance_score": 75,
    "compliance_summary": "...",
    ...
  }
}
```

**Réponse en cas de refus automatique :**
```json
{
  "message": "Votre demande de crédit a été refusée automatiquement après évaluation.",
  "statusMessage": "✗ Malheureusement, votre demande de crédit a été REFUSÉE.",
  "scoring": {
    "score": 45,
    "level": "À revoir",
    "summary": "Dossier refusé avec un score de 45/100..."
  },
  "application": {
    "id": 124,
    "status": "REFUSE",
    "compliance_score": 45,
    "compliance_summary": "...",
    ...
  }
}
```

## Configuration

### Variables d'Environnement
- `BH_ASSISTANT_API_URL` : URL de l'API Python (défaut : `http://localhost:8000`)

### Python Service Endpoints
- `POST /credit-scoring` : Calcule le score de crédit

### Node.js Service Endpoints
- `POST /api/credit-applications` : Soumet une demande (avec scoring automatique)
- `GET /api/client/credit-applications` : Liste les demandes du client
- `GET /api/agent/credit-applications` : Liste les demandes (pour l'agent)
- `PATCH /api/agent/credit-applications/:id` : Met à jour une demande

## Exemple d'Utilisation

### Soumission d'une Demande
```bash
POST /api/credit-applications HTTP/1.1
Authorization: Bearer {token}
Content-Type: application/json

{
  "full_name": "Ahmed Belaid",
  "email": "ahmed@example.com",
  "phone": "21650123456",
  "cin": "07534621",
  "rib": "1234567890",
  "gross_income": 2500,
  "income_period": "monthly",
  "estimated_monthly_payment": 1200,
  "socio_category": "salarie",
  "duration_months": 240,
  "funding_type": "acquisition",
  "documents": [...]
}
```

### Réponse
```json
{
  "message": "Votre demande de crédit a été acceptée automatiquement!",
  "statusMessage": "✓ Félicitations! Votre demande de crédit a été ACCEPTÉE.",
  "scoring": {
    "score": 78,
    "level": "Excellent",
    "summary": "Dossier accepté avec un score de 78/100..."
  },
  "application": {
    "id": 125,
    "status": "ACCEPTE",
    "compliance_score": 78,
    ...
  }
}
```

## Messages pour le Client

### Messages d'État (en français)

| Statut | Message |
|--------|---------|
| SOUMIS | Votre demande a été reçue et sera examinée par notre équipe bancaire. |
| EN_VERIFICATION | Votre demande est en cours de vérification par notre agent de scoring. |
| EN_ETUDE | Votre demande est en étude approfondie par notre équipe bancaire. |
| DOCUMENTS_MANQUANTS | Nous avons besoin de documents supplémentaires pour traiter votre demande. |
| ACCEPTE | ✓ Félicitations! Votre demande de crédit a été ACCEPTÉE. |
| REFUSE | ✗ Malheureusement, votre demande de crédit a été REFUSÉE. |

## Gestion des Erreurs

### Erreur de Scoring
- Statut : EN_VERIFICATION
- La demande est sauvegardée sans score automatique
- Un agent bancaire révisera manuellement

### Données Invalides
- Le système valide les données avant le scoring
- Messages d'erreur en français fournis au client

## Améliorations Futures

1. **Collecte d'informations supplémentaires** : Ajouter des champs pour la situation familiale exacte
2. **Scoring avancé** : Intégrer des modèles ML pour un scoring plus sophistiqué
3. **Notifications** : Envoyer des emails en français au client après le scoring
4. **Appels API** : Intégrer avec d'autres services bancaires pour la vérification
5. **Dashboard** : Afficher les stats de scoring et les tendances pour les agents

## Schéma de Base de Données

Les champs suivants sont utilisés pour le scoring :

```sql
ALTER TABLE credit_applications ADD COLUMN (
  compliance_score TINYINT UNSIGNED NULL,
  compliance_summary TEXT NULL
);
```

Ces champs sont déjà présents dans le schéma existant.

---

**Version** : 1.0  
**Date** : Mai 2026  
**Langue** : Français  
**Auteur** : Système BH Market
