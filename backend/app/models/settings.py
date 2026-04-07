from sqlalchemy import Column, Integer, String, Boolean
from app.core.database import Base

class AppSettings(Base):
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, index=True)
    main_model = Column(String(100), default="gemini-2.5-pro")
    analytical_model = Column(String(100), default="gemini-3.1-flash-lite-preview")
    api_key = Column(String(255), nullable=True)
    use_vertex = Column(Boolean, default=True)
