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
    import tree_sitter_go
    import tree_sitter_rust
    import tree_sitter_c
    import tree_sitter_cpp
    import tree_sitter_c_sharp
    import tree_sitter_ruby
    import tree_sitter_php
    import tree_sitter_html
    import tree_sitter_json
    import tree_sitter_yaml
    import tree_sitter_bash
    import tree_sitter_sql
    import tree_sitter_markdown
    import tree_sitter_kotlin
    import tree_sitter_lua
    import tree_sitter_toml
    
    HAS_TREE_SITTER = True
    
    py_lang = Language(tree_sitter_python.language())
    js_lang = Language(tree_sitter_javascript.language())
    ts_lang = Language(tree_sitter_typescript.language_typescript())
    tsx_lang = Language(tree_sitter_typescript.language_tsx())
    java_lang = Language(tree_sitter_java.language())
    go_lang = Language(tree_sitter_go.language())
    rs_lang = Language(tree_sitter_rust.language())
    c_lang = Language(tree_sitter_c.language())
    cpp_lang = Language(tree_sitter_cpp.language())
    cs_lang = Language(tree_sitter_c_sharp.language())
    rb_lang = Language(tree_sitter_ruby.language())
    php_lang = Language(tree_sitter_php.language_php())
    html_lang = Language(tree_sitter_html.language())
    json_lang = Language(tree_sitter_json.language())
    yaml_lang = Language(tree_sitter_yaml.language())
    bash_lang = Language(tree_sitter_bash.language())
    sql_lang = Language(tree_sitter_sql.language())
    md_lang = Language(tree_sitter_markdown.language())
    kt_lang = Language(tree_sitter_kotlin.language())
    lua_lang = Language(tree_sitter_lua.language())
    toml_lang = Language(tree_sitter_toml.language())
    
    LANGUAGES = {
        # Python
        ".py": py_lang,
        # JavaScript
        ".js": js_lang,
        ".jsx": js_lang,
        ".mjs": js_lang,
        ".cjs": js_lang,
        # TypeScript
        ".ts": ts_lang,
        ".tsx": tsx_lang,
        # Java
        ".java": java_lang,
        # Go
        ".go": go_lang,
        # Rust
        ".rs": rs_lang,
        # C / C++
        ".c": c_lang,
        ".h": c_lang,
        ".cpp": cpp_lang,
        ".hpp": cpp_lang,
        ".cc": cpp_lang,
        ".cxx": cpp_lang,
        # C#
        ".cs": cs_lang,
        # Ruby
        ".rb": rb_lang,
        # PHP
        ".php": php_lang,
        # HTML
        ".html": html_lang,
        ".htm": html_lang,
        # JSON
        ".json": json_lang,
        # YAML
        ".yaml": yaml_lang,
        ".yml": yaml_lang,
        # Bash / Shell
        ".sh": bash_lang,
        ".bash": bash_lang,
        ".zsh": bash_lang,
        # SQL
        ".sql": sql_lang,
        # Markdown
        ".md": md_lang,
        ".markdown": md_lang,
        # Kotlin
        ".kt": kt_lang,
        ".kts": kt_lang,
        # Lua
        ".lua": lua_lang,
        # TOML
        ".toml": toml_lang,
    }
except ImportError as e:
    logging.warning(f"Tree-sitter languages not fully installed, using fallback parsing: {e}")
    HAS_TREE_SITTER = False
    LANGUAGES = {}

logger = logging.getLogger(__name__)

FILENAME_TO_LANG = {
    "dockerfile": "dockerfile",
    "containerfile": "dockerfile",
    "makefile": "makefile",
    "cmakelists.txt": "cmake",
    "gemfile": "ruby",
    "rakefile": "ruby",
    "procfile": "yaml",
    ".gitignore": "config",
    ".env.example": "config",
    ".editorconfig": "config",
}

EXT_TO_DISPLAY_LANG = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".java": "java",
    ".go": "go",
    ".rs": "rust",
    ".c": "c",
    ".h": "c",
    ".cpp": "cpp",
    ".hpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".cs": "csharp",
    ".rb": "ruby",
    ".php": "php",
    ".html": "html",
    ".htm": "html",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".sh": "bash",
    ".bash": "bash",
    ".zsh": "bash",
    ".sql": "sql",
    ".md": "markdown",
    ".markdown": "markdown",
    ".kt": "kotlin",
    ".kts": "kotlin",
    ".lua": "lua",
    ".toml": "toml",
    ".css": "css",
    ".scss": "scss",
    ".less": "less",
    ".xml": "xml",
    ".proto": "protobuf",
    ".graphql": "graphql",
    ".gql": "graphql",
    ".txt": "text",
}

def detect_language(file_path: str) -> str:
    """Detect language from file path or extension."""
    basename = os.path.basename(file_path).lower()
    if basename in FILENAME_TO_LANG:
        return FILENAME_TO_LANG[basename]
    ext = os.path.splitext(basename)[1]
    if ext in EXT_TO_DISPLAY_LANG:
        return EXT_TO_DISPLAY_LANG[ext]
    return ext[1:] if ext.startswith(".") else "other"

