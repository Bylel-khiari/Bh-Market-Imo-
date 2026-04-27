import logging

from fastapi import FastAPI

from .assistant_service import generate_reply
from .knowledge_base import DEFAULT_SUGGESTIONS
from .schemas import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)

app = FastAPI(title="BH Assistant", version="0.1.0")


def _model_to_dict(value):
    if hasattr(value, "model_dump"):
        return value.model_dump()

    if hasattr(value, "dict"):
        return value.dict()

    return value


@app.get("/health")
def health():
    return {"status": "ok", "service": "bh-assistant"}


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    try:
        result = generate_reply(
            request.message,
            [_model_to_dict(item) for item in request.history],
            _model_to_dict(request.context),
        )
        return ChatResponse(**result)
    except Exception:
        logger.exception("BH Assistant failed to generate a reply")
        return ChatResponse(
            reply=(
                "Désolé, l'assistant est momentanément indisponible. "
                "Vous pouvez laisser votre question ou contacter notre équipe."
            ),
            suggestions=DEFAULT_SUGGESTIONS,
            handoff=True,
        )

