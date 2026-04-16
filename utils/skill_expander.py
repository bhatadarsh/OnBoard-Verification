def expand_core_skills(core_skills):
    """
    Convert abstract skill labels into evaluable phrases.
    This aligns JD abstractions with resume evidence.
    """
    expansions = []

    for skill in core_skills:
        expansions.append(skill)
        
        # ---------------------------
        # AI / LLM Specific Expansions
        # ---------------------------
        if "LLM" in skill or "Large Language Model" in skill:
            expansions.extend([
                "Design and build LLM-powered applications",
                "Implement LLM-based systems in production",
                "Fine-tune and optimize large language models"
            ])

        if "Agentic" in skill or "Agent" in skill:
            expansions.extend([
                "Build multi-agent workflows",
                "Implement agent-based reasoning systems",
                "Orchestrate autonomous agent interactions"
            ])

        if "Conversational" in skill:
            expansions.extend([
                "Build conversational AI systems",
                "Implement conversational memory and dialogue flow",
                "Design natural language understanding piplines"
            ])

        if "Prompt" in skill:
            expansions.extend([
                "Design prompt templates",
                "Optimize prompts for structured output",
                "Implement prompt engineering techniques"
            ])

        if "RAG" in skill or "retrieval-augmented" in skill.lower():
            expansions.extend([
                "Implement retrieval-augmented generation (RAG) pipelines",
                "Design document ingestion and semantic retrieval",
                "Use vector embeddings and FAISS for semantic search"
            ])
            
        if "LangChain" in skill or "LangGraph" in skill:
            expansions.extend([
                "Use LangChain agents for tool-based reasoning",
                "Build systems using LangGraph for orchestration",
                "Design stateful assistants using LangGraph"
            ])

        # ---------------------------
        # DevOps / Cloud Expansions
        # ---------------------------
        if "CI/CD" in skill or "pipeline" in skill.lower():
            expansions.extend([
                "Design and manage CI/CD pipelines",
                "Automate build and deployment processes",
                "Integrate automated testing into pipelines"
            ])
            
        if "infrastructure" in skill.lower() or "IaC" in skill:
            expansions.extend([
                "Implement infrastructure as code",
                "Provision cloud resources using Terraform or CloudFormation",
                "Manage cloud infrastructure automation"
            ])
            
        if "container" in skill.lower() or "Docker" in skill or "Kubernetes" in skill:
            expansions.extend([
                "Containerize applications using Docker",
                "Manage container orchestration with Kubernetes",
                "Deploy and scale containerized services"
            ])
            
        if "cloud" in skill.lower() or "AWS" in skill or "Azure" in skill or "GCP" in skill:
            expansions.extend([
                "Manage cloud environments",
                "Architect scalable cloud solutions",
                "Optimize cloud resource utilization"
            ])

        # ---------------------------
        # General Engineering Expansions
        # ---------------------------
        # Strict checking for "production" to avoid flagging DevOps as AI
        if "production" in skill.lower() and ("AI" in skill or "model" in skill):
             expansions.extend([
                "Design and build production-grade AI systems",
            ])
        elif "production" in skill.lower():
             expansions.extend([
                "Maintain high-availability production systems",
                "Troubleshoot production incidents"
            ])

        if "backend" in skill.lower():
            expansions.extend([
                "Build scalable backend services",
                "Design RESTful APIs and microservices"
            ])

        if "SQL" in skill or "database" in skill.lower():
             expansions.extend([
                "Design and optimize database schemas",
                "Write complex SQL queries for data analysis"
            ])

    return list(set(expansions))
