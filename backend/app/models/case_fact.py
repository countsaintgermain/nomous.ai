from sqlalchemy import Column, Integer, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class CaseFact(Base):
    __tablename__ = "case_facts"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    
    # Metadane (np. data, osoby, kwoty wyekstrahowane przz AI)
    metadata_json = Column(JSON, nullable=True)
    
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    case = relationship("Case", backref="facts")
    
    source_doc_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=True)
    source_document = relationship("Document", backref="facts")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
