import os
from google import genai
from app.core.worker import broker
from app.core.database import SessionLocal
from app.models.document import Document
from pinecone import Pinecone, ServerlessSpec
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_core.documents import Document as LangchainDocument
from langchain_core.prompts import PromptTemplate
import pdfplumber
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

        extracted_text = ""
        is_pdf = analysis_path.lower().endswith(".pdf")
        
        if is_pdf:
            try:
                with pdfplumber.open(analysis_path) as pdf:
                    for page in pdf.pages:
                        text = page.extract_text()
                        if text: extracted_text += text + "\n"
            except Exception as e: print(f"Nomous.ia pdfplumber error: {e}")
        
        if not extracted_text.strip():
            try:
                from paddleocr import PaddleOCR
                ocr_local = PaddleOCR(use_angle_cls=True, lang='pl', show_log=False)
                result = ocr_local.ocr(analysis_path)
                if result and result[0]:
                    for line in result[0]: extracted_text += line[1][0] + "\n"
            except Exception as e: print(f"Nomous.ia PaddleOCR error: {e}")
        
        if not extracted_text.strip():
            doc.status = "error"
            db.commit()
            return

        doc.content_extracted = extracted_text[:20000]

        # 1. Analiza Gemini (Gemini 3 Pro)
        try:
            client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
            prompt = f"""
            Wykonaj rygorystyczną analizę prawną dokumentu procesowego.
            
            ZADANIA:
            1. STRESZCZENIE: Zwięzłe (2-3 zdania), konkretne fakty.
            2. OSOBY: Wszystkie imiona i nazwiska (oskarżeni, świadkowie, sędziowie).
            3. DATY: Wszystkie daty zdarzeń i terminów.
            4. KWOTY I KARY: Wyodrębnij precyzyjnie:
               - Wymierzone kary (np. grzywna, kara więzienia, zakazy).
               - Kwoty pieniężne (np. uszczuplenie podatku, odszkodowanie).
               - Koszty sądowe i opłaty.
            5. FAKTY: 3-5 kluczowych twierdzeń do bazy faktów.
            6. DATA DOKUMENTU: Data wydania/sporządzenia.
            
            ZWRÓC WYŁĄCZNIE CZYSTY JSON:
            {{ 
                "summary": "...", 
                "entities": {{ 
                    "osoby": [], 
                    "daty": [], 
                    "kwoty": [],
                    "kary": []
                }},
                "suggested_facts": [],
                "document_date": "YYYY-MM-DD"
            }}
            
            TEKST: {extracted_text[:15000]}
            """
            
            response = client.models.generate_content(model='gemini-3-pro-preview', contents=prompt)
            
            clean_res = response.text.replace("```json", "").replace("```", "").strip()
            analysis_data = json.loads(clean_res)
            
            doc.summary = analysis_data.get("summary", "")
            doc.entities = analysis_data.get("entities", {})
            doc.suggested_facts = analysis_data.get("suggested_facts", [])
            
            # Wnioskowanie daty jeśli nie jest ustawiona (np. dla plików od użytkownika)
            if not doc.document_date and analysis_data.get("document_date"):
                try:
                    doc.document_date = datetime.strptime(analysis_data["document_date"], "%Y-%m-%d")
                except:
                    print(f"Nomous.ia: Nie udało się sparsować daty AI: {analysis_data['document_date']}")
                    
        except Exception as e:
            print(f"Nomous.ia Gemini error: {e}")
            doc.summary = "Dokument został wgrany, ale analiza AI jest w toku."

        # 2. Wektoryzacja
        try:
            embeddings = OpenAIEmbeddings(
                model="text-embedding-3-small",
                dimensions=768,
                api_key=os.getenv("OPENAI_API_KEY")
            )
            
            namespace = f"case_{doc.case_id}" # Ujednolicony namespace dla całej sprawy
            lc_doc = LangchainDocument(
                page_content=extracted_text, 
                metadata={"source": doc.filename, "doc_id": doc.id, "case_id": doc.case_id}
            )
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            chunks = text_splitter.split_documents([lc_doc])
            
            PineconeVectorStore.from_documents(
                chunks, 
                embeddings, 
                index_name=os.getenv("PINECONE_INDEX_NAME", "nomous-dev-index"), 
                namespace=namespace
            )
            doc.pinecone_namespace = namespace
            doc.status = "ready"
        except Exception as e:
            print(f"Nomous.ia Wektoryzacja error: {e}")
            doc.status = "error"
            
        db.commit()
    except Exception as e:
        db.rollback()
        if 'doc' in locals():
            doc.status = "error"
            db.commit()
    finally:
        db.close()
