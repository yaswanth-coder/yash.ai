import sys
import io
import os
import base64
import asyncio
import tempfile
from typing import Dict, Any, Optional
from app.tools.base import BaseTool, ToolResult


class PythonSandboxTool(BaseTool):
    name = "python_sandbox"
    description = "Executes Python code in a safe sandbox. Automatically captures printed text and rendered Matplotlib charts/plots as images."

    async def execute(self, code: str, timeout_seconds: float = 8.0, **kwargs) -> ToolResult:
        if not code or not code.strip():
            return ToolResult(
                success=False,
                output={},
                error="Empty python code provided.",
            )

        # Wrap code to intercept matplotlib if imported
        wrapped_code = f"""
import sys, io, os, base64

# Force non-interactive matplotlib backend
try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
except ImportError:
    plt = None

__plot_images__ = []

if plt:
    _orig_show = plt.show
    def _custom_show(*args, **kwargs):
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', dpi=120)
        buf.seek(0)
        img_b64 = base64.b64encode(buf.read()).decode('utf-8')
        __plot_images__.append(img_b64)
        plt.close('all')
    plt.show = _custom_show

# User script execution
try:
{self._indent(code, 4)}
    # If a figure is currently open but show() wasn't explicitly called, save it
    if plt and plt.get_fignums():
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', dpi=120)
        buf.seek(0)
        img_b64 = base64.b64encode(buf.read()).decode('utf-8')
        __plot_images__.append(img_b64)
        plt.close('all')
except Exception as e:
    import traceback
    traceback.print_exc(file=sys.stderr)
finally:
    if __plot_images__:
        print("\\n__YASH_PLOTS_BEGIN__")
        for p in __plot_images__:
            print(p)
        print("__YASH_PLOTS_END__")
"""

        with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, encoding="utf-8") as temp_f:
            temp_f.write(wrapped_code)
            temp_path = temp_f.name

        try:
            python_exe = sys.executable
            proc = await asyncio.create_subprocess_exec(
                python_exe,
                temp_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(
                    proc.communicate(), timeout=timeout_seconds
                )
            except asyncio.TimeoutError:
                proc.kill()
                return ToolResult(
                    success=False,
                    output={},
                    error=f"Execution timed out after {timeout_seconds} seconds.",
                )

            stdout = stdout_bytes.decode("utf-8", errors="replace")
            stderr = stderr_bytes.decode("utf-8", errors="replace")

            # Extract base64 plots
            images = []
            clean_stdout = stdout
            if "__YASH_PLOTS_BEGIN__" in stdout:
                parts = stdout.split("__YASH_PLOTS_BEGIN__")
                clean_stdout = parts[0].strip()
                rest = parts[1].split("__YASH_PLOTS_END__")[0]
                images = [f"data:image/png;base64,{line.strip()}" for line in rest.splitlines() if line.strip()]

            success = proc.returncode == 0 and not ("Traceback" in stderr and not clean_stdout)

            return ToolResult(
                success=success,
                output={
                    "stdout": clean_stdout,
                    "stderr": stderr.strip(),
                    "images": images,
                    "return_code": proc.returncode,
                },
                error=stderr.strip() if proc.returncode != 0 and stderr.strip() else None,
            )

        except Exception as e:
            return ToolResult(
                success=False,
                output={},
                error=str(e),
            )
        finally:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass

    def _indent(self, text: str, spaces: int = 4) -> str:
        prefix = " " * spaces
        return "\n".join(prefix + line if line.strip() else line for line in text.splitlines())
