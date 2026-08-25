"use client";

import React from "react";
import { Sparkles, Code2, BookOpen, Briefcase, Bot } from "lucide-react";

interface EmptyStateProps {
  onSelectSuggestion: (suggestion: string) => void;
}

const SUGGESTIONS = [
  {
    icon: Bot,
    title: "Explain AI agents",
    prompt: "Explain how autonomous AI agents work and their main architecture patterns.",
  },
  {
    icon: Code2,
    title: "Build a FastAPI application",
    prompt: "Show me how to structure a clean, production-ready FastAPI application with SQLAlchemy.",
  },
  {
    icon: BookOpen,
    title: "Create a Python study plan",
    prompt: "Create a comprehensive 4-week Python study plan covering intermediate and advanced topics.",
  },
  {
    icon: Briefcase,
    title: "Help me prepare for an interview",
    prompt: "Help me prepare for a Full-Stack Software Engineer technical interview with sample questions.",
  },
];

export default function EmptyState({ onSelectSuggestion }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-4xl mx-auto px-4 text-center">
      {/* Hero Icon */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white mb-6 shadow-xl shadow-blue-500/10 border border-blue-400/20">
        <Sparkles className="w-8 h-8" />
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent mb-3">
        Where curiosity meets intelligence
      </h1>
      <p className="text-zinc-400 max-w-lg mb-10 text-sm sm:text-base leading-relaxed">
        Ask Yash.AI anything — from writing complex code to brainstorming strategies and analyzing documents.
      </p>

      {/* Suggestion Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-2xl">
        {SUGGESTIONS.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={() => onSelectSuggestion(item.prompt)}
              className="group flex flex-col items-start p-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 transition-all duration-200 text-left shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-2.5 mb-2 text-zinc-300 group-hover:text-blue-400 transition-colors">
                <div className="p-1.5 rounded-lg bg-zinc-800 group-hover:bg-blue-500/10 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm">{item.title}</span>
              </div>
              <p className="text-xs text-zinc-400 line-clamp-2 leading-normal">
                {item.prompt}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
