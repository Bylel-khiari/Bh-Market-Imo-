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
