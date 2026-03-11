from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CaseBase(BaseModel):
    title: str
    description: Optional[str] = None
    signature: Optional[str] = None

class CaseCreate(CaseBase):
    pass

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    signature: Optional[str] = None
    status: Optional[str] = None

class CaseOut(CaseBase):
    id: int
    user_id: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
