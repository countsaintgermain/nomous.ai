from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class DocumentBase(BaseModel):
    filename: str
    tag: Optional[str] = "Dokument"

class DocumentCreate(DocumentBase):
    pass

class DocumentUpdate(BaseModel):
    document_name: Optional[str] = None
    tag: Optional[str] = None
    document_date: Optional[datetime] = None

class DocumentOut(DocumentBase):
    id: int
    pisp_id: Optional[int] = None
    document_name: Optional[str] = None
    status: str
    created_date: datetime
    document_date: datetime
    summary: Optional[str] = None
    entities: Optional[Any] = None
    suggested_facts: Optional[List[str]] = None
    has_pdf: bool = False
    has_source: bool = False
    case_id: int

    class Config:
        from_attributes = True
