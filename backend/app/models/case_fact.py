from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class CaseFact(Base):
    __tablename__ = "case_facts"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    
    # Powiązanie ze sprawą
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    case = relationship("Case", backref="facts")

    # Opcjonalne powiązanie z dokumentem źródłowym
    source_doc_id = Column(Integer, ForeignKey("documents.id"), nullable=True)
    
    created_date = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
