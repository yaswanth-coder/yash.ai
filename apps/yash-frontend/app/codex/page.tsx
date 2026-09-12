"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Code2, Play, Copy, Check, ArrowLeft, Sparkles, Terminal, FileCode } from "lucide-react";
import { sendMessage } from "@/services/chat";
import ChatMessage from "@/components/ChatMessage";
import MobileNav from "@/components/MobileNav";

export default function CodexPage() {
  const [codePrompt, setCodePrompt] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [solution, setSolution] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codePrompt.trim() || loading) return;

    setLoading(true);
    setSolution(null);
    try {
      const fullPrompt = `You are Yash.AI Codex, an elite software architect. Generate clean, modular, production-ready ${language} code with comments for the following requirement:\n\n${codePrompt}`;
      const res = await sendMessage(fullPrompt, undefined, undefined, "auto", false, false);
      setSolution(res.response);
    } catch (err) {
      setSolution("Error generating code solution. Please ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-3.5 sm:p-6 md:p-10 font-sans pb-24 md:pb-10">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 sm:pb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link
              href="/chat"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-zinc-100 flex items-center gap-2 truncate">
                <Code2 className="w-5 h-5 text-blue-400 shrink-0" />
                <span>Yash.AI Codex</span>
              </h1>
              <p className="text-xs text-zinc-400 truncate">
                Specialized developer coding workspace for architectural generation, refactoring, and debugging.
              </p>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <div className="p-4 sm:p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-4">
          <form onSubmit={handleGenerate} className="space-y-3">
            <div className="flex items-center gap-3">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="rust">Rust</option>
                <option value="go">Go</option>
                <option value="sql">SQL / Postgres</option>
                <option value="docker">Dockerfile / Compose</option>
              </select>
              <span className="text-xs text-zinc-500">Target Language / Framework</span>
            </div>

            <textarea
              value={codePrompt}
              onChange={(e) => setCodePrompt(e.target.value)}
              placeholder="Describe the component, algorithm, API route, or system architecture you want to build..."
              rows={4}
              className="w-full p-3.5 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none font-mono"
            />

            <button
              type="submit"
              disabled={loading || !codePrompt.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 disabled:opacity-40 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{loading ? "Architecting Solution..." : "Generate Code"}</span>
            </button>
          </form>
        </div>

        {/* Output Area */}
        {solution && (
          <div className="space-y-2 animate-fadeIn">
            <h2 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Generated Solution</span>
            </h2>
            <ChatMessage role="assistant" content={solution} />
          </div>
        )}
      </div>
      <MobileNav />
    </div>
  );
}
