import os
import re
import subprocess
import logging
from typing import List, Dict, Any, Optional
from app.ai.retrieval import search_repository_vectors
from app.ai.reranking import rerank_chunks
from app.ai.llm import generate_code_completion, generate_code_explanation
from app.services.parsing_service import discover_files, detect_language

logger = logging.getLogger(__name__)

def build_architecture_graph(repo_id: int, repo_dir: str) -> Dict[str, Any]:
    """Parse imports across the repository and build an interactive dependency graph."""
    if not os.path.exists(repo_dir):
        return {"nodes": [], "edges": [], "summary": {}}

    files = discover_files(repo_dir)
    rel_files = [os.path.relpath(f, repo_dir).replace("\\", "/") for f in files]
    file_set = set(rel_files)
    
    # Map without extension for JS/TS/Python resolution
    file_map_no_ext = {}
    for rf in rel_files:
        base, _ = os.path.splitext(rf)
        file_map_no_ext[base] = rf
        # Also index.ts / index.js directory resolution
        if os.path.basename(rf).startswith("index."):
            file_map_no_ext[os.path.dirname(rf)] = rf

    nodes = []
    edges = []
    edge_set = set()
    folder_counts = {}

    # Extract imports per file
    import_regex_js = re.compile(r"""(?:import\s+.*?from|export\s+.*?from|require\()\s*['"]([^'"]+)['"]""")
    import_regex_py_from = re.compile(r"""from\s+([.\w]+)\s+import""")
    import_regex_py_imp = re.compile(r"""import\s+([\w\.]+)""")
    include_regex_c = re.compile(r"""#include\s+["<]([^">]+)[">]""")

    for abs_path in files:
        rel_path = os.path.relpath(abs_path, repo_dir).replace("\\", "/")
        folder = os.path.dirname(rel_path) or "root"
        folder_counts[folder] = folder_counts.get(folder, 0) + 1
        lang = detect_language(abs_path)
        
        try:
            with open(abs_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            line_count = len(content.splitlines())
        except Exception:
            line_count = 0
            content = ""

        nodes.append({
            "id": rel_path,
            "label": os.path.basename(rel_path),
            "folder": folder,
            "language": lang,
            "lines": line_count
        })

        # Parse imports
        imported_targets = set()
        
        # JS/TS imports
        if lang in ["javascript", "typescript", "html"]:
            for match in import_regex_js.finditer(content):
                spec = match.group(1)
                if spec.startswith("."): # Relative import
                    cur_dir = os.path.dirname(rel_path)
                    resolved_norm = os.path.normpath(os.path.join(cur_dir, spec)).replace("\\", "/")
                    if resolved_norm in file_set:
                        imported_targets.add(resolved_norm)
                    elif resolved_norm in file_map_no_ext:
                        imported_targets.add(file_map_no_ext[resolved_norm])

        # Python imports
        elif lang == "python":
            cur_dir = os.path.dirname(rel_path)
            for match in import_regex_py_from.finditer(content):
                mod = match.group(1)
                as_path = mod.replace(".", "/")
                norm_cand = os.path.normpath(os.path.join(cur_dir, as_path)).replace("\\", "/")
                if norm_cand in file_map_no_ext:
                    imported_targets.add(file_map_no_ext[norm_cand])
                elif as_path in file_map_no_ext:
                    imported_targets.add(file_map_no_ext[as_path])

        # C / C++ includes
        elif lang in ["c", "cpp"]:
            for match in include_regex_c.finditer(content):
                inc = match.group(1)
                cur_dir = os.path.dirname(rel_path)
                cand = os.path.normpath(os.path.join(cur_dir, inc)).replace("\\", "/")
                if cand in file_set:
                    imported_targets.add(cand)

        for target in imported_targets:
            if target != rel_path:
                edge_key = f"{rel_path}->{target}"
                if edge_key not in edge_set:
                    edge_set.add(edge_key)
                    edges.append({
                        "source": rel_path,
                        "target": target,
                        "id": edge_key
                    })

    # Find hub files (most incoming or outgoing links)
    in_degree = {}
    for e in edges:
        in_degree[e["target"]] = in_degree.get(e["target"], 0) + 1
    
    sorted_hubs = sorted(in_degree.items(), key=lambda x: x[1], reverse=True)[:5]
    hub_files = [{"file": k, "dependents": v} for k, v in sorted_hubs]

    return {
        "nodes": nodes,
        "edges": edges,
        "summary": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "modules": dict(sorted(folder_counts.items(), key=lambda x: x[1], reverse=True)[:6]),
            "hub_files": hub_files
        }
    }

