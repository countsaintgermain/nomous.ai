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
