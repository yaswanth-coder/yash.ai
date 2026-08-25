from langgraph.graph import StateGraph

class PlannerAgent:

    async def run(self, query):

        return {
            "plan": [
                "Understand question",
                "Research",
                "Generate answer"
            ]
        }