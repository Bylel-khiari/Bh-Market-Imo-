# BH Assistant

## Architecture

BH Assistant est composé de trois couches :

- `apps/client` : widget React flottant qui appelle uniquement le backend Node.
- `apps/server` : route Express `POST /api/assistant/chat`, validation Zod, proxy vers le service Python.
- `services/bh_assistant` : microservice FastAPI isolé avec moteur rule-based et fallback sans LLM.

Le frontend ne contacte jamais un fournisseur LLM directement. Le backend utilise `ASSISTANT_SERVICE_URL` pour joindre le microservice.

## Lancer le service Python

```bash
cd services/bh_assistant
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Sous Windows :

```powershell
cd services\bh_assistant
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

## Lancer le backend

```bash
cd apps/server
npm install
npm run dev
```

## Lancer le frontend

```bash
cd apps/client
npm install
npm start
```

## Variables d'environnement

Backend Node :

```env
ASSISTANT_SERVICE_URL=http://localhost:8001
ASSISTANT_PROXY_TIMEOUT_MS=5000
```

Service Python :

```env
BH_ASSISTANT_LLM_ENABLED=false
BH_ASSISTANT_PROVIDER=rules
BH_ASSISTANT_MODEL=
BH_ASSISTANT_API_KEY=
```

## Endpoints

Python :

- `GET /health` retourne `{ "status": "ok", "service": "bh-assistant" }`
- `POST /chat` retourne `{ "reply": "string", "suggestions": ["string"], "handoff": false }`

Node :

- `POST /api/assistant/chat`

## Fallback sans LLM

Le service Python utilise un moteur à mots-clés pour répondre en français sur la recherche de biens, achat, vente, location, simulation crédit, documents, contact agent et étapes du crédit. Il n'invente pas de taux, mensualités ou conditions bancaires exactes : il renvoie vers une simulation ou un conseiller BH.

Le backend Node appelle toujours le service Python en priorité. Si le microservice Python est arrêté ou inaccessible en développement, le backend renvoie un fallback rule-based minimal pour éviter un widget inutilisable côté client.

## Actions et recommandations

La route Node enrichit la réponse avec des champs optionnels :

- `actions` : boutons de navigation vers les pages utiles (`/properties`, `/credit-simulation`, `/credit-immobilier-bh`, `/contact`).
- `recommendations` : biens immobiliers issus de `properties`, filtrés en priorité par ville détectée.
- `needsLocation` : indique au widget qu'il peut proposer au client d'utiliser sa position navigateur.

La recommandation locale ne calcule pas encore une distance bien-par-bien car la table `properties` ne contient pas de latitude/longitude pour chaque annonce. Le widget approxime la ville du client avec la géolocalisation navigateur et les centres des gouvernorats tunisiens, puis le backend recommande les biens dont `city` ou `location_raw` correspond le mieux à cette zone.

Un LLM pourra être branché plus tard dans `services/bh_assistant/app/assistant_service.py` via les variables `BH_ASSISTANT_LLM_ENABLED`, `BH_ASSISTANT_PROVIDER`, `BH_ASSISTANT_MODEL` et `BH_ASSISTANT_API_KEY`, sans modifier le frontend.
