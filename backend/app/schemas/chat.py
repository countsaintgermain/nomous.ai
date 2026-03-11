from pydantic import BaseModel
from typing import List

class ChatMessage(BaseModel):
    role: str # "user" lub "assistant"
    content: str
    
class ChatRequest(BaseModel):
    case_id: int
    messages: List[ChatMessage] # Pełna historia powiadomień dla zachowania kontekstu chatu
    
class ChatResponse(BaseModel):
    answer: str
    # W Faza 2 możemy tu zwracać linki do dokumentow źródłowych
