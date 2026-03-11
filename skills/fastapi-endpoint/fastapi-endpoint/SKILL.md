---
name: fastapi-endpoint
description: Scaffolds a new FastAPI endpoint, schema, and basic tests in the backend. Use when Gemini CLI needs to add a new API route to the backend.
---

# FastAPI Endpoint Skill

This skill guides the creation of a new FastAPI endpoint in the `backend/` directory.

## Workflow

1.  **Define Schema**: Create a new Pydantic schema in `backend/app/schemas/`.
    -   Name the file based on the entity (e.g., `item.py`).
    -   Define `Create`, `Update`, and `Response` schemas.
2.  **Define Model**: Ensure the SQLAlchemy model exists in `backend/app/models/`. If not, create it.
3.  **Create Endpoint**: Add a new router in `backend/app/api/endpoints/`.
    -   Include GET, POST, PUT, DELETE methods as appropriate.
    -   Use the defined schemas for validation.
    -   Inject `db: Session = Depends(get_db)`.
4.  **Register Router**: Add the new router to the main API router in `backend/app/main.py` or the central router registry.
5.  **Write Tests**: Add a test file in `backend/tests/` using Pytest and `TestClient`.

## Database Conventions

-   Use SQLAlchemy for ORM.
-   Run Alembic migrations after creating/modifying models:
    -   `cd backend`
    -   `source venv/bin/activate`
    -   `alembic revision --autogenerate -m "Add new model"`
    -   `alembic upgrade head`

## Reference

-   Project uses Python 3.12 and FastAPI.
-   The main entrypoint is `backend/app/main.py`.
