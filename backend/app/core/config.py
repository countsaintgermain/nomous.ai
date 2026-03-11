import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Nomous.ia"
    # Domyślny adres pod docker-compose.yml
    SQLALCHEMY_DATABASE_URI: str = os.getenv("DATABASE_URL", "postgresql://nomous_user:devpassword123@localhost:5432/nomous_dev")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    SECRET_KEY: str = "zmien_mnie_w_środowisku_produkcyjnym_!@#$%"
    
    class Config:
        case_sensitive = True

settings = Settings()
