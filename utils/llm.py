"""
Shared LLM singleton and prompt loader.
Avoids re-instantiating ChatGroq on every node call.
"""
import os
from functools import lru_cache
from langchain_groq import ChatGroq


@lru_cache(maxsize=None)
def get_llm(model: str = "llama-3.1-8b-instant", temperature: float = 0) -> ChatGroq:
    """Return a cached ChatGroq instance for the given model/temp pair."""
    return ChatGroq(model=model, temperature=temperature)


def load_prompt(relative_path: str) -> str:
    """
    Load a prompt file from Interview_System/resume_intelligence/prompts/
    regardless of where this function is called from.
    """

    # Interview_System/
    project_root = os.path.dirname(os.path.dirname(__file__))

    # Interview_System/resume_intelligence/prompts/<file>
    full_path = os.path.join(project_root, "resume_intelligence", "prompts", relative_path)

    if not os.path.exists(full_path):
        raise FileNotFoundError(
            f"Prompt not found: {full_path}\n"
            f"Expected under Interview_System/resume_intelligence/prompts/{relative_path}"
        )

    with open(full_path, "r", encoding="utf-8") as f:
        return f.read()