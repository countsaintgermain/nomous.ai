import asyncio
import os
from app.services.chat_service import get_rag_chain_for_case
from dotenv import load_dotenv

load_dotenv()

async def test_chat():
    print("Nomous.ia: Inicjalizacja testu czatu...")
    case_id = 1
    agent_stream = get_rag_chain_for_case(case_id)
    
    print(f"Nomous.ia: Zadaję pytanie dla sprawy {case_id}...")
    try:
        # Nasz nowy wrapper zwraca AsyncGenerator[str, None]
        async for token in agent_stream({"input": "O czym jest ta sprawa?"}, config={"configurable": {"session_id": "test_session"}}):
            print(token, end="", flush=True)
        print("\n\nTest zakończony sukcesem.")
    except Exception as e:
        print(f"\nBŁĄD: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_chat())
