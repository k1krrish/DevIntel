from pydantic import BaseModel, HttpUrl, Field
from datetime import datetime
from typing import Optional
from app.models.repository import RepositoryStatus

class RepositoryCreate(BaseModel):
    github_url: HttpUrl = Field(..., description="The URL of the public GitHub repository")

class RepositoryResponse(BaseModel):
    id: int
    github_url: str
    name: str
    owner: str
    branch: str
    status: RepositoryStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    question: str

class ChatResponse(BaseModel):
    answer: str
    sources: list[dict]
