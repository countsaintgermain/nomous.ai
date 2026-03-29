from pydantic import BaseModel
from typing import List, Optional

class ChatMessage(BaseModel):
    role: str # "user" lub "assistant"
    content: str
    
class ChatRequest(BaseModel):
    case_id: int
    messages: List[ChatMessage] 
    session_id: Optional[str] = None
    
class ChatResponse(BaseModel):
    answer: str

class ChatHistoryResponse(BaseModel):
    messages: List[ChatMessage]
