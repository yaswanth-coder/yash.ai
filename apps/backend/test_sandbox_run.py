import asyncio
from app.tools.python_sandbox import PythonSandboxTool

async def main():
    tool = PythonSandboxTool()
    code = """
import matplotlib.pyplot as plt
plt.plot([1, 2, 3], [4, 5, 6], 'r--')
plt.title('Test Plot')
print("Execution successfully completed!")
"""
    res = await tool.execute(code=code)
    print("SUCCESS:", res.success)
    print("STDOUT:", res.output.get("stdout"))
    print("ERROR:", res.error)
    print("IMAGES COUNT:", len(res.output.get("images", [])))

if __name__ == "__main__":
    asyncio.run(main())
