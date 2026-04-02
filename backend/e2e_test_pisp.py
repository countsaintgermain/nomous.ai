
import asyncio
import os
import shutil
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime

# Importy z aplikacji
from app.main import app
from app.core.database import get_db, Base
from app.models.document import Document
from app.models.case import Case
from sqlalchemy import create_mock_engine

# Mockowanie bazy danych dla testu
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

async def run_e2e_test():
    print("Starting E2E Backend Test for PISP Documents...")
    
    # 1. Setup test data
    db = TestingSessionLocal()
    # Ensure clean state
    db.query(Document).delete()
    db.query(Case).delete()
    
    test_case = Case(id=1, title="Test Case", signature="I C 123/23", user_id=1)
    db.add(test_case)
    
    test_doc = Document(
        id=1, 
        case_id=1, 
        pisp_id=999, 
        filename="test_doc.pdf", 
        document_name="Test Document",
        document_date=datetime.now(),
        status="pisp_remote"
    )
    db.add(test_doc)
    db.commit()
    
    # Clean directories
    for d in ["/app/uploads/temp", "/app/uploads/dokumenty/1"]:
        if os.path.exists(d):
            shutil.rmtree(d)
    
    # 2. Mock PispConnector
    mock_connector = MagicMock()
    mock_connector.is_logged_in = AsyncMock(return_value=True)
    mock_connector.fetch_binary = AsyncMock(return_value=b"%PDF-1.4 dummy content")
    mock_connector._last_credentials = None

    with patch("app.api.endpoints.pisp.PispConnector.get_instance", AsyncMock(return_value=mock_connector)), \
         patch("app.api.endpoints.pisp.process_document_ocr_task.kiq", AsyncMock()) as mock_kiq:
        
        # --- TEST PREVIEW (CACHE MISS) ---
        print("\nTesting Preview (Cache Miss)...")
        response = client.get("/api/pisp/document/999/preview")
        assert response.status_code == 200
        assert response.content == b"%PDF-1.4 dummy content"
        assert os.path.exists("/app/uploads/temp/999.pdf"), "Temp cache file should be created"
        print("Preview (Cache Miss) SUCCESS")

        # --- TEST PREVIEW (CACHE HIT) ---
        print("\nTesting Preview (Cache Hit)...")
        # Change mock content to verify it's NOT called again
        mock_connector.fetch_binary.return_value = b"NEW CONTENT SHOULD NOT BE SEEN"
        response = client.get("/api/pisp/document/999/preview")
        assert response.status_code == 200
        assert response.content == b"%PDF-1.4 dummy content", "Should return cached content"
        print("Preview (Cache Hit) SUCCESS")

        # --- TEST IMPORT ---
        print("\nTesting Import...")
        # Reset mock content for import
        mock_connector.fetch_binary.return_value = b"%PDF-1.4 actual content"
        response = client.post("/api/pisp/document/1/import")
        assert response.status_code == 200
        
        # REFRESH DB in test session to see the s3_key_pdf update
        db.refresh(test_doc)
        print(f"Doc s3_key_pdf after import: {test_doc.s3_key_pdf}")
        
        # Check files in briefcase
        briefcase_dir = "/app/uploads/dokumenty/1"
        assert os.path.exists(briefcase_dir), "Briefcase directory should be created"
        files = os.listdir(briefcase_dir)
        print(f"Files in briefcase: {files}")
        assert any(f.endswith(".pdf") for f in files), "PDF should be in briefcase"
        
        # Check AI task trigger
        mock_kiq.assert_called_once_with(1)
        print("Import SUCCESS")

        # --- TEST PREVIEW (BRIEFCASE HIT) ---
        print("\nTesting Preview (Briefcase Hit)...")
        # Delete temp file to force briefcase check
        if os.path.exists("/app/uploads/temp/999.pdf"):
            os.remove("/app/uploads/temp/999.pdf")
        
        # Verify DB state again just to be sure
        db.expire_all()
        doc_in_db = db.query(Document).filter(Document.pisp_id == 999).first()
        print(f"DB state before call: s3_key_pdf={doc_in_db.s3_key_pdf}")
        print(f"File exists at path: {os.path.exists(doc_in_db.s3_key_pdf)}")
        
        # Change briefcase file content to verify hit
        pdf_file = [f for f in files if f.endswith(".pdf")][0]
        pdf_path = os.path.join(briefcase_dir, pdf_file)
        with open(pdf_path, "wb") as f:
            f.write(b"%PDF-1.4 briefcase content")
        
        response = client.get("/api/pisp/document/999/preview")
        print(f"Briefcase Hit status: {response.status_code}")
        print(f"Briefcase Hit content length: {len(response.content)}")
        print(f"Briefcase Hit content start: {response.content[:50]}")
        assert response.status_code == 200
        assert response.content == b"%PDF-1.4 briefcase content", f"Expected briefcase content, got {response.content[:50]}"
        print("Preview (Briefcase Hit) SUCCESS")

    print("\nALL TESTS PASSED!")
    # Cleanup
    if os.path.exists("test.db"): os.remove("test.db")

if __name__ == "__main__":
    asyncio.run(run_e2e_test())
