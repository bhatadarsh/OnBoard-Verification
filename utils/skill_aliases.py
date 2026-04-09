"""
skill_aliases.py

Maps common abbreviations / informal names → canonical skill names, and vice versa.
Used by semantic matching and final scoring to avoid penalising a candidate for
writing "k8s" when the JD says "kubernetes".

Usage:
    from utils.skill_aliases import expand_aliases, ALIAS_MAP

    expand_aliases(["k8s", "ml"])
    # → ["k8s", "kubernetes", "ml", "machine learning"]

Add new entries freely — keep keys lowercase.
"""

from __future__ import annotations

# canonical → [aliases]
_CANONICAL_TO_ALIASES: dict[str, list[str]] = {
    "kubernetes":           ["k8s"],
    "elasticsearch":        ["es", "elastic"],
    "postgresql":           ["postgres", "psql", "pg"],
    "mongodb":              ["mongo"],
    "redis":                ["redis cache"],
    "javascript":           ["js"],
    "typescript":           ["ts"],
    "python":               ["py"],
    "tensorflow":           ["tf"],
    "pytorch":              ["torch"],
    "machine learning":     ["ml"],
    "natural language processing": ["nlp"],
    "large language model": ["llm", "llms"],
    "retrieval augmented generation": ["rag"],
    "amazon web services":  ["aws"],
    "google cloud platform": ["gcp", "google cloud"],
    "microsoft azure":      ["azure"],
    "continuous integration": ["ci"],
    "continuous deployment": ["cd"],
    "ci/cd":                ["ci cd", "cicd"],
    "infrastructure as code": ["iac"],
    "object oriented programming": ["oop"],
    "representational state transfer": ["rest", "rest api", "restful"],
    "graphql":              ["graph ql"],
    "apache kafka":         ["kafka"],
    "apache spark":         ["spark"],
    "apache airflow":       ["airflow"],
    "message queue":        ["mq", "message broker"],
    "vector database":      ["vector db", "vector store"],
    "reinforcement learning": ["rl"],
    "convolutional neural network": ["cnn"],
    "recurrent neural network": ["rnn"],
    "long short-term memory": ["lstm"],
    "application programming interface": ["api"],
    "microservices":        ["micro services", "microservice"],
    "docker":               ["container", "containerisation"],
    "react":                ["reactjs", "react.js"],
    "node.js":              ["nodejs", "node js"],
    "django":               ["django rest framework", "drf"],
    "fastapi":              ["fast api"],
    "flask":                ["flask api"],
    "langchain":            ["lang chain"],
    "hugging face":         ["huggingface", "hf"],
    "fine tuning":          ["fine-tuning", "finetuning"],
    "prompt engineering":   ["prompting", "prompt design"],
    "sql":                  ["structured query language"],
    "nosql":                ["no sql", "non relational"],
    "data pipeline":        ["etl", "elt", "data ingestion"],
    "git":                  ["version control", "github", "gitlab"],
}

# Build reverse map: alias → canonical
_ALIAS_TO_CANONICAL: dict[str, str] = {}
for canonical, aliases in _CANONICAL_TO_ALIASES.items():
    for alias in aliases:
        _ALIAS_TO_CANONICAL[alias.lower()] = canonical

# Full flat map: every term → set of equivalent terms (including itself)
ALIAS_MAP: dict[str, set[str]] = {}

def _register(primary: str, equivalents: list[str]) -> None:
    group: set[str] = {primary} | set(equivalents)
    for term in group:
        ALIAS_MAP.setdefault(term, set()).update(group)

for canonical, aliases in _CANONICAL_TO_ALIASES.items():
    _register(canonical, aliases)


def expand_aliases(skills: list[str]) -> list[str]:
    """
    Given a list of skill strings, return a deduplicated expanded list that
    includes canonical forms and their aliases so fuzzy matching has more
    surface area.

        expand_aliases(["k8s", "postgres"])
        → ["k8s", "kubernetes", "postgres", "postgresql", "psql", "pg"]
    """
    seen: set[str] = set()
    result: list[str] = []
    for skill in skills:
        key = skill.strip().lower()
        if key not in seen:
            seen.add(key)
            result.append(key)
        for equivalent in ALIAS_MAP.get(key, set()):
            if equivalent not in seen:
                seen.add(equivalent)
                result.append(equivalent)
    return result


def canonical(skill: str) -> str:
    """Return the canonical name for a skill, or the skill itself if unknown."""
    return _ALIAS_TO_CANONICAL.get(skill.strip().lower(), skill.strip().lower())


def are_equivalent(a: str, b: str) -> bool:
    """Return True if two skill strings refer to the same concept."""
    ka, kb = a.strip().lower(), b.strip().lower()
    if ka == kb:
        return True
    group_a = ALIAS_MAP.get(ka, {ka})
    return kb in group_a