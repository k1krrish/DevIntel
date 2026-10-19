from pydantic import BaseModel, HttpUrl, Field
from datetime import datetime
from typing import Optional, List, Dict, Any
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
    sources: List[dict]

class GenerateCodeRequest(BaseModel):
    prompt: str
    task_type: Optional[str] = "custom" # "test", "endpoint", "refactor", "types", "docs", "custom"
    target_file: Optional[str] = None

class GenerateCodeResponse(BaseModel):
    generated_code: str
    explanation: str
    relevant_files: List[str]

class ExplainCodeRequest(BaseModel):
    file_path: str
    code_snippet: Optional[str] = None
    detail_level: Optional[str] = "comprehensive"

class ExplainCodeResponse(BaseModel):
    summary: str
    logic_breakdown: str
    complexity: str
    security_notes: str
    suggested_docs: str
