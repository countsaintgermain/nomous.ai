from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.case import Case
from app.schemas.chat import ChatRequest, ChatMessage as ChatMsgSchema, ChatHistoryResponse
from app.services.chat_service import get_rag_chain_for_case, get_session_history

router = APIRouter(redirect_slashes=False)
CURRENT_USER_ID = 1

@router.post("", summary="Chat with Case Documents")
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

    session_id = request.session_id or f"case_{request.case_id}"

    # Inicjujemy łańcuch (teraz zwraca funkcję async wrapper)
    agent_with_context = get_rag_chain_for_case(case.id)
    
    # Zamieniamy prompt na stream generator (Vercel AI oczekuje Data Stream Protocol)
    import json
    async def generate_response():
        print(f"Nomous.ia: Rozpoczynam generowanie dla pytania: {last_user_message} (Session: {session_id})")
        try:
            config = {"configurable": {"session_id": session_id}}
            # AgentExecutor zwraca słownik z kluczem 'output'
            response = await agent_with_context({"input": last_user_message}, config=config)
            output = response.get("output", "")
            
            # Jeśli output jest pusty a są pośrednie kroki (choć wyłączyliśmy return_intermediate_steps)
            if not output and "intermediate_steps" in response:
                output = "Przeanalizowałem orzecznictwo SAOS. Co dokładnie Cię interesuje?"

            yield f'0:{json.dumps(output)}\n'
        except Exception as e:
            print(f"Nomous.ia: BŁĄD GENERATORA: {e}")
            import traceback
            print(traceback.format_exc())
            yield f'3:{json.dumps(str(e))}\n' # Error stream
                
    return StreamingResponse(
        generate_response(), 
        media_type="text/plain",
        headers={
            "X-Vercel-AI-Data-Stream": "v1",
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@router.get("/{case_id}/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    case_id: int,
    session_id: str = None,
    db: Session = Depends(get_db)
):
    # Weryfikacja dostępu
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == CURRENT_USER_ID).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found or unauthorized")
    
    sid = session_id or f"case_{case_id}"
    history = get_session_history(sid)
    
    # Konwersja langchain messages na nasz schemat
    messages = []
    for msg in history.messages:
        role = "user" if msg.type == "human" else "assistant"
        messages.append(ChatMsgSchema(role=role, content=msg.content))
        
    return ChatHistoryResponse(messages=messages)
