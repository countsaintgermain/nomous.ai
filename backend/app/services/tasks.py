import os
import json
from datetime import datetime
from dotenv import load_dotenv
from google import genai
from google.genai import types

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
2. STRESZCZENIE: Zwięzłe (2-3 zdania), konkretne fakty.
3. OSOBY: Wszystkie imiona i nazwiska (oskarżeni, świadkowie, sędziowie).
4. DATY: Wszystkie daty zdarzeń i terminów.
5. KWOTY I KARY: Wyodrębnij precyzyjnie wymierzone kary, kwoty pieniężne, koszty sądowe i opłaty.
6. FAKTY: 3-5 kluczowych twierdzeń do bazy faktów.
7. DATA DOKUMENTU: Data wydania/sporządzenia w formacie YYYY-MM-DD.

ZWRÓĆ WYŁĄCZNIE CZYSTY JSON:
{ 
    "extracted_text": "...",
    "summary": "...", 
    "entities": { 
        "osoby": [], 
        "daty": [], 
        "kwoty": [],
        "kary": []
    },
    "suggested_facts": [],
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
            
            document_part = types.Part.from_bytes(data=doc_bytes, mime_type=mime_type)
            
            print(f"Nomous.ia: WYWOŁANIE MODELU: {analytical_model} dla dokumentu {analysis_path}...")
            
            response = client.models.generate_content(
                model=analytical_model,
                contents=[prompt, document_part],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.0
                )
            )
            print(f"Nomous.ia: ODPOWIEDŹ OTRZYMANA z modelu {analytical_model}")
            
            clean_res = response.text.replace("```json", "").replace("```", "").strip()
            analysis_data = json.loads(clean_res)
            
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
