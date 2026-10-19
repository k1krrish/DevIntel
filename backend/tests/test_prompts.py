from app.ai.llm import SYSTEM_INSTRUCTION

def test_system_prompt_injection_defense():
    assert "CRITICAL RULES" in SYSTEM_INSTRUCTION
    assert "untrusted" in SYSTEM_INSTRUCTION.lower()
    assert "Ignore previous instructions" in SYSTEM_INSTRUCTION or "not system instructions" in SYSTEM_INSTRUCTION
    assert "Never reveal secrets" in SYSTEM_INSTRUCTION
