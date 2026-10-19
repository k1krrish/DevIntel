import os
import uuid
import logging
from typing import List, Dict, Any
from pathlib import Path

# Tree-sitter imports (with fallbacks)
try:
    from tree_sitter import Language, Parser
    import tree_sitter_python
    import tree_sitter_javascript
    import tree_sitter_typescript
    import tree_sitter_java
    
    HAS_TREE_SITTER = True
    
    LANGUAGES = {
        ".py": Language(tree_sitter_python.language()),
        ".js": Language(tree_sitter_javascript.language()),
        ".ts": Language(tree_sitter_typescript.language_typescript()),
        ".java": Language(tree_sitter_java.language()),
    }
except ImportError as e:
    logging.warning(f"Tree-sitter not fully installed, using fallback parsing: {e}")
    HAS_TREE_SITTER = False
    LANGUAGES = {}

logger = logging.getLogger(__name__)

def discover_files(repo_path: str) -> List[str]:
    """Discover files to index, applying filters."""
    ignored_dirs = {
        ".git", "node_modules", "__pycache__", "dist", "build", 
        "target", ".venv", "venv", "coverage"
    }
    
    ignored_exts = {
        ".png", ".jpg", ".jpeg", ".gif", ".mp4", ".zip", ".tar", 
        ".gz", ".pdf", ".bin", ".exe", ".dll", ".so", ".class"
    }
    
    files_to_index = []
    
    for root, dirs, files in os.walk(repo_path):
        # Mutate dirs in place to skip ignored directories
        dirs[:] = [d for d in dirs if d not in ignored_dirs]
        
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in ignored_exts:
                continue
                
            # basic size check, e.g. ignore files > 1MB
            file_path = os.path.join(root, file)
            try:
                if os.path.getsize(file_path) > 1024 * 1024:
                    continue
            except OSError:
                continue
                
            files_to_index.append(file_path)
            
    return files_to_index

def parse_file(file_path: str, repo_id: int) -> List[Dict[str, Any]]:
    """Parse a file into chunks."""
    ext = os.path.splitext(file_path)[1].lower()
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            source_code = f.read()
    except Exception as e:
        logger.warning(f"Failed to read file {file_path}: {e}")
        return []

    # If it's empty or too large (checked above, but still)
    if not source_code.strip():
        return []

    chunks = []
    
    # 1. Tree-sitter parsing
    if HAS_TREE_SITTER and ext in LANGUAGES:
        try:
            parser = Parser(LANGUAGES[ext])
            tree = parser.parse(bytes(source_code, "utf8"))
            
            # Simple traversal to find function/class declarations
            # For V1, we'll extract top-level functions and classes, and fallback for the rest
            
            def traverse(node):
                if node.type in ["function_definition", "class_definition", "method_definition", "function_declaration", "class_declaration"]:
                    start_line = node.start_point[0] + 1
                    end_line = node.end_point[0] + 1
                    
                    # Extract name if possible (naive approach for V1)
                    name = "unknown"
                    for child in node.children:
                        if child.type == "identifier":
                            name = source_code[child.start_byte:child.end_byte]
                            break
                            
                    chunks.append({
                        "chunk_id": str(uuid.uuid4()),
                        "repository_id": repo_id,
                        "file_path": file_path,
                        "language": ext[1:],
                        "symbol_name": name,
                        "symbol_type": node.type,
                        "start_line": start_line,
                        "end_line": end_line,
                        "source_code": source_code[node.start_byte:node.end_byte]
                    })
                
                # We only want top level chunks or one level deep for methods to avoid too much duplication
                if node.type not in ["function_definition", "method_definition", "function_declaration"]:
                    for child in node.children:
                        traverse(child)
            
            traverse(tree.root_node)
            
        except Exception as e:
            logger.warning(f"Tree-sitter failed for {file_path}, using fallback: {e}")
            chunks = _fallback_chunking(source_code, file_path, repo_id, ext)
    else:
        # 2. Fallback parsing for unsupported languages or when tree-sitter fails
        chunks = _fallback_chunking(source_code, file_path, repo_id, ext)
        
    # If no chunks were created (e.g. no functions/classes found), chunk the whole file by lines
    if not chunks:
        chunks = _fallback_chunking(source_code, file_path, repo_id, ext)
        
    return chunks

def _fallback_chunking(source_code: str, file_path: str, repo_id: int, ext: str) -> List[Dict[str, Any]]:
    """Simple line-based chunking as fallback."""
    lines = source_code.split('\n')
    chunks = []
    chunk_size = 100
    
    for i in range(0, len(lines), chunk_size):
        chunk_lines = lines[i:i + chunk_size]
        chunk_code = '\n'.join(chunk_lines)
        if chunk_code.strip():
            chunks.append({
                "chunk_id": str(uuid.uuid4()),
                "repository_id": repo_id,
                "file_path": file_path,
                "language": ext[1:] if ext else "unknown",
                "symbol_name": f"chunk_{i//chunk_size}",
                "symbol_type": "file_chunk",
                "start_line": i + 1,
                "end_line": i + len(chunk_lines),
                "source_code": chunk_code
            })
    return chunks
