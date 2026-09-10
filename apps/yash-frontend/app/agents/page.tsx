"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bot,
  Building2,
  Cloud,
  BarChart3,
  UserCheck,
  Plus,
  Trash2,
  ArrowLeft,
  Sparkles,
  ChevronRight,
  Cpu,
} from "lucide-react";
import { PersonaItem, fetchPersonas, createPersona, deletePersona } from "@/services/personas";

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Bot,
  Building2,
  Cloud,
  BarChart3,
  UserCheck,
  Cpu,
};

export default function AgentsPage() {
  const [personas, setPersonas] = useState<PersonaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadPersonas();
  }, []);

  const loadPersonas = async () => {
    setLoading(true);
    const list = await fetchPersonas();
    setPersonas(list);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !systemPrompt.trim()) return;
    setCreating(true);
    const p = await createPersona(name.trim(), description.trim(), systemPrompt.trim());
    if (p) setPersonas((prev) => [...prev, p]);
    setCreating(false);
    setShowCreate(false);
    setName("");
    setDescription("");
    setSystemPrompt("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this custom persona?")) return;
    const ok = await deletePersona(id);
    if (ok) setPersonas((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 sm:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-6">
          <div className="flex items-center gap-3">
            <Link href="/chat" className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-400" />
                <span>AI Agents & Personas Studio</span>
              </h1>
              <p className="text-xs text-zinc-400">Pre-built specialist agents and custom AI personas with tailored capabilities.</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Agent</span>
          </button>
        </div>

        {/* Create Form */}
        {showCreate && (
          <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-4 animate-fadeIn">
            <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Design Custom AI Agent</span>
            </h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Agent Name (e.g. Security Researcher)"
                  className="px-3.5 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description"
                  className="px-3.5 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="System Prompt — define how this agent behaves, its expertise, tone, and constraints..."
                rows={4}
                className="w-full px-3.5 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creating || !name.trim() || !systemPrompt.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold disabled:opacity-40 cursor-pointer"
                >
                  {creating ? "Creating..." : "Create Agent"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Agents Grid */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-zinc-300">
            {loading ? "Loading..." : `Agents (${personas.length})`}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {personas.map((persona) => {
              const IconComp = ICON_MAP[persona.avatar_icon] || Bot;
              return (
                <div
                  key={persona.id}
                  className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all group space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/30 to-indigo-600/30 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <IconComp className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-zinc-100">{persona.name}</h3>
                          {persona.is_preset && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
                              PRESET
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">{persona.description}</p>
                      </div>
                    </div>
                    {!persona.is_preset && (
                      <button
                        onClick={() => handleDelete(persona.id)}
                        className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-zinc-900 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Starter prompts */}
                  {persona.starter_prompts.length > 0 && (
                    <div className="space-y-1">
                      {persona.starter_prompts.slice(0, 2).map((prompt, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[11px] text-zinc-400 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 hover:text-zinc-200 cursor-pointer transition-colors"
                        >
                          <span className="truncate">{prompt}</span>
                          <ChevronRight className="w-3 h-3 shrink-0 text-zinc-600" />
                        </div>
                      ))}
                    </div>
                  )}

                  <Link
                    href={`/chat?persona=${persona.id}`}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-semibold mt-1"
                  >
                    <span>Open in Chat →</span>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
