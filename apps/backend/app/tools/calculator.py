import ast
import operator
import math
from typing import Any
from app.tools.base import BaseTool, ToolResult

SAFE_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

SAFE_FUNCTIONS = {
    "sqrt": math.sqrt,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "log": math.log,
    "log10": math.log10,
    "exp": math.exp,
    "abs": abs,
    "round": round,
    "pi": math.pi,
    "e": math.e,
}


def _safe_eval_node(node: ast.AST) -> Any:
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return node.value
        raise ValueError(f"Unsupported constant type: {type(node.value)}")

    if isinstance(node, ast.BinOp):
        op_type = type(node.op)
        if op_type not in SAFE_OPERATORS:
            raise ValueError(f"Unsupported operator: {op_type}")
        left = _safe_eval_node(node.left)
        right = _safe_eval_node(node.right)
        return SAFE_OPERATORS[op_type](left, right)

    if isinstance(node, ast.UnaryOp):
        op_type = type(node.op)
        if op_type not in SAFE_OPERATORS:
            raise ValueError(f"Unsupported unary operator: {op_type}")
        operand = _safe_eval_node(node.operand)
        return SAFE_OPERATORS[op_type](operand)

    if isinstance(node, ast.Call):
        if isinstance(node.func, ast.Name) and node.func.id in SAFE_FUNCTIONS:
            fn = SAFE_FUNCTIONS[node.func.id]
            args = [_safe_eval_node(arg) for arg in node.args]
            return fn(*args)
        raise ValueError(f"Function call not permitted: {ast.dump(node)}")

    if isinstance(node, ast.Name) and node.id in SAFE_FUNCTIONS:
        return SAFE_FUNCTIONS[node.id]

    raise ValueError(f"Unsupported AST node: {type(node)}")


class CalculatorTool(BaseTool):
    name = "calculator"
    description = "Safely evaluate mathematical and scientific expressions."

    async def execute(self, expression: str, **kwargs) -> ToolResult:
        try:
            expr_clean = expression.strip().replace("^", "**")
            parsed = ast.parse(expr_clean, mode="eval")
            res = _safe_eval_node(parsed.body)
            return ToolResult(success=True, output=res, metadata={"expression": expression})
        except Exception as e:
            return ToolResult(success=False, output=None, error=f"Math evaluation error: {str(e)}")
