import enum
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class JudgmentSource(str, enum.Enum):
    MANUAL = "MANUAL"
    AI = "AI"

class SavedJudgment(Base):
    __tablename__ = "saved_judgments"

    id = Column(Integer, primary_key=True, index=True)
    saos_id = Column(Integer, nullable=False, index=True)
    signature = Column(String(255), nullable=True)
    judgment_date = Column(String(50), nullable=True)
    court_name = Column(Text, nullable=True)
    court_type = Column(String(50), nullable=True)
    division_name = Column(Text, nullable=True)
    judges = Column(JSON, nullable=True)
    content = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    source = Column(SQLEnum(JudgmentSource), default=JudgmentSource.MANUAL)
    
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    case = relationship("Case", back_populates="saved_judgments")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
