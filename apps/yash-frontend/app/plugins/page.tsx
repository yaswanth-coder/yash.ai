"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Blocks, Globe, Brain, Calculator, FileSearch, ArrowLeft, ShieldCheck, Check } from "lucide-react";
import MobileNav from "@/components/MobileNav";

interface Plugin {
  id: string;
  name: string;
  description: string;
  icon: any;
  enabled: boolean;
  category: string;
}

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<Plugin[]>([
    {
      id: "web_search",
      name: "Real-time Web Search",
      description: "Allows Yash.AI to retrieve public web pages, live news, and documentation with SSRF defense.",
      icon: Globe,
      enabled: true,
      category: "Information",
    },
    {
      id: "memory",
      name: "Long-Term AI Memory",
      description: "Continuously learns persistent user habits, skills, preferences, and instructions.",
      icon: Brain,
      enabled: true,
      category: "Personalization",
    },
    {
      id: "calculator",
      name: "Mathematical & Scientific Engine",
      description: "Safe AST-based arithmetic and equation solver for high precision math.",
      icon: Calculator,
      enabled: true,
      category: "Computation",
    },
    {
      id: "file_rag",
      name: "Document & PDF RAG",
      description: "Extracts, parses, and retrieves semantic chunks from uploaded PDFs, code, and text.",
      icon: FileSearch,
      enabled: true,
      category: "Knowledge",
    },
  ]);

  const togglePlugin = (id: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  return (
    <div className="min-h-screen bg-black text-white p-3.5 sm:p-6 md:p-10 font-sans pb-24 md:pb-10">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
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
                <Blocks className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>AI Tools & Plugins</span>
              </h1>
              <p className="text-xs text-zinc-400 truncate">
                Configure built-in tool capabilities and safe external integrations for Yash.AI.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {plugins.map((plugin) => {
            const Icon = plugin.icon;
            return (
              <div
                key={plugin.id}
                className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <button
                      onClick={() => togglePlugin(plugin.id)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        plugin.enabled ? "bg-blue-600" : "bg-zinc-800"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          plugin.enabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">{plugin.name}</h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{plugin.description}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-900 flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                    {plugin.category}
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Safe Sandbox</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
