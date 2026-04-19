from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime
from app.models.saos import JudgmentSource

class SavedJudgmentBase(BaseModel):
    saos_id: int
    signature: Optional[str] = None
    judgment_date: Optional[str] = None
    court_name: Optional[str] = None
    court_type: Optional[str] = None
    judgment_type: Optional[str] = None
    division_name: Optional[str] = None
    judges: Optional[List[Any]] = None
    content: Optional[str] = None
    summary: Optional[str] = None
    source: JudgmentSource = JudgmentSource.MANUAL

class SavedJudgmentCreate(SavedJudgmentBase):
    case_id: int

class SavedJudgmentOut(SavedJudgmentBase):
    id: int
    case_id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class DetailsBySignaturesRequest(BaseModel):
    signatures: List[str]

class ExtractQuotesRequest(BaseModel):
    query: str
    text: str

class AutoSaosSearchRequest(BaseModel):
    remarks: Optional[str] = None
    prompts: Optional[List[str]] = None

class AutoSaosSearchResponse(BaseModel):
    prompts: List[str]
    results: List[Any]
    task_id: Optional[str] = None

class AutoSaosTaskStatus(BaseModel):
    status: str
    progress: int
    current_query: Optional[str] = None
    results: List[Any]

class FullDocSearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 10
    use_rerank: Optional[bool] = False