def get_git_insights(repo_dir: str) -> Dict[str, Any]:
    """Extract recent commits and top contributors from git."""
    if not os.path.exists(repo_dir):
        return {"commits": [], "contributors": [], "branch": "unknown"}

    commits = []
    contributors = []
    branch = "main"

    try:
        # Check current branch
        b_res = subprocess.run(
            ["git", "branch", "--show-current"],
            cwd=repo_dir, capture_output=True, text=True, timeout=5
        )
        if b_res.returncode == 0 and b_res.stdout.strip():
            branch = b_res.stdout.strip()

        # Get recent 15 commits
        log_res = subprocess.run(
            ["git", "log", "-n", "15", "--pretty=format:%h|%an|%ae|%ar|%s"],
            cwd=repo_dir, capture_output=True, text=True, timeout=5
        )
        if log_res.returncode == 0 and log_res.stdout.strip():
            for line in log_res.stdout.strip().splitlines():
                parts = line.split("|", 4)
                if len(parts) >= 5:
                    commits.append({
                        "hash": parts[0],
                        "author": parts[1],
                        "email": parts[2],
                        "time_ago": parts[3],
                        "message": parts[4]
                    })

        # Top contributors
        shortlog_res = subprocess.run(
            ["git", "shortlog", "-sn", "--all", "-n", "8"],
            cwd=repo_dir, capture_output=True, text=True, timeout=5
        )
        if shortlog_res.returncode == 0 and shortlog_res.stdout.strip():
            for line in shortlog_res.stdout.strip().splitlines():
                line = line.strip()
                if line:
                    parts = line.split("\t", 1)
                    if len(parts) == 2:
                        try:
                            count = int(parts[0].strip())
                            name = parts[1].strip()
                            contributors.append({"name": name, "commits": count})
                        except ValueError:
                            pass
    except Exception as e:
        logger.warning(f"Git inspection failed for {repo_dir}: {e}")

    return {
        "branch": branch,
        "commits": commits,
        "contributors": contributors,
        "total_commits_inspected": len(commits)
    }

def generate_code_grounded(repo_id: int, prompt: str, task_type: str = "custom", target_file: Optional[str] = None) -> Dict[str, Any]:
    """Retrieve repository patterns and generate production-ready code."""
    # Build retrieval query
    search_query = prompt
    if target_file:
        search_query = f"{target_file} {prompt}"
        
    raw_chunks = search_repository_vectors(repo_id, search_query, top_k=10)
    reranked = rerank_chunks(search_query, raw_chunks, top_k=5)
    
    context_str = ""
    relevant_files = []
    for chunk in reranked:
        context_str += f"File: {chunk['file_path']} (Lines {chunk['start_line']}-{chunk['end_line']})\n"
        context_str += f"Symbol: {chunk['symbol_name']}\nCode:\n{chunk['source_code']}\n\n"
        if chunk['file_path'] not in relevant_files:
            relevant_files.append(chunk['file_path'])
            
    raw_output = generate_code_completion(prompt, context_str, task_type)
    
    # Extract code and explanation
    code_match = re.search(r"```(?:\w+)?\n([\s\S]*?)```", raw_output)
    if code_match:
        generated_code = code_match.group(1).strip()
        explanation = raw_output[:code_match.start()] + "\n" + raw_output[code_match.end():]
        explanation = explanation.strip()
    else:
        generated_code = raw_output
        explanation = "Generated code based on repository patterns."

    return {
        "generated_code": generated_code,
        "explanation": explanation,
        "relevant_files": relevant_files
    }

def explain_code_grounded(repo_id: int, repo_dir: str, file_path: str, snippet: Optional[str] = None) -> Dict[str, Any]:
    """Explain code architecture, complexity, and security."""
    code_content = snippet
    if not code_content:
        safe_path = os.path.normpath(file_path).lstrip("/\\")
        full_path = os.path.join(repo_dir, safe_path)
        if os.path.exists(full_path):
            try:
                with open(full_path, "r", encoding="utf-8", errors="replace") as f:
                    code_content = f.read()
            except Exception:
                code_content = ""
                
    if not code_content:
        return {
            "summary": "File not found or empty.",
            "logic_breakdown": "",
            "complexity": "N/A",
            "security_notes": "",
            "suggested_docs": ""
        }

    # Retrieve context from related files
    raw_chunks = search_repository_vectors(repo_id, file_path, top_k=4)
    context_str = "\n".join([f"Related: {c['file_path']}\n{c['source_code'][:300]}" for c in raw_chunks])
    
    # We pass the first 120 lines to keep within fast token budgets
    truncated_code = "\n".join(code_content.splitlines()[:150])
    raw_explanation = generate_code_explanation(truncated_code, file_path, context_str)
    
    return {
        "summary": raw_explanation,
        "logic_breakdown": "Extracted from source analysis",
        "complexity": "Analyzed in summary",
        "security_notes": "See security considerations in summary",
        "suggested_docs": "Included in summary"
    }
