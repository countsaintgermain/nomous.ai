import pytest
from app.models.user import User
from app.models.case import Case

def test_create_case(client, db):
    # Ensure test user exists
    user = db.query(User).filter(User.id == 1).first()
    if not user:
        user = User(id=1, email="test@example.com", hashed_password="hashed_password", full_name="Test User")
        db.add(user)
        db.commit()

    response = client.post(
        "/api/cases/",
        json={"title": "Test Case", "description": "Test Description", "signature": "K 123/24"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Case"
    assert data["description"] == "Test Description"
    assert data["signature"] == "K 123/24"
    assert "id" in data

def test_read_cases(client, db):
    # Ensure test user exists
    user = db.query(User).filter(User.id == 1).first()
    if not user:
        user = User(id=1, email="test@example.com", hashed_password="hashed_password", full_name="Test User")
        db.add(user)
        db.commit()

    # Create a case directly
    case = Case(title="Case 2", user_id=1, status="new")
    db.add(case)
    db.commit()

    response = client.get("/api/cases/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(c["title"] == "Case 2" for c in data)
