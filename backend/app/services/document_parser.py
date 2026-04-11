import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from app.core.config import settings
from sqlalchemy.orm import Session
from app.models.document import Document
from app.models.embedding import Embedding

def parse_and_vectorize(db: Session, doc_id: int):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc or not doc.s3_key:
        return {"status": "error", "message": "Document not found or path missing"}

    try:
        # 1. Zmiana statusu
        doc.status = "processing"
        db.commit()

        # 2. Wczytanie PDF (PyPDFLoader)
        loader = PyPDFLoader(doc.s3_key)
        pages = loader.load()

        # 3. Podział tekstu (Chunking) na mniejsze paczki po max 1000 znaków z overlappingiem
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_documents(pages)

        # Zapis do bazy co wycięto (dla podglądu debuggowania)
        full_text = "\n".join([page.page_content for page in pages])
        doc.content_extracted = full_text[:5000] # Zachowaj fragment w bazie postgres dla wizualizacji

        # 4. Generowanie wektorów przez OpenAI
        embeddings_model = OpenAIEmbeddings(
            model="text-embedding-3-small",
            dimensions=768,
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        texts = [chunk.page_content for chunk in chunks]
        embeddings = embeddings_model.embed_documents(texts)

        # 5. Zapis do PostgreSQL (tabela embeddings)
        db_embeddings = []
        for text, embedding in zip(texts, embeddings):
            db_embeddings.append(Embedding(
                case_id=doc.case_id,
                entity_type='document',
                entity_id=doc.id,
                content=text,
                embedding=embedding
            ))
        
        db.add_all(db_embeddings)
        doc.status = "indexed"
        db.commit()

        return {"status": "success", "chunks_processed": len(chunks)}

    except Exception as e:
        doc.status = "error"
        db.commit()
        return {"status": "error", "message": str(e)}
