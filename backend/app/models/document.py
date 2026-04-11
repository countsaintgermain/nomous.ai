import os
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.core.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    pisp_id = Column(Integer, nullable=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=True)
    file_hash = Column(String(255), nullable=True)
    tag = Column(String(100), nullable=True)
    
    # Dane merytoryczne dokumentu
    document_date = Column(DateTime(timezone=True), nullable=False) # Rzeczywista data dokumentu - OBOWIĄZKOWA
    publication_date = Column(String(50), nullable=True)
    document_name = Column(Text, nullable=False) # NAZWA OBOWIĄZKOWA
    document_type = Column(String(100), nullable=True)
    downloaded = Column(String(20), nullable=True)
    document_checksum = Column(String(255), nullable=True)
    modification_date = Column(String(50), nullable=True)
    writing_id = Column(Integer, nullable=True)
    writing_attachment_type = Column(String(255), nullable=True)
    docs_count = Column(Integer, nullable=True)

    # Przechowywanie lokalne i linki PISP
    download_link = Column(String(512), nullable=True)
    source_download_link = Column(String(512), nullable=True)
    s3_key = Column(String(512), nullable=True) 
    s3_key_source = Column(String(512), nullable=True) 
    s3_key_pdf = Column(String(512), nullable=True)    
    
    # Do wektoryzacji i RAG:
    status = Column(String(50), default="uploaded")
    content_extracted = Column(Text, nullable=True) 
    pinecone_namespace = Column(String(255), nullable=True) 
    summary = Column(Text, nullable=True)
    entities = Column(JSON, nullable=True)
    suggested_facts = Column(JSON, nullable=True)
    embedding = Column(Vector(768), nullable=True)

    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    case = relationship("Case", back_populates="documents")

    created_date = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    @property
    def has_pdf(self) -> bool:
        return self.s3_key_pdf is not None and os.path.exists(self.s3_key_pdf)

    @property
    def has_source(self) -> bool:
        return self.s3_key_source is not None and os.path.exists(self.s3_key_source)
