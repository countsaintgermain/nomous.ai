from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.core.database import Base

class Embedding(Base):
    __tablename__ = "embeddings"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, index=True, nullable=True)        # Opcjonalne powiązanie ze sprawą dla szybkiego filtrowania
    entity_type = Column(String(50), nullable=False, index=True)  # np. 'document', 'judgment'
    entity_id = Column(Integer, nullable=False, index=True)        # ID z tabeli (np. Document.id)
    content = Column(Text, nullable=True)                      # Treść chunku
    embedding = Column(Vector(768), nullable=True)             # Nasz wektor
    metadata_json = Column(JSON, nullable=True)                # Elastyczne metadane
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
