class ModelRouter:

    def choose_model(self, task):

        if task == "coding":
            return "claude"

        if task == "research":
            return "gemini"

        return "gpt-4"