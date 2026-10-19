import logging
import os
from qdrant_client.http.models import PointStruct
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any

from .repository_service import update_repository_status, clone_repository, get_repository_by_id
from .parsing_service import discover_files, parse_file
from ..ai.embeddings import generate_embeddings
from ..integrations.qdrant_client import get_qdrant_client, COLLECTION_NAME
from ..models.repository import RepositoryStatus
from ..core.database import async_session

logger = logging.getLogger(__name__)

async def run_indexing_pipeline(repo_id: int, github_url: str):
    """The main background task for indexing a repository."""
    async with async_session() as db:
        try:
            # 1. Update status to CLONING
            await update_repository_status(db, repo_id, RepositoryStatus.CLONING)
            
            # 2. Clone Repository
            repo_path = clone_repository(github_url, repo_id)
            
            # 3. Update status to PARSING
            await update_repository_status(db, repo_id, RepositoryStatus.PARSING)
            
            # 4. File Discovery & Parsing
            files = discover_files(repo_path)
            all_chunks = []
            
            for file_path in files:
                chunks = parse_file(file_path, repo_id)
                
                # Make paths relative for storage
                rel_path = os.path.relpath(file_path, repo_path)
                for chunk in chunks:
                    chunk["file_path"] = rel_path
                    all_chunks.append(chunk)
            
            # 5. Update status to EMBEDDING
            await update_repository_status(db, repo_id, RepositoryStatus.EMBEDDING)
            
            # 6. Generate Embeddings (in batches)
            batch_size = 50
            qdrant_client = get_qdrant_client()
            
            for i in range(0, len(all_chunks), batch_size):
                batch_chunks = all_chunks[i:i + batch_size]
                texts_to_embed = [
                    f"File: {c['file_path']}\nSymbol: {c['symbol_name']} ({c['symbol_type']})\nCode:\n{c['source_code']}" 
                    for c in batch_chunks
                ]
                
                # Update status to INDEXING to show progress
                if i == 0:
                    await update_repository_status(db, repo_id, RepositoryStatus.INDEXING)
                
                embeddings = generate_embeddings(texts_to_embed)
                
                # 7. Store in Qdrant
                points = []
                for idx, chunk in enumerate(batch_chunks):
                    points.append(
                        PointStruct(
                            id=chunk["chunk_id"],  # uuid string
                            vector=embeddings[idx],
                            payload={
                                "repository_id": chunk["repository_id"],
                                "file_path": chunk["file_path"],
                                "language": chunk["language"],
                                "symbol_name": chunk["symbol_name"],
                                "symbol_type": chunk["symbol_type"],
                                "start_line": chunk["start_line"],
                                "end_line": chunk["end_line"],
                                "source_code": chunk["source_code"]
                            }
                        )
                    )
                
                if points:
                    qdrant_client.upsert(
                        collection_name=COLLECTION_NAME,
                        points=points
                    )
                import time
                time.sleep(0.5)
            
            # 8. Mark as COMPLETED
            await update_repository_status(db, repo_id, RepositoryStatus.COMPLETED)
            logger.info(f"Successfully indexed repository {repo_id}")
            
        except Exception as e:
            logger.error(f"Indexing failed for repository {repo_id}: {e}")
            await update_repository_status(db, repo_id, RepositoryStatus.FAILED, str(e))
