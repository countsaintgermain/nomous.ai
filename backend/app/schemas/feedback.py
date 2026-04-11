from pydantic import BaseModel
from typing import Optional, Literal

class RelevanceFeedbackCreate(BaseModel):
    case_id: int
    document_id: Optional[int] = None
    saos_id: Optional[int] = None
    vote: Literal["up", "down", "none"]

class RelevanceFeedbackOut(BaseModel):
    id: int
    case_id: int
    document_id: Optional[int]
    saos_id: Optional[int]
    is_positive: bool

    class Config:
        from_attributes = True
