from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.case import Case
from app.schemas.chat import ChatRequest
from app.services.chat_service import get_rag_chain_for_case

router = APIRouter()
CURRENT_USER_ID = 1

@router.post("/", summary="Chat with Case Documents")
async def chat_with_case(
    request: ChatRequest,
    db: Session = Depends(get_db)
):
    # Weryfikacja
    case = db.query(Case).filter(Case.id == request.case_id, Case.user_id == CURRENT_USER_ID).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found or unauthorized")
        
    last_user_message = request.messages[-1].content if request.messages else ""
    if not last_user_message:
        raise HTTPException(status_code=400, detail="Empty message received")

    # Inicjujemy łańcuch
    rag_chain = get_rag_chain_for_case(case.id)
    
    # Zamieniamy prompt na stream generator (Vercel AI oczekuje Data Stream Protocol)
    import json
    async def generate_response():
        # Uzywamy astream dla strumieniowania asynchronicznego
        async for chunk in rag_chain.astream({"input": last_user_message}):
            if "answer" in chunk:
                # Zwracamy chunk sformatowany jako '0:"tekst"\n' zgodnie z Vercel AI SDK
                yield f'0:{json.dumps(chunk["answer"])}\n'
                
    return StreamingResponse(generate_response(), media_type="text/plain")
