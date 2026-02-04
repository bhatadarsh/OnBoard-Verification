def expand_core_skills(core_skills):
    """
    Convert abstract skill labels into evaluable phrases.
    This aligns JD abstractions with resume evidence.
    """
    expansions = []

    for skill in core_skills:
        expansions.append(skill)

        if "LLM" in skill:
            expansions.extend([
                "Design and build LLM-powered applications",
                "Implement LLM-based systems in production"
            ])

        if "Agentic" in skill or "Agent" in skill:
            expansions.extend([
                "Build multi-agent workflows",
                "Implement agent-based reasoning systems"
            ])

        if "Conversational" in skill:
            expansions.extend([
                "Build conversational AI systems",
                "Implement conversational memory and dialogue flow"
            ])

        if "Prompt" in skill:
            expansions.extend([
                "Design prompt templates",
                "Optimize prompts for structured output"
            ])

        # Additional domain-specific expansions to better match resume wording
        if "retrieval-augmented" in skill or "RAG" in skill:
            expansions.extend([
                "Implement retrieval-augmented generation (RAG) pipelines",
                "Design document ingestion and semantic retrieval",
                "Use vector embeddings and FAISS for semantic search"
            ])

        if "production" in skill or "production-grade" in skill:
            expansions.extend([
                "Design and build production-grade AI systems",
                "End-to-end system design and backend implementation"
            ])

        if "backend" in skill or "scalable backend" in skill:
            expansions.extend([
                "Build scalable backend services integrating LLMs",
                "Integrate chatbots with backend APIs"
            ])

        if "SQL" in skill or "query" in skill:
            expansions.extend([
                "Convert natural language to SQL queries",
                "Implement SQL generation and validation logic"
            ])

        if "LangChain" in skill or "LangGraph" in skill:
            expansions.extend([
                "Use LangChain agents for tool-based reasoning",
                "Build systems using LangGraph for orchestration",
                "Design stateful assistants using LangGraph"
            ])

        if "evaluate" in skill or "evaluating" in skill:
            expansions.extend([
                "Evaluate LLM responses for relevance and depth",
                "Improve LLM outputs using qualitative and quantitative techniques"
            ])

    return list(set(expansions))
