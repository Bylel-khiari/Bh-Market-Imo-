# BH Assistant

Microservice FastAPI isole pour l'assistant client BH Market Imo.

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
- `POST /credit-scoring`

## Agent de scoring credit

Le endpoint `POST /credit-scoring` calcule une decision explicable a partir des criteres donnes :

- revenu annuel
- charges annuelles a payer ou impayees
- situation familiale
- situation contractuelle

Regle principale :

```text
charges_impayees <= revenu_annuel * 0.40
```

Exemple :

```bash
curl -X POST http://localhost:8001/credit-scoring \
  -H "Content-Type: application/json" \
  -d '{
    "revenu_annuel": 60000,
    "charges_impayees": 18000,
    "situation_familiale": "marie",
    "situation_contractuelle": "CDI"
  }'
```

Reponse simplifiee :

```json
{
  "decision": "ACCEPTE",
  "score": 83,
  "niveau_risque": "faible",
  "formule": "charges_impayees <= revenu_annuel * 0.40"
}
```

Le moteur par defaut est rule-based et fonctionne sans cle LLM. Un provider LLM pourra etre branche plus tard via variables d'environnement, sans changer le frontend.
