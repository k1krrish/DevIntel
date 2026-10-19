import pytest
from app.services.repository_service import create_repository_record
from app.schemas.repository import RepositoryCreate
from fastapi import HTTPException

def test_github_url_parsing():
    valid_url = "https://github.com/octocat/Spoon-Knife"
    url_parts = valid_url.rstrip('/').split('/')
    assert len(url_parts) >= 2
    assert "github.com" in valid_url
    assert url_parts[-2] == "octocat"
    assert url_parts[-1] == "Spoon-Knife"

def test_invalid_url():
    from urllib.parse import urlparse
    invalid_url = "https://notgithub.com/someone/repo"
    parsed = urlparse(invalid_url)
    assert parsed.netloc not in ["github.com", "www.github.com"]
