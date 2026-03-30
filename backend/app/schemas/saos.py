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

class SaosSearchParams(BaseModel):
    keywords: Optional[str] = None
    court_type: Optional[str] = None
    judgment_date_from: Optional[str] = None
    judgment_date_to: Optional[str] = None
    page_number: int = 0
    page_size: int = 20
