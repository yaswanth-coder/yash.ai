"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Code2,
  ArrowLeft,
  Play,
  FileCode,
  FolderTree,
  Terminal,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";
import api from "@/lib/axios";

export default function CodeStudioPage() {
  const [activeFile, setActiveFile] = useState("main.py");
  const [code, setCode] = useState(`import matplotlib.pyplot as plt
import numpy as np

# Yash.AI Computational Sandbox
x = np.linspace(0, 10, 100)
y = np.sin(x)

plt.figure(figsize=(6, 4))
plt.plot(x, y, label='Sine Wave', color='#3b82f6', lw=2)
plt.title('AI Generated Signal Analysis')
plt.grid(True, alpha=0.3)
plt.legend()
plt.tight_layout()

print("Signal analysis computation complete.")
`);
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRunCode = async () => {
    setRunning(true);
    setOutput("Executing in verified Python sandbox...");
    try {
      const res = await api.post("/tools/execute", {
        tool_id: "python.sandbox",
        params: { code },
      });
      if (res.data?.data) {
        setOutput(res.data.data.stdout || "Execution completed with no standard output.");
      } else {
        setOutput(JSON.stringify(res.data, null, 2));
      }
    } catch (err: any) {
      setOutput(`Error: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setRunning(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Studio Header */}
      <header className="h-14 border-b border-zinc-800/80 px-6 flex items-center justify-between bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/create"
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Code2 className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-zinc-100">Yash.AI Code Studio</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
              Sandboxed
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy Code"}</span>
          </button>
          <button
            onClick={handleRunCode}
            disabled={running}
            className="py-1.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{running ? "Running..." : "Run Sandbox"}</span>
          </button>
        </div>
      </header>

      {/* Editor & File Tree Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Explorer Sidebar */}
        <div className="lg:col-span-2 border-r border-zinc-800/80 p-4 space-y-4 bg-zinc-950/60 overflow-y-auto">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
            <FolderTree className="w-4 h-4 text-cyan-400" />
            <span>Files Explorer</span>
          </div>
          <div className="space-y-1">
            {["main.py", "models.py", "analysis.ipynb", "requirements.txt"].map((f) => (
              <button
                key={f}
                onClick={() => setActiveFile(f)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                  activeFile === f
                    ? "bg-cyan-500/10 text-cyan-400 font-semibold border border-cyan-500/20"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <FileCode className="w-3.5 h-3.5 shrink-0" />
                <span>{f}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Code Editor */}
        <div className="lg:col-span-6 flex flex-col border-r border-zinc-800/80 bg-zinc-950">
          <div className="h-9 border-b border-zinc-800/80 px-4 flex items-center justify-between text-xs text-zinc-400">
            <span>{activeFile}</span>
            <span className="text-[10px] text-zinc-500 font-mono">Python 3.10+ Sandbox</span>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="flex-1 p-4 bg-transparent font-mono text-xs text-zinc-200 resize-none focus:outline-none leading-relaxed"
          />
        </div>

        {/* Output & Terminal */}
        <div className="lg:col-span-4 flex flex-col bg-black">
          <div className="h-9 border-b border-zinc-800/80 px-4 flex items-center gap-2 text-xs text-zinc-400">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Execution Terminal</span>
          </div>
          <div className="flex-1 p-4 font-mono text-xs overflow-y-auto text-zinc-300 space-y-2">
            {output ? (
              <pre className="whitespace-pre-wrap leading-relaxed">{output}</pre>
            ) : (
              <p className="text-zinc-600">Press 'Run Sandbox' to execute script safely...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
