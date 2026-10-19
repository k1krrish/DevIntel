import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_list_repositories():
    response = client.get("/repositories")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_invalid_repo_url():
    response = client.post("/repositories", json={"github_url": "https://notgithub.com/foo/bar"})
    assert response.status_code == 400
