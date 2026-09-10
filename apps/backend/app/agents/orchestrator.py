import re
import logging
from typing import Tuple, List, Dict, Any, Optional
from app.tools.web_search import WebSearchTool
from app.tools.calculator import CalculatorTool
from app.tools.python_sandbox import PythonSandboxTool
from app.tools.registry import get_tool_registry
from app.tools.gateway import ToolGateway
from app.services.rag import get_rag_engine

logger = logging.getLogger("yash.ai.agent")


class AgentOrchestrator:
    def __init__(self):
        self.web_search_tool = WebSearchTool()
        self.calculator_tool = CalculatorTool()
        self.python_sandbox_tool = PythonSandboxTool()
        self.rag_engine = get_rag_engine()
        self.registry = get_tool_registry()
        self.gateway = ToolGateway()

    def _detect_web_search_intent(self, message: str) -> bool:
        triggers = [
            "what is the latest", "current price", "today", "news about", "who is",
            "search for", "look up", "recent updates", "weather in", "latest developments",
            "stock price", "release date of", "what happened to", "latest", "in 2026",
            "breaking news", "score of", "schedule of"
        ]
        lowered = message.lower()
        return any(t in lowered for t in triggers)

    def _detect_calculation_intent(self, message: str) -> Optional[str]:
        math_patterns = [
            r'calculate\s+([0-9\+\-\*\/\^\(\)\.\s\%sqrtlogsinco]+)',
            r'what is\s+([0-9\+\-\*\/\^\(\)\.\s\%]+)\??$',
            r'evaluate\s+([0-9\+\-\*\/\^\(\)\.\s\%]+)',
            r'compute\s+([0-9\+\-\*\/\^\(\)\.\s\%]+)',
            r'(\d+[\s]*[\+\-\*\/][\s]*\d+)',
        ]
        for pattern in math_patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                expr = match.group(1).strip()
                if any(c in expr for c in "+-*/%^"):
                    return expr
        return None

    def _detect_python_code_intent(self, message: str) -> Optional[str]:
        # Check for python code blocks in prompt
        code_block = re.search(r'```(?:python)?\s*([\s\S]+?)```', message)
        if code_block:
            code = code_block.group(1).strip()
            if "import " in code or "print(" in code or "plt." in code or "def " in code:
                return code
        return None

    async def execute_pre_chat_tools(
        self,
        message: str,
        web_search_enabled: bool = True,
        python_exec_enabled: bool = True,
        rag_enabled: bool = True,
    ) -> Tuple[str, List[Dict[str, Any]], List[str]]:
        """
        Executes pre-chat tools and returns (tool_context_string, sources_list, chart_images_list)
        """
        context_parts = []
        sources = []
        chart_images = []

        # 1. Semantic RAG document retrieval
        if rag_enabled:
            rag_results = self.rag_engine.search(message, top_k=2)
            if rag_results:
                rag_snippets = "\n".join([f"[{r['doc_title']}]: {r['text']}" for r in rag_results])
                context_parts.append(
                    f"### Knowledge Base (RAG Retrieved Context):\n{rag_snippets}\n"
                )

        # 2. Safe Web Search
        if web_search_enabled and self._detect_web_search_intent(message):
            try:
                search_query = re.sub(r'^(search for|look up|what is the latest on|who is)\s+', '', message, flags=re.I)
                res = await self.web_search_tool.execute(query=search_query)
                if res.success and res.data.get("results"):
                    results_list = res.data["results"]
                    sources = [
                        {
                            "title": r.get("title", ""),
                            "url": r.get("url", ""),
                            "domain": r.get("domain", ""),
                            "snippet": r.get("snippet", ""),
                        }
                        for r in results_list
                    ]
                    snippets = "\n".join([f"- [{r.get('title')}]({r.get('url')}): {r.get('snippet')}" for r in results_list])
                    context_parts.append(
                        f"### Real-Time Web Search Grounding:\n{snippets}\n(Please cite these sources with link syntax if relevant).\n"
                    )
            except Exception as e:
                logger.warning(f"Web search tool error: {e}")

        # 3. Safe Math Calculation
        math_expr = self._detect_calculation_intent(message)
        if math_expr:
            try:
                calc_res = await self.calculator_tool.execute(expression=math_expr)
                if calc_res.success:
                    result_val = calc_res.output.get("result") if isinstance(calc_res.output, dict) else calc_res.output
                    context_parts.append(
                        f"### Verified Math Evaluation:\nExpression: `{math_expr}` = **`{result_val}`**\n"
                    )
            except Exception as e:
                logger.warning(f"Calculator tool error: {e}")

        # 4. Safe Python Sandbox execution
        if python_exec_enabled:
            py_code = self._detect_python_code_intent(message)
            if py_code:
                try:
                    py_res = await self.python_sandbox_tool.execute(code=py_code)
                    if py_res.success and isinstance(py_res.output, dict):
                        stdout = py_res.output.get("stdout", "")
                        images = py_res.output.get("images", [])
                        if images:
                            chart_images.extend(images)
                        context_parts.append(
                            f"### Verified Python Execution Output:\n```\n{stdout or 'Code executed cleanly.'}\n```\n"
                        )
                except Exception as e:
                    logger.warning(f"Python sandbox error: {e}")

        return "\n".join(context_parts), sources, chart_images


# Global orchestrator singleton
orchestrator_instance = AgentOrchestrator()


def get_orchestrator() -> AgentOrchestrator:
    return orchestrator_instance
