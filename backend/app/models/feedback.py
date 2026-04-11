from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class RelevanceFeedback(Base):
    __tablename__ = "relevance_feedback"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    
    # object_id refers to either document_id or saved_judgment_id or external saos_id
    # To keep it simple, we can have separate nullable columns or a polymorphic approach.
    # Given the blueprint, let's use document_id and saos_id.
    
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=True)
    saos_id = Column(Integer, nullable=True) # ID from external SAOS system
    
    is_positive = Column(Boolean, nullable=False) # True for Like, False for Dislike
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    case = relationship("Case", back_populates="feedback")
    document = relationship("Document")