def discover_files(repo_path: str) -> List[str]:
    """Discover files to index, applying filters."""
    ignored_dirs = {
        ".git", "node_modules", "__pycache__", "dist", "build", 
        "target", ".venv", "venv", "coverage", ".idea", ".vscode",
        ".next", ".nuxt", "bin", "obj", "vendor"
    }
    
    ignored_exts = {
        ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico",
        ".mp4", ".mov", ".avi", ".zip", ".tar", ".gz", ".7z",
        ".pdf", ".bin", ".exe", ".dll", ".so", ".class", ".dylib",
        ".pyc", ".pyo", ".lock", ".woff", ".woff2", ".ttf", ".eot"
    }
    
    files_to_index = []
    
    for root, dirs, files in os.walk(repo_path):
        # Mutate dirs in place to skip ignored directories
        dirs[:] = [d for d in dirs if d not in ignored_dirs and not d.startswith(".")]
        
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
    """Parse a file into chunks using Tree-sitter AST or intelligent fallback."""
    ext = os.path.splitext(file_path)[1].lower()
    lang_name = detect_language(file_path)
    
    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            source_code = f.read()
    except Exception as e:
        logger.warning(f"Failed to read file {file_path}: {e}")
        return []

    # If it's empty
    if not source_code.strip():
        return []

    chunks = []
    
    # 1. Tree-sitter parsing
    if HAS_TREE_SITTER and ext in LANGUAGES:
        try:
            parser = Parser(LANGUAGES[ext])
            tree = parser.parse(bytes(source_code, "utf8"))
            
            TARGET_NODE_TYPES = {
                # Functions, methods, lambdas
                "function_definition", "function_declaration", "method_definition", "method_declaration",
                "function_item", "method", "singleton_method", "arrow_function", "local_function",
                # Classes, structs, interfaces, traits, objects
                "class_definition", "class_declaration", "class_specifier",
                "struct_item", "struct_specifier", "struct_declaration",
                "type_declaration", "type_spec", "trait_item", "impl_item",
                "interface_declaration", "module", "enum_item", "object_declaration",
                # SQL
                "statement", "create_table", "create_view", "create_index", "create_function", "select_statement",
                # Markdown
                "section", "atx_heading",
                # Bash
                "command",
                # JSON / YAML / TOML
                "pair", "block_mapping_pair", "table"
            }
            
            def traverse(node):
                if node.type in TARGET_NODE_TYPES:
                    start_line = node.start_point[0] + 1
                    end_line = node.end_point[0] + 1
                    
                    # Extract name if possible
                    name = "anonymous"
                    for child in node.children:
                        if child.type in ["identifier", "name", "type_identifier", "field_identifier", "property_identifier", "table_name", "key"]:
                            name = source_code[child.start_byte:child.end_byte]
                            break
                            
                    chunks.append({
                        "chunk_id": str(uuid.uuid4()),
                        "repository_id": repo_id,
                        "file_path": file_path,
                        "language": lang_name,
                        "symbol_name": name,
                        "symbol_type": node.type,
                        "start_line": start_line,
                        "end_line": end_line,
                        "source_code": source_code[node.start_byte:node.end_byte]
                    })
                
                # Recurse into containers, but limit nesting inside small functions
                if node.type not in ["function_definition", "function_item", "method", "singleton_method", "pair"]:
                    for child in node.children:
                        traverse(child)
            
            traverse(tree.root_node)
            
        except Exception as e:
            logger.warning(f"Tree-sitter failed for {file_path}, using fallback: {e}")
            chunks = _fallback_chunking(source_code, file_path, repo_id, lang_name)
    else:
        # 2. Fallback parsing for unsupported languages or when tree-sitter fails
        chunks = _fallback_chunking(source_code, file_path, repo_id, lang_name)
        
    # If no chunks were created (e.g. no functions/classes found), chunk the whole file by lines
    if not chunks:
        chunks = _fallback_chunking(source_code, file_path, repo_id, lang_name)
        
    return chunks

def _fallback_chunking(source_code: str, file_path: str, repo_id: int, lang_name: str) -> List[Dict[str, Any]]:
    """Intelligent line-based chunking as fallback."""
    lines = source_code.split('\n')
    chunks = []
    chunk_size = 80
    overlap = 10
    
    i = 0
    while i < len(lines):
        chunk_lines = lines[i:i + chunk_size]
        chunk_code = '\n'.join(chunk_lines)
        if chunk_code.strip():
            chunks.append({
                "chunk_id": str(uuid.uuid4()),
                "repository_id": repo_id,
                "file_path": file_path,
                "language": lang_name,
                "symbol_name": f"{lang_name}_block_{i // (chunk_size - overlap) + 1}",
                "symbol_type": "code_block",
                "start_line": i + 1,
                "end_line": i + len(chunk_lines),
                "source_code": chunk_code
            })
        i += (chunk_size - overlap)
        if i >= len(lines):
            break
            
    return chunks
