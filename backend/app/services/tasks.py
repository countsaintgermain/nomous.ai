import os
from app.core.worker import broker
from app.core.database import SessionLocal
from app.models.document import Document
from pinecone import Pinecone, ServerlessSpec
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_core.documents import Document as LangchainDocument
from paddleocr import PaddleOCR
import pdfplumber
from dotenv import load_dotenv

load_dotenv()

# Inicjalizacja modelu OCR w pamięci loadera
ocr = PaddleOCR(use_angle_cls=True, lang='pl')

@broker.task
def process_document_ocr_task(doc_id: int):
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc or not doc.s3_key:
            return {"status": "error", "message": "Document not found or path missing"}

        doc.status = "processing"
        db.commit()

        # 1. OCR Ekstrakcja w zależności od rozszerzenia pliku
        extracted_text = ""
        if doc.file_type and doc.file_type.lower() == 'pdf':
            # Użycie pdfplumber dla stabilniejszej ekstrakcji PDF (omijając bugi PaddleOCR na ARM)
            with pdfplumber.open(doc.s3_key) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        extracted_text += text + "\n"
        else:
            # Zakładamy że wgrano obraz (JPG/PNG), używamy PaddleOCR jako fallback
            result = ocr.ocr(doc.s3_key)
            if result and result[0]:
                for line in result[0]:
                    extracted_text += line[1][0] + "\n"
        
        
        doc.content_extracted = extracted_text[:5000] # Zachowaj do bazy max 5000 znaków dla metadanych

        # 2. Inteligentna Analiza (Gemini)
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            from langchain.prompts import PromptTemplate
            import json
            
            sample_text = extracted_text[:15000] # Gemini context window
            
            prompt = PromptTemplate.from_template(
                "Wykonaj profesjonalną analizę poniższego dokumentu prawniczego/biznesowego.\n"
                "1. Zwróć zwięzłe streszczenie (2-3 zdania).\n"
                "2. Wypisz zidentyfikowane kluczowe byty: Osoby (z imienia i nazwiska/nazwy firmy), Daty oraz Kwoty.\n\n"
                "MUSISZ ZWRÓCIĆ WYŁĄCZNIE CZYSTY OBIEKT JSON wg poniższego schematu, bez żadnego formatowania markdown (bez ```json i ```):\n"
                "{{\n"
                '  "summary": "Tekst streszczenia",\n'
                '  "entities": {{\n'
                '    "osoby": ["Jan Kowalski", "Firma X"],\n'
                '    "daty": ["2023-01-01", "2024-05-10"],\n'
                '    "kwoty": ["10000 PLN", "50 EUR"]\n'
                "  }}\n"
                "}}\n\n"
                "Dokument:\n{text}"
            )
            llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0) # Flash is faster and cheaper for this task
            chain = prompt | llm
            response = chain.invoke({"text": sample_text})
            
            json_str = response.content.replace("```json", "").replace("```", "").strip()
            analysis_data = json.loads(json_str)
            
            doc.summary = analysis_data.get("summary", "")
            doc.entities = analysis_data.get("entities", {})
        except Exception as e:
            print(f"Błąd analizy Gemini: {e}")
            doc.summary = "Nie udało się wygenerować streszczenia ze względu na błąd modelu."
            doc.entities = {}

        # 3. Wektoryzacja do Pinecone
        pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        index_name = os.getenv("PINECONE_INDEX_NAME", "nomous-dev-index")
        
        if index_name not in [idx.name for idx in pc.list_indexes()]:
            pc.create_index(
                name=index_name,
                dimension=768, # Gemini
                metric='cosine',
                spec=ServerlessSpec(cloud='aws', region='us-east-1')
            )

        # 4. Chunking (do modelu dodajemy wyekstrahowany tekst)
        lc_document = LangchainDocument(page_content=extracted_text, metadata={"source": doc.filename, "doc_id": doc.id})
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_documents([lc_document])

        # 5. Zapis do namespace'u po Case ID (separacja spraw)
        namespace_id = f"case_{doc.case_id}"
        embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
        
        vectorstore = PineconeVectorStore.from_documents(
            chunks,
            embeddings,
            index_name=index_name,
            namespace=namespace_id
        )

        doc.pinecone_namespace = namespace_id
        doc.status = "ready"
        db.commit()

        return {"status": "success", "chunks_processed": len(chunks)}
    except Exception as e:
        doc.status = "error"
        db.commit()
        return {"status": "error", "message": str(e)}
    finally:
        db.close()
