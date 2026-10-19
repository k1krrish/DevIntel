import pytest
import os
import tempfile
from app.services.parsing_service import detect_language, parse_file
from app.services.intelligence_service import build_architecture_graph, get_git_insights

def test_detect_language_extensions():
    assert detect_language("foo.py") == "python"
    assert detect_language("bar.ts") == "typescript"
    assert detect_language("baz.go") == "go"
    assert detect_language("qux.rs") == "rust"
    assert detect_language("schema.sql") == "sql"
    assert detect_language("script.sh") == "bash"
    assert detect_language("config.yaml") == "yaml"
    assert detect_language("data.json") == "json"
    assert detect_language("README.md") == "markdown"
    assert detect_language("Dockerfile") == "dockerfile"
    assert detect_language("Makefile") == "makefile"

def test_multi_language_ast_chunking():
    with tempfile.TemporaryDirectory() as tmpdir:
        # Python
        py_file = os.path.join(tmpdir, "test.py")
        with open(py_file, "w") as f:
            f.write("def calculate_sum(a, b):\n    return a + b\n\nclass MathService:\n    pass\n")
        chunks = parse_file(py_file, 1)
        assert len(chunks) >= 2
        symbols = [c["symbol_name"] for c in chunks]
        assert "calculate_sum" in symbols
        assert "MathService" in symbols

        # Go
        go_file = os.path.join(tmpdir, "main.go")
        with open(go_file, "w") as f:
            f.write("package main\n\nfunc HandleRequest() string {\n    return \"ok\"\n}\n")
        go_chunks = parse_file(go_file, 1)
        assert len(go_chunks) >= 1
        assert any(c["symbol_name"] == "HandleRequest" for c in go_chunks)

def test_architecture_graph():
    with tempfile.TemporaryDirectory() as tmpdir:
        f1 = os.path.join(tmpdir, "app.js")
        f2 = os.path.join(tmpdir, "service.js")
        with open(f2, "w") as f:
            f.write("export const run = () => {};")
        with open(f1, "w") as f:
            f.write("import { run } from './service';\nrun();")
            
        graph = build_architecture_graph(1, tmpdir)
        assert len(graph["nodes"]) == 2
        assert len(graph["edges"]) == 1
        assert graph["edges"][0]["source"] == "app.js"
        assert graph["edges"][0]["target"] == "service.js"
