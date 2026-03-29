from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Case(Base):
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    signature = Column(String(100), nullable=True)
    status = Column(String(50), default="new")
    
    court = Column(String(255), nullable=True)
    department = Column(String(255), nullable=True)
    receipt_date = Column(String(50), nullable=True)
    conclusion_date = Column(String(50), nullable=True)
    publication_date = Column(String(50), nullable=True)
    case_subject = Column(Text, nullable=True)
    referent = Column(String(255), nullable=True)
    claim_value = Column(String(100), nullable=True)
    resolution = Column(Text, nullable=True)
    main_entities = Column(Text, nullable=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_date = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="cases")
    entities = relationship("CaseEntity", back_populates="case", cascade="all, delete-orphan")
    activities = relationship("CaseActivity", back_populates="case", cascade="all, delete-orphan")
    hearings = relationship("CaseHearing", back_populates="case", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="case", cascade="all, delete-orphan")
    relations = relationship("CaseRelation", back_populates="case", cascade="all, delete-orphan")

class CaseRelation(Base):
    __tablename__ = "case_relations"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    pisp_id = Column(Integer, nullable=True)
    signature = Column(String(255), nullable=True)
    relation_type = Column(String(100), nullable=True)
    authority = Column(String(255), nullable=True)
    judge = Column(String(255), nullable=True)
    receipt_date = Column(String(50), nullable=True)
    decission_date = Column(String(50), nullable=True)
    result = Column(String(255), nullable=True)
    external_id = Column(String(100), nullable=True)

    case = relationship("Case", back_populates="relations")

class CaseEntity(Base):
    __tablename__ = "case_entities"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    pisp_id = Column(Integer, nullable=True)
    role = Column(String(100), nullable=True)
    name = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    type = Column(String(50), nullable=True)
    priority = Column(Integer, nullable=True)
    parent_id = Column(Integer, nullable=True)
    status = Column(String(100), nullable=True)
    date_from = Column(String(50), nullable=True)
    date_to = Column(String(50), nullable=True)
    gained_access_date = Column(String(50), nullable=True)
    created_date = Column(String(50), nullable=True)
    modification_date = Column(String(50), nullable=True)
    has_access = Column(String(20), nullable=True)
    representatives = Column(JSON, nullable=True)

    case = relationship("Case", back_populates="entities")

class CaseActivity(Base):
    __tablename__ = "case_activities"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    pisp_id = Column(Integer, nullable=True)
    pisp_case_id = Column(Integer, nullable=True)
    document_id = Column(Integer, nullable=True)
    date = Column(String(50), nullable=True)
    signature = Column(String(255), nullable=True)
    court_name = Column(Text, nullable=True)
    name = Column(String(255), nullable=True)
    sender = Column(String(255), nullable=True)
    receiver = Column(String(255), nullable=True)
    comment = Column(Text, nullable=True)
    judge = Column(String(255), nullable=True)
    party = Column(String(255), nullable=True)
    subject = Column(Text, nullable=True)
    full_document_name = Column(Text, nullable=True)
    document_name = Column(Text, nullable=True)
    activity = Column(Text, nullable=True)
    submitted_by = Column(String(255), nullable=True)

    case = relationship("Case", back_populates="activities")

class CaseHearing(Base):
    __tablename__ = "case_hearings"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)
    pisp_id = Column(Integer, nullable=True)
    signature = Column(String(100), nullable=True)
    court = Column(String(255), nullable=True)
    date = Column(String(50), nullable=True)
    room = Column(String(50), nullable=True)
    procedure = Column(String(255), nullable=True)
    judge = Column(String(255), nullable=True)
    subject = Column(Text, nullable=True)
    value = Column(String(100), nullable=True)
    eprotocol = Column(String(20), nullable=True)
    eprotocol_id = Column(Integer, nullable=True)
    eprotocol_video_path = Column(Text, nullable=True)
    result = Column(Text, nullable=True)
    video_archivization_date = Column(String(50), nullable=True)
    transcription_files_present = Column(String(50), nullable=True)
    created_date = Column(String(50), nullable=True)
    modification_date = Column(String(50), nullable=True)
    
    case = relationship("Case", back_populates="hearings")
