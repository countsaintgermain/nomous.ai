import os
import json
import base64
from datetime import datetime
from dotenv import load_dotenv
from app.core.llm import get_llm
from langchain_core.messages import HumanMessage

from app.core.worker import broker
from app.core.database import SessionLocal
from app.models.document import Document
from app.models.embedding import Embedding
from app.models.settings import AppSettings
from app.models.saos import SavedJudgment
from app.services.saos_ai_client import saos_ai_client

load_dotenv()

@broker.task
async def process_document_embedding_task(doc_id: int):
    print(f"Nomous.ia: EMBEDDING TASK DLA DOC_ID: {doc_id}")
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc or not doc.content_extracted: return

        # Czyścimy stare chunki
        db.query(Embedding).filter(
            Embedding.entity_type == 'document',
            Embedding.entity_id == doc_id
        ).delete()

        response_data = await saos_ai_client.encode_document_full(doc.content_extracted)
        if response_data:
            if "document_vector" in response_data:
                doc.embedding = response_data["document_vector"]
            
            chunks_data = response_data.get("chunks", [])
            for chunk in chunks_data:
                db.add(Embedding(
                    case_id=doc.case_id,
                    entity_type='document',
                    entity_id=doc.id,
                    content=chunk.get("text", ""),
                    embedding=chunk.get("vector")
                ))
        
        db.commit()
    except Exception as e:
        print(f"Nomous.ia Embedding task error: {e}")
        db.rollback()
    finally:
        db.close()

@broker.task
async def process_judgment_embedding_task(saos_id: int, case_id: int):
    print(f"Nomous.ia: EMBEDDING TASK DLA SAOS_ID: {saos_id}")
    db = SessionLocal()
    try:
        judgment = db.query(SavedJudgment).filter(
            SavedJudgment.saos_id == saos_id,
            SavedJudgment.case_id == case_id
        ).first()

        content = ""
        if judgment and judgment.content:
            content = judgment.content
        else:
            # Pobieramy z batcha
            batch = await saos_ai_client.get_judgments_batch([saos_id])
            if batch:
                data = batch[0]
                content = data.get("text_content") or data.get("content") or ""
        
        if content:
            vector = await saos_ai_client.encode_text(content)
            if vector:
                if not judgment:
                    judgment = SavedJudgment(
                        saos_id=saos_id,
                        case_id=case_id,
                        content=content,
                        embedding=vector
                    )
                    db.add(judgment)
                else:
                    judgment.embedding = vector
                db.commit()
    except Exception as e:
        print(f"Nomous.ia Judgment embedding error: {e}")
        db.rollback()
    finally:
        db.close()

