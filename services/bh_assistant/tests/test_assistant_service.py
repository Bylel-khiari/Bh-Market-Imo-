import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.assistant_service import generate_reply  # noqa: E402


def test_credit_simulation_reply_mentions_advisor_for_exact_conditions():
    response = generate_reply("Comment faire une simulation crédit ?", [], {})

    assert "simulation" in response["reply"].lower()
    assert "conseiller" in response["reply"].lower()
    assert response["handoff"] is False


def test_documents_intent_returns_document_guidance():
    response = generate_reply("Quels documents pour un crédit immobilier ?", [], {})

    assert "pièce" in response["reply"].lower() or "documents" in response["reply"].lower()
    assert "Simulation crédit" in response["suggestions"]


def test_unknown_intent_asks_for_clarification():
    response = generate_reply("Bonjour, pouvez-vous m'aider ?", [], {})

    assert "préciser" in response["reply"].lower()
    assert response["suggestions"]
    assert response["handoff"] is False

