from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50)) # np. pdf, docx
    file_hash = Column(String(64), nullable=True, index=True) # SHA-256 hash
    tag = Column(String(50), default="Dokument") # Dokument, Dowód, Inne
    s3_key = Column(String(512), nullable=True) # Ścieżka przechowywania
    
    # Do wektoryzacji i RAG:
    status = Column(String(50), default="uploaded") # uploaded, processing, ready, error
    content_extracted = Column(Text, nullable=True) # Wynik z OCR/Parsera dokumentu
    pinecone_namespace = Column(String(255), nullable=True) # Gdzie leżą wektory tego pliku
    summary = Column(Text, nullable=True) # Streszczenie z Gemini
    entities = Column(JSON, nullable=True) # Wykryte byty (Osoby, Daty, Kwoty)
    
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    case = relationship("Case", backref="documents")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
