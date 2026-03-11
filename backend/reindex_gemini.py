import sys
import os

# append the project path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.document import Document
from app.services.document_parser import parse_and_vectorize

def reindex_all():
    db = SessionLocal()
    docs = db.query(Document).all()
    print(f"Found {len(docs)} documents")
    for doc in docs:
        print(f"Reindexing doc {doc.id}...")
        res = parse_and_vectorize(db, doc.id)
        print(f"Result for doc {doc.id}: {res}")
    db.close()

if __name__ == "__main__":
    reindex_all()
