from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.settings import AppSettings
from pydantic import BaseModel

router = APIRouter()

from typing import Optional

class SettingsSchema(BaseModel):
    main_model: str
    analytical_model: str
    api_key: Optional[str] = None
    use_vertex: bool = True

    class Config:
        from_attributes = True

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=SettingsSchema)
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(AppSettings).first()
    if not settings:
        # Create default settings
        settings = AppSettings(
            main_model="gemini-2.5-pro",
            analytical_model="gemini-3.1-flash-lite-preview",
            api_key=None,
            use_vertex=True
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    # Optional: return masked API key if not empty
    # for now we return it as is, or we could mask it for security in UI.
    return settings

@router.post("", response_model=SettingsSchema)
def update_settings(settings_data: SettingsSchema, db: Session = Depends(get_db)):
    settings = db.query(AppSettings).first()
    if not settings:
        settings = AppSettings()
        db.add(settings)
    
    settings.main_model = settings_data.main_model
    settings.analytical_model = settings_data.analytical_model
    settings.use_vertex = settings_data.use_vertex
    if settings_data.api_key:
        settings.api_key = settings_data.api_key
    
    db.commit()
    db.refresh(settings)
    return settings
