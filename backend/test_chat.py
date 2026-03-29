import asyncio
import os
from app.services.chat_service import get_rag_chain_for_case
from dotenv import load_dotenv

load_dotenv()

async def test_chat():
    print("Nomous.ia: Inicjalizacja testu czatu...")
    case_id = 1
    chain = get_rag_chain_for_case(case_id)
    
    print(f"Nomous.ia: Zadaję pytanie dla sprawy {case_id}...")
    try:
        async for chunk in chain.astream({"input": "O czym jest ta sprawa?"}):
            print(f"Chunk: {chunk}")
    except Exception as e:
        print(f"BŁĄD: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_chat())
