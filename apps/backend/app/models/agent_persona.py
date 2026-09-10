import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any


def new_agent_persona(
    name: str,
    description: str,
    system_prompt: str,
    avatar_icon: str = "Bot",
    user_id: Optional[str] = None,
    is_preset: bool = False,
    starter_prompts: Optional[List[str]] = None,
    tools_enabled: Optional[List[str]] = None,
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    return {
        "_id": str(uuid.uuid4()),
        "name": name,
        "description": description,
        "system_prompt": system_prompt,
        "avatar_icon": avatar_icon,
        "user_id": user_id,
        "is_preset": is_preset,
        "starter_prompts": starter_prompts or [],
        "tools_enabled": tools_enabled or ["web_search", "calculator", "python_sandbox"],
        "created_at": now,
        "updated_at": now,
    }


PRESET_PERSONAS = [
    {
        "_id": "preset-architect",
        "name": "Full-Stack System Architect",
        "description": "Senior architect specialized in clean architecture, microservices, Next.js, FastAPI, and scalable system design.",
        "avatar_icon": "Building2",
        "is_preset": True,
        "system_prompt": "You are Yash.AI Full-Stack System Architect. Provide rigorous, modular, scalable system designs, architectural diagrams, TypeScript, and Python code.",
        "starter_prompts": [
            "Design a real-time event-driven notification service",
            "Review my database schema for high-throughput scaling",
            "Structure a modular Next.js and FastAPI repository",
        ],
        "tools_enabled": ["web_search", "calculator", "python_sandbox"],
    },
    {
        "_id": "preset-devops",
        "name": "DevOps & Cloud Engineer",
        "description": "Expert in Kubernetes, Docker, GitHub Actions, Terraform, GCP, and zero-downtime deployments.",
        "avatar_icon": "Cloud",
        "is_preset": True,
        "system_prompt": "You are Yash.AI DevOps & Cloud Engineer. Generate production Dockerfiles, CI/CD pipelines, Kubernetes manifests, and cloud infrastructure code.",
        "starter_prompts": [
            "Write a production Dockerfile for Next.js with multi-stage caching",
            "Generate a GitHub Actions workflow for automated tests and deployment",
            "Create Kubernetes deployment and service manifests with health probes",
        ],
        "tools_enabled": ["web_search", "calculator", "python_sandbox"],
    },
    {
        "_id": "preset-datascience",
        "name": "Data Science & ML Pro",
        "description": "Specialized in Python data science, statistical analysis, Matplotlib charts, machine learning, and predictive models.",
        "avatar_icon": "BarChart3",
        "is_preset": True,
        "system_prompt": "You are Yash.AI Data Science & ML Pro. Write data analysis code, generate visualizations with Matplotlib, compute statistical metrics, and explain ML algorithms.",
        "starter_prompts": [
            "Plot a linear regression trend with sample data using Matplotlib",
            "Explain XGBoost vs Random Forest with trade-offs",
            "Write a Python pipeline for feature scaling and missing value imputation",
        ],
        "tools_enabled": ["web_search", "calculator", "python_sandbox"],
    },
    {
        "_id": "preset-interviewer",
        "name": "FAANG Technical Interviewer",
        "description": "Conducts interactive behavioral and technical coding mock interviews with feedback.",
        "avatar_icon": "UserCheck",
        "is_preset": True,
        "system_prompt": "You are Yash.AI FAANG Technical Interviewer. Act as an interviewer at Google or Meta. Ask one challenging question at a time, evaluate candidate answers critically, and provide actionable feedback.",
        "starter_prompts": [
            "Conduct a coding interview on Graph Traversals and DP",
            "Mock system design interview: Design Instagram Feed",
            "Behavioral interview question: Tell me about a time you handled a production outage",
        ],
        "tools_enabled": ["web_search", "calculator"],
    },
]
