# BH Assistant

Microservice FastAPI isolé pour l'assistant client BH Market Imo.

## Lancer en local

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

## Endpoints

- `GET /health`
- `POST /chat`

Le moteur par défaut est rule-based et fonctionne sans clé LLM. Un provider LLM pourra être branché plus tard via variables d'environnement, sans changer le frontend.

