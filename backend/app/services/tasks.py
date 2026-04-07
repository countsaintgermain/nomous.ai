import os
from google import genai
from google.genai import types
from app.core.worker import broker
from app.core.database import SessionLocal
from app.models.document import Document, DocumentChunk
from app.models.settings import AppSettings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

@broker.task
def process_document_ocr_task(doc_id: int):
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

        # Pobranie modelu z ustawień
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

        # Przesyłanie pliku jako inline data (bez zapisywania w chmurze Gemini przez File API)
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
            doc.content_extracted = extracted_text[:20000] if extracted_text else ""
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

        if not extracted_text.strip():
            print("Nomous.ia: Brak odczytanego tekstu z Gemini (może pusty dokument?)")

        # 2. Wektoryzacja (pgvector)
        if extracted_text.strip():
            try:
                embeddings_model = OpenAIEmbeddings(
                    model="text-embedding-3-small",
                    dimensions=768,
                    api_key=os.getenv("OPENAI_API_KEY")
                )
                
                text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
                chunks_text = text_splitter.split_text(extracted_text)
                
                if chunks_text:
                    embeddings = embeddings_model.embed_documents(chunks_text)
                    db_chunks = []
                    for text, embedding in zip(chunks_text, embeddings):
                        db_chunks.append(DocumentChunk(
                            document_id=doc.id,
                            content=text,
                            embedding=embedding
                        ))
                    db.add_all(db_chunks)

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
