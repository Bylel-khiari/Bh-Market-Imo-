import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402
from app.credit_scoring import score_credit_application  # noqa: E402
from app.main import app  # noqa: E402
from app.schemas import CreditScoringRequest  # noqa: E402


def test_credit_scoring_accepts_compliant_stable_profile():
    request = CreditScoringRequest(
        revenu_annuel=60000,
        charges_impayees=18000,
        situation_familiale="marie",
        situation_contractuelle="CDI",
    )

    result = score_credit_application(request)

    assert result["decision"] == "ACCEPTE"
    assert result["score"] >= 60
    assert result["taux_charges"] == 30
    assert result["plafond_charges"] == 24000


def test_credit_scoring_rejects_when_charges_exceed_40_percent():
    request = CreditScoringRequest(
        revenu_annuel=50000,
        charges_impayees=25000,
        situation_familiale="celibataire",
        situation_contractuelle="CDI",
    )

    result = score_credit_application(request)

    assert result["decision"] == "REFUSE"
    assert result["criteres"][0]["valide"] is False
    assert "40" in result["resume"]


def test_credit_scoring_rejects_unstable_contract_even_with_good_charges():
    request = CreditScoringRequest(
        revenu_annuel=70000,
        charges_impayees=10000,
        situation_familiale="marie",
        situation_contractuelle="sans contrat",
    )

    result = score_credit_application(request)

    assert result["decision"] == "REFUSE"
    assert result["criteres"][1]["valide"] is False


def test_credit_scoring_endpoint_returns_scoring_response():
    client = TestClient(app)

    response = client.post(
        "/credit-scoring",
        json={
            "revenu_annuel": 60000,
            "charges_impayees": 18000,
            "situation_familiale": "marie",
            "situation_contractuelle": "CDI",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["decision"] == "ACCEPTE"
    assert payload["formule"] == "charges_impayees <= revenu_annuel * 0.40"
    assert len(payload["criteres"]) == 3
