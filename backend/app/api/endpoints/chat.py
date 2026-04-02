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

    # Inicjujemy agenta (teraz zwraca async generator)
    agent_stream_wrapper = get_rag_chain_for_case(case.id)
    
    import json
    async def generate_response():
        try:
            config = {"configurable": {"session_id": session_id}}
            
            # Iterujemy po tokenach generowanych przez LangGraph
            async for token in agent_stream_wrapper({"input": last_user_message}, config=config):
                # Vercel AI SDK Data Stream Protocol: 0:"text"\n
                yield f'0:{json.dumps(token)}\n'
                
        except Exception as e:
            import traceback
            logger.error(f"Chat error: {e}")
            logger.error(traceback.format_exc())
            yield f'3:{json.dumps(str(e))}\n'
                
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
        content = msg.content
        if isinstance(content, list):
            # Wyciągamy tekst z bloków (format OpenAI/LangChain)
            text_blocks = []
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    text_blocks.append(block.get("text", ""))
                elif isinstance(block, str):
                    text_blocks.append(block)
            content = "\n".join(text_blocks)
            
        messages.append(ChatMsgSchema(role=role, content=content))
        
    return ChatHistoryResponse(messages=messages)
