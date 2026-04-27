import os

from .knowledge_base import DEFAULT_SUGGESTIONS, detect_intent, get_response_for_intent


def _llm_enabled():
    return os.getenv("BH_ASSISTANT_LLM_ENABLED", "false").strip().lower() in {"1", "true", "yes"}


def _normalize_history(history):
    if not history:
        return []

    normalized = []
    for item in history[-20:]:
        role = item.get("role") if isinstance(item, dict) else getattr(item, "role", None)
        content = item.get("content") if isinstance(item, dict) else getattr(item, "content", None)
        if role in {"user", "assistant"} and content:
            normalized.append({"role": role, "content": str(content)})

    return normalized


def _context_note(context):
    context = context or {}
    property_id = context.get("propertyId")

    if property_id:
        return (
            "\n\nSi votre question concerne le bien affiché, mentionnez sa référence lors de la prise "
            "de contact pour faciliter le suivi."
        )

    return ""


def _clarification_reply(message):
    return (
        "Je peux vous aider sur la recherche de biens, l'achat, la vente, la location, "
        "la simulation de crédit immobilier BH ou la préparation des documents. "
        "Pouvez-vous préciser votre besoin ?"
    )


def generate_reply(message, history=None, context=None):
    """Generate a French assistant response using deterministic rules by default."""
    cleaned_message = (message or "").strip()
    _normalize_history(history)

    if not cleaned_message:
        return {
            "reply": _clarification_reply(cleaned_message),
            "suggestions": DEFAULT_SUGGESTIONS,
            "handoff": False,
        }

    if _llm_enabled():
        # Placeholder for a future provider. The rule-based engine remains the default
        # so the service works without any LLM key or network dependency.
        pass

    intent_name = detect_intent(cleaned_message)
    intent_response = get_response_for_intent(intent_name) if intent_name else None

    if intent_response:
        return {
            "reply": f"{intent_response['reply']}{_context_note(context)}",
            "suggestions": intent_response["suggestions"],
            "handoff": bool(intent_response.get("handoff", False)),
        }

    return {
        "reply": _clarification_reply(cleaned_message),
        "suggestions": DEFAULT_SUGGESTIONS,
        "handoff": False,
    }
