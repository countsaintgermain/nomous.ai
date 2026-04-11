import asyncio
import os
import sys
from dotenv import load_dotenv

# Dodaj ścieżkę do modułów aplikacji
sys.path.append(os.getcwd())

# Wymuś załadowanie .env dla testu jeśli nie jest w kontenerze
load_dotenv()

from app.services.saos_ai_client import saos_ai_client

async def run_test():
    print("--- SAOS-AI API Integration Test ---")
    print(f"Testing URL: {os.getenv('SAOS_AI_URL')}")
    
    # 1. Test wektoryzacji (używamy encode/document zgodnie z docs v5.0)
    print("\n1. Testing encode/document (text mode)...")
    vector = await saos_ai_client.encode_text("testowe zapytanie prawne")
    if vector and isinstance(vector, list):
        print(f"   [SUCCESS] Received vector of length: {len(vector)}")
    else:
        print(f"   [FAILED] Could not get vector. Result: {vector}")

    # 2. Test wyszukiwania z Rocchio (puste listy wektorów na start)
    print("\n2. Testing /v1/search (Semantic Search)...")
    results = await saos_ai_client.search_with_rocchio("kara umowna za opóźnienie", [], [], limit=3)
    if isinstance(results, list):
        print(f"   [SUCCESS] Received {len(results)} search results")
        for i, res in enumerate(results):
            print(f"      - Result {i+1}: SAOS ID {res.get('saos_id')}, Date: {res.get('judgment_date')}")
    else:
        print(f"   [FAILED] Could not get search results. Type: {type(results)}")

    # 3. Test Asystenta Chat
    print("\n3. Testing /chat (Relevant IDs)...")
    ids = await saos_ai_client.get_relevant_ids("Kiedy przedawnia się roszczenie o zapłatę?", limit=3)
    if isinstance(ids, list) and len(ids) > 0:
        print(f"   [SUCCESS] Received {len(ids)} relevant IDs: {ids}")
        
        # 4. Test Pobierania Hurtowego (Batch Get)
        print("\n4. Testing /v1/judgments/batch (Batch Get)...")
        judgments = await saos_ai_client.get_judgments_batch(ids)
        if isinstance(judgments, list) and len(judgments) > 0:
            print(f"   [SUCCESS] Received {len(judgments)} full judgments")
            for i, j in enumerate(judgments):
                print(f"      - Judgment {i+1}: SAOS ID {j.get('saos_id')}, Signatures: {j.get('signatures')}")
        else:
            print(f"   [FAILED] Could not get batch judgments.")
    else:
        print(f"   [FAILED] Could not get relevant IDs or list is empty.")

if __name__ == "__main__":
    asyncio.run(run_test())
