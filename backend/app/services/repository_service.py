import logging
import os
import shutil
from git import Repo
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException
from ..models.repository import Repository, RepositoryStatus
from ..schemas.repository import RepositoryCreate
from ..core.config import settings

logger = logging.getLogger(__name__)

async def get_repository_by_id(db: AsyncSession, repo_id: int) -> Repository:
    result = await db.execute(select(Repository).where(Repository.id == repo_id))
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo

async def create_repository_record(db: AsyncSession, repo_in: RepositoryCreate) -> Repository:
    from urllib.parse import urlparse
    url_str = str(repo_in.github_url).strip()
    parsed = urlparse(url_str)
    if parsed.netloc not in ["github.com", "www.github.com"]:
        raise HTTPException(status_code=400, detail="Invalid GitHub URL: domain must be github.com")
    
    path_parts = [p for p in parsed.path.strip('/').split('/') if p]
    if len(path_parts) < 2:
        raise HTTPException(status_code=400, detail="Invalid GitHub URL: must specify owner and repository name")
    
    owner = path_parts[0]
    name = path_parts[1].removesuffix(".git")
    
    # Check if exists
    result = await db.execute(select(Repository).where(Repository.github_url == str(repo_in.github_url)))
    existing_repo = result.scalar_one_or_none()
    if existing_repo:
        # If it exists, return it or error
        return existing_repo
    
    new_repo = Repository(
        github_url=str(repo_in.github_url),
        owner=owner,
        name=name,
        status=RepositoryStatus.PENDING
    )
    db.add(new_repo)
    await db.commit()
    await db.refresh(new_repo)
    return new_repo

async def update_repository_status(db: AsyncSession, repo_id: int, status: RepositoryStatus, error_message: str = None):
    repo = await get_repository_by_id(db, repo_id)
    repo.status = status
    if error_message:
        repo.error_message = error_message
    await db.commit()

def clone_repository(github_url: str, repo_id: int) -> str:
    """Clones the repository and returns the path to the cloned directory."""
    target_dir = os.path.join(settings.REPOS_DIR, str(repo_id))
    
    if os.path.exists(target_dir):
        logger.info(f"Directory {target_dir} already exists. Cleaning up...")
        # Handle read-only files created by git on windows
        def on_rm_error(func, path, exc_info):
            import stat
            os.chmod(path, stat.S_IWRITE)
            os.unlink(path)
        shutil.rmtree(target_dir, onerror=on_rm_error)
        
    os.makedirs(target_dir, exist_ok=True)
    logger.info(f"Cloning {github_url} into {target_dir}...")
    try:
        Repo.clone_from(github_url, target_dir)
        return target_dir
    except Exception as e:
        logger.error(f"Failed to clone repository: {e}")
        raise
