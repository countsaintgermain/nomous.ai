from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

# Schematy pomocnicze dla relacji
class CaseEntityOut(BaseModel):
    id: int
    pisp_id: Optional[int] = None
    role: Optional[str] = None
    name: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None
    has_access: Optional[str] = None
    created_date: datetime
    class Config: from_attributes = True

class CaseActivityOut(BaseModel):
    id: int
    pisp_id: Optional[int] = None
    date: Optional[str] = None
    signature: Optional[str] = None
    activity: Optional[str] = None
    submitted_by: Optional[str] = None
    # Czynności z PISP nie mają created_date w bazie, ale możemy dodać dla spójności jeśli model by to miał
    class Config: from_attributes = True

class CaseHearingOut(BaseModel):
    id: int
    pisp_id: Optional[int] = None
    date: Optional[str] = None
    room: Optional[str] = None
    judge: Optional[str] = None
    result: Optional[str] = None
    signature: Optional[str] = None
    class Config: from_attributes = True

class CaseRelationOut(BaseModel):
    id: int
    pisp_id: Optional[int] = None
    signature: Optional[str] = None
    relation_type: Optional[str] = None
    authority: Optional[str] = None
    judge: Optional[str] = None
    receipt_date: Optional[str] = None
    decission_date: Optional[str] = None
    result: Optional[str] = None
    external_id: Optional[str] = None
    class Config: from_attributes = True

class DocumentOut(BaseModel):
    id: int
    pisp_id: Optional[int] = None
    filename: str
    document_name: Optional[str] = None
    tag: Optional[str] = None
    status: str
    created_date: datetime
    document_date: Optional[datetime] = None # Merytoryczna data
    suggested_facts: Optional[List[str]] = None
    has_source: bool = False
    has_pdf: bool = False
    class Config: from_attributes = True

class CaseBase(BaseModel):
    title: str
    description: Optional[str] = None
    signature: Optional[str] = None
    court: Optional[str] = None
    department: Optional[str] = None
    receipt_date: Optional[str] = None
    conclusion_date: Optional[str] = None
    publication_date: Optional[str] = None
    case_subject: Optional[str] = None
    referent: Optional[str] = None
    claim_value: Optional[str] = None
    resolution: Optional[str] = None
    main_entities: Optional[str] = None

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
    created_date: datetime
    updated_at: Optional[datetime]
    
    entities: List[CaseEntityOut] = []
    activities: List[CaseActivityOut] = []
    hearings: List[CaseHearingOut] = []
    documents: List[DocumentOut] = []
    relations: List[CaseRelationOut] = []

    class Config:
        from_attributes = True
