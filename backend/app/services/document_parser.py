import os
from pinecone import Pinecone, ServerlessSpec
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from app.core.config import settings
from sqlalchemy.orm import Session
from app.models.document import Document

# Pamiętajmy: Użytkownik ma podać swój klucz pod BYOK w aplikacji - jednak na razie podczas prac testowych z hardcoded user_id=1
# czytamy z os.environ. Przypilnuj, aby w powłoce wyeksportować: OPENAI_API_KEY oraz PINECONE_API_KEY.
def parse_and_vectorize(db: Session, doc_id: int):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc or not doc.s3_key:
        return {"status": "error", "message": "Document not found or path missing"}

    try:
        # 1. Zmiana statusu
        doc.status = "processing"
        db.commit()

        # 2. Inicjalizacja Pinecone
        pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        index_name = os.getenv("PINECONE_INDEX_NAME", "nomous-dev-index")
        
        if index_name not in [idx.name for idx in pc.list_indexes()]:
            pc.create_index(
                name=index_name,
                dimension=768, 
                metric='cosine',
                spec=ServerlessSpec(cloud='aws', region='us-east-1')
            )

        # 3. Wczytanie PDF (PyPDFLoader)
        loader = PyPDFLoader(doc.s3_key)
        pages = loader.load()

        # 4. Podział tekstu (Chunking) na mniejsze paczki po max 1000 znaków z overlappingiem
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = text_splitter.split_documents(pages)

        # Zapis do bazy co wycięto (dla podglądu debuggowania)
        full_text = "\\n".join([page.page_content for page in pages])
        doc.content_extracted = full_text[:5000] # Zachowaj fragment w bazie postgres dla wizualizacji

        # 5. Dodanie metadanych (Namespace = Case ID, aby chronić separację spraw pomiędzy uzytkownikami!)
        namespace_id = f"case_{doc.case_id}"
        embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            dimensions=768,
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # 6. Wypchnięcie do Pinecone (Wektoryzacja)
        vectorstore = PineconeVectorStore.from_documents(
            chunks,
            embeddings,
            index_name=index_name,
            namespace=namespace_id
        )

        doc.pinecone_namespace = namespace_id
        doc.status = "indexed"
        db.commit()

        return {"status": "success", "chunks_processed": len(chunks)}

    except Exception as e:
        doc.status = "error"
        db.commit()
        return {"status": "error", "message": str(e)}