@broker.task
async def process_document_ocr_task(doc_id: int):
    print(f"Nomous.ia: ZADANIE PODJĘTE DLA ID: {doc_id}")
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc: return {"status": "error", "message": "Document not found"}

        analysis_path = doc.s3_key_pdf or doc.s3_key_source or doc.s3_key
        if not analysis_path or not os.path.exists(analysis_path):
            return {"status": "error", "message": f"Path missing: {analysis_path}"}

        doc.status = "processing"
        db.commit()

        app_settings = db.query(AppSettings).first()
        analytical_model = app_settings.analytical_model if app_settings else "gemini-3.1-flash-lite-preview"
        api_key = app_settings.api_key if app_settings and app_settings.api_key else os.getenv("GOOGLE_API_KEY")
        use_vertex = app_settings.use_vertex if app_settings else True

        print(f"Nomous.ia: Inicjalizacja Gemini Client. Model: {analytical_model}, Vertex: {use_vertex}")
        client = genai.Client(api_key=api_key, vertexai=use_vertex)

        prompt = """Wykonaj rygorystyczną analizę prawną załączonego dokumentu (niezależnie czy to skan, obraz czy natywny tekst).
            
ZADANIA:
1. PEŁNY TEKST (OCR/Parsowanie): Zwróć dosłownie pełny, odczytany tekst całego dokumentu od pierwszej do ostatniej strony. Nie streszczaj go w tym polu.
2. OPRACOWANIE (zwracane w polu 'summary'): Kompleksowe, profesjonalne omówienie dokumentu (1-3 akapity). Przedstaw dokładny stan faktyczny, główne roszczenia, tezy, dowody lub postanowienia. Zwróć szczególną uwagę na detale prawne istotne dla przebiegu sprawy, bez ucinania najważniejszego kontekstu.
3. OSOBY: Wszystkie imiona i nazwiska (oskarżeni, świadkowie, sędziowie, strony itp.) wraz z ich rolą w dokumencie.
4. DATY: Wszystkie istotne daty występujące w dokumencie (daty zdarzeń, terminy, daty rozpraw itp.) wraz z określeniem ich znaczenia.
5. KWOTY I KARY: Wyodrębnij precyzyjnie wymierzone kary, kwoty pieniężne, koszty sądowe i opłaty. ZWRÓĆ WYŁĄCZNIE jako płaską listę stringów.
6. AKTY PRAWNE: Wszystkie przywołane w tekście artykuły, ustawy, kodeksy oraz sygnatury innych orzeczeń sądowych.
7. FAKTY: 3-5 kluczowych twierdzeń do bazy faktów.
8. DATA DOKUMENTU: Data wydania/sporządzenia w formacie YYYY-MM-DD.

ZWRÓĆ WYŁĄCZNIE CZYSTY JSON ZGODNY Z PONIŻSZYM SCHEMATEM:
{ 
    "extracted_text": "pełny tekst dokumentu...",
    "summary": "opracowanie...", 
    "entities": { 
        "osoby": [
            { "podmiot": "Imię Nazwisko", "rola": "rola" }
        ], 
        "daty": [
            { "data": "YYYY-MM-DD", "znaczenie": "opis" }
        ], 
        "kwoty": ["string 1", "string 2"],
        "kary": ["string 1", "string 2"],
        "akty_prawne": ["Art. ...", "Sygn. ..."]
    },
    "suggested_facts": ["fakt 1", "fakt 2"],
    "document_date": "YYYY-MM-DD"
}"""

        try:
            with open(analysis_path, "rb") as f:
                doc_bytes = f.read()

            ext = analysis_path.lower().split('.')[-1]
            mime_type = "application/pdf"
            if ext in ['jpg', 'jpeg']:
                mime_type = "image/jpeg"
            elif ext == 'png':
                mime_type = "image/png"
            
            b64_data = base64.b64encode(doc_bytes).decode("utf-8")
            
            # Przygotowanie wiadomości LangChain
            message = HumanMessage(
                content=[
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url", # Używamy image_url dla obrazów i PDF w Gemini LangChain
                        "image_url": f"data:{mime_type};base64,{b64_data}"
                    }
                ]
            )

            max_retries = 3
            analysis_data = {}
            
            for attempt in range(max_retries):
                try:
                    llm = get_llm(db, model_type="analytical", json_mode=True)
                    print(f"Nomous.ia: WYWOŁANIE LANGCHAIN: dla dokumentu {analysis_path}...")
                    
                    response = llm.invoke([message])
                    content = response.content
                    
                    json_str = ""
                    if isinstance(content, str):
                        json_str = content.strip()
                    elif isinstance(content, list) and len(content) > 0:
                        item = content[0]
                        if isinstance(item, dict) and "text" in item:
                            json_str = item["text"].strip()

                    if json_str:
                        analysis_data = json.loads(json_str)
                        print(f"Nomous.ia: Pomyślnie otrzymano i sparsowano analizę LangChain")
                        break
                except Exception as e:
                    if "503" in str(e) and attempt < max_retries - 1:
                        print(f"Nomous.ia: Gemini 503 (próba {attempt+1}). Ponowienie...")
                        import asyncio
                        await asyncio.sleep(10)
                        continue
                    else:
                        print(f"Nomous.ia: Błąd LangChain OCR: {e}")
                        raise e

            extracted_text = analysis_data.get("extracted_text", "")
            doc.content_extracted = extracted_text if extracted_text else ""
            doc.summary = analysis_data.get("summary", "")
            doc.entities = analysis_data.get("entities", {})
            doc.suggested_facts = analysis_data.get("suggested_facts", [])
            
            if not doc.document_date and analysis_data.get("document_date"):
                try:
                    doc.document_date = datetime.strptime(analysis_data["document_date"], "%Y-%m-%d")
                except:
                    print(f"Nomous.ia: Nie udało się sparsować daty AI: {analysis_data['document_date']}")

        except Exception as e:
            print(f"Nomous.ia Gemini error: {e}")
            doc.summary = "Błąd analizy Gemini."
            doc.status = "error"
            db.commit()
            return

        # 2. Wektoryzacja (pgvector) przez saos-ai
        if extracted_text.strip():
            try:
                response_data = await saos_ai_client.encode_document_full(extracted_text)
                if response_data:
                    if "document_vector" in response_data:
                        doc.embedding = response_data["document_vector"]
                    
                    chunks_data = response_data.get("chunks", [])
                    for chunk in chunks_data:
                        db.add(Embedding(
                            case_id=doc.case_id,
                            entity_type='document',
                            entity_id=doc.id,
                            content=chunk.get("text", ""),
                            embedding=chunk.get("vector")
                        ))

                doc.status = "ready"
            except Exception as e:
                print(f"Nomous.ia Wektoryzacja error: {e}")
                doc.status = "error"
        else:
            doc.status = "ready"
            
        db.commit()
        print(f"Nomous.ia: ZADANIE ZAKOŃCZONE SUKCESEM DLA ID: {doc_id}")
    except Exception as e:
        db.rollback()
        if 'doc' in locals():
            doc.status = "error"
            db.commit()
        print(f"Nomous.ia Krytyczny błąd: {e}")
    finally:
        db.close()
