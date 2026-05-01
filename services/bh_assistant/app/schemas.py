from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=2000)


class ChatContext(BaseModel):
    page: Optional[str] = Field(default=None, max_length=200)
    propertyId: Optional[str] = Field(default=None, max_length=120)
    clientCity: Optional[str] = Field(default=None, max_length=120)
    clientAddress: Optional[str] = Field(default=None, max_length=255)
    location: Optional[dict] = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000)
    history: List[ChatMessage] = Field(default_factory=list, max_length=20)
    context: ChatContext = Field(default_factory=ChatContext)


class ChatResponse(BaseModel):
    reply: str
    suggestions: List[str] = Field(default_factory=list)
    handoff: bool = False


class CreditScoringRequest(BaseModel):
    revenu_annuel: float = Field(..., gt=0, description="Revenu annuel du client")
    charges_impayees: float = Field(
        default=0,
        ge=0,
        description="Total annuel des charges a payer ou impayees",
    )
    situation_familiale: str = Field(..., min_length=2, max_length=80)
    situation_contractuelle: str = Field(..., min_length=2, max_length=80)


class CreditCriterionResult(BaseModel):
    nom: str
    valide: bool
    score: int = Field(..., ge=0, le=100)
    message: str


class CreditScoringResponse(BaseModel):
    decision: Literal["ACCEPTE", "REFUSE"]
    score: int = Field(..., ge=0, le=100)
    niveau_risque: Literal["faible", "moyen", "eleve"]
    formule: str
    taux_charges: float
    plafond_charges: float
    reste_apres_charges: float
    criteres: List[CreditCriterionResult]
    resume: str
    recommandation: str
