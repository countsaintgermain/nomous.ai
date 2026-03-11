import pytest
from unittest.mock import MagicMock, patch
from app.services.document_parser import parse_and_vectorize
from app.models.document import Document

@pytest.fixture
def mock_db():
    return MagicMock()

@pytest.fixture
def mock_doc():
    doc = Document(id=1, s3_key="test.pdf", case_id=1, status="new")
    return doc

def test_parse_and_vectorize_success(mock_db, mock_doc):
    mock_db.query.return_value.filter.return_value.first.return_value = mock_doc
    
    with patch("app.services.document_parser.Pinecone") as mock_pinecone, \
         patch("app.services.document_parser.PyPDFLoader") as mock_loader, \
         patch("app.services.document_parser.RecursiveCharacterTextSplitter") as mock_splitter, \
         patch("app.services.document_parser.GoogleGenerativeAIEmbeddings") as mock_embeddings, \
         patch("app.services.document_parser.PineconeVectorStore") as mock_vectorstore:
        
        mock_loader.return_value.load.return_value = [MagicMock(page_content="test content")]
        mock_splitter.return_value.split_documents.return_value = [MagicMock()]
        
        result = parse_and_vectorize(mock_db, 1)
        
        assert result["status"] == "success"
        assert mock_doc.status == "indexed"
        assert mock_db.commit.called
