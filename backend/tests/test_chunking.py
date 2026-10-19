import os
import tempfile
from app.services.parsing_service import parse_file

def test_python_parsing_and_chunking():
    sample_code = '''
def calculate_sum(a, b):
    """Adds two numbers."""
    return a + b

class MathService:
    def multiply(self, x, y):
        return x * y
'''
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as f:
        f.write(sample_code)
        f_path = f.name

    try:
        chunks = parse_file(f_path, repo_id=1)
        assert len(chunks) >= 1
        symbols = [c["symbol_name"] for c in chunks]
        assert "calculate_sum" in symbols or "MathService" in symbols or any(c["symbol_type"] == "function_definition" for c in chunks)
    finally:
        os.remove(f_path)
