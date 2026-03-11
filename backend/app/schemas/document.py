from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class DocumentBase(BaseModel):
    filename: str
    file_type: str
    tag: str = "Dokument"

class DocumentCreate(DocumentBase):
    case_id: int

class DocumentOut(DocumentBase):
    id: int
    status: str
    s3_key: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

class CaseFactOut(BaseModel):
    id: int
    content: str
    metadata_json: Optional[dict]
    source_doc_id: Optional[int]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
