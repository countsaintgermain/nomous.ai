from pydantic import BaseModel
from typing import List, Optional, Dict

class PispEntity(BaseModel):
    id: Optional[int] = None
    role: Optional[str] = None
    name: Optional[str] = None
    address: Optional[str] = None
    type: Optional[str] = None
    priority: Optional[int] = None
    parentId: Optional[int] = None
    status: Optional[str] = None
    dateFrom: Optional[str] = None
    dateTo: Optional[str] = None
    gainedAccessDate: Optional[str] = None
    createdDate: Optional[str] = None
    modificationDate: Optional[str] = None
    hasAccess: Optional[bool] = None
    representatives: List[Dict] = []

class PispActivity(BaseModel):
    id: Optional[int] = None
    caseId: Optional[int] = None
    documentId: Optional[int] = None
    date: Optional[str] = None
    signature: Optional[str] = None
    courtName: Optional[str] = None
    name: Optional[str] = None
    sender: Optional[str] = None
    receiver: Optional[str] = None
    comment: Optional[str] = None
    judge: Optional[str] = None
    party: Optional[str] = None
    subject: Optional[str] = None
    fullDocumentName: Optional[str] = None
    documentName: Optional[str] = None
    # Pola pomocnicze (z wtyczki)
    submitted_by: Optional[str] = None
    activity: Optional[str] = None

class PispHearing(BaseModel):
    id: Optional[int] = None
    signature: Optional[str] = None
    court: Optional[str] = None
    date: Optional[str] = None
    room: Optional[str] = None
    procedure: Optional[str] = None
    judge: Optional[str] = None
    subject: Optional[str] = None
    value: Optional[str] = None
    eprotocol: Optional[bool] = None
    eprotocolId: Optional[int] = None
    eprotocolVideoPath: Optional[str] = None
    result: Optional[str] = None
    videoArchivizationDate: Optional[str] = None
    transcriptionFilesPresent: Optional[bool] = None
    createdDate: Optional[str] = None
    modificationDate: Optional[str] = None

class PispDocument(BaseModel):
    id: Optional[int] = None
    createDate: Optional[str] = None
    publicationDate: Optional[str] = None
    documentName: Optional[str] = None
    fileName: Optional[str] = None
    documentType: Optional[int] = None
    downloaded: Optional[bool] = None
    documentChecksum: Optional[str] = None
    createdDate: Optional[str] = None
    modificationDate: Optional[str] = None
    writingId: Optional[int] = None
    writingAttachmentType: Optional[str] = None
    docsCount: Optional[int] = None
    # Pola dla aplikacji
    downloadLink: Optional[str] = None

class PispRelation(BaseModel):
    id: Optional[int] = None
    signature: Optional[str] = None
    relationType: Optional[str] = None
    authority: Optional[str] = None
    judge: Optional[str] = None
    receiptDate: Optional[str] = None
    decissionDate: Optional[str] = None
    result: Optional[str] = None
    externalId: Optional[str] = None

class PispSyncData(BaseModel):
    signature: str
    court: Optional[str] = None
    department: Optional[str] = None
    status: Optional[str] = None
    receiptDate: Optional[str] = None
    conclusionDate: Optional[str] = None
    publicationDate: Optional[str] = None
    caseSubject: Optional[str] = None
    referent: Optional[str] = None
    claimValue: Optional[str] = None
    resolution: Optional[str] = None
    mainEntities: Optional[str] = None
    entities: List[PispEntity] = []
    activities: List[PispActivity] = []
    hearings: List[PispHearing] = []
    documents: List[PispDocument] = []
    relations: List[PispRelation] = []
    class Config:
        extra = "ignore"

class PispAiSyncRequest(BaseModel):
    signature: str
    raw_texts: Dict[str, str]
    document_links: List[PispDocument] = []
    structured_data: Optional[PispSyncData] = None
