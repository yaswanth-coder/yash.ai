"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Cpu, Sparkles, Shield, Zap, Check } from "lucide-react";
import { ModelItem, fetchModels } from "@/services/providers";

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  localOnly?: boolean;
}

export default function ModelSelector({
  selectedModel,
  onSelectModel,
  localOnly = false,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<ModelItem[]>([
    { id: "auto", name: "Auto (Best Available)", description: "Intelligent automatic provider routing & failover" },
    { id: "gemini", name: "Gemini 3.6 Flash", description: "Flagship high-speed multimodal AI" },
    { id: "ollama:llama3", name: "Ollama (Local Llama 3)", is_local: true, description: "Runs 100% locally on your machine" },
    { id: "groq:llama-3.3-70b-versatile", name: "Groq (Llama 3.3 70B)", description: "Ultra-fast LPU inference" },
    { id: "anthropic:claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", description: "Advanced reasoning & coding" },
    { id: "openai:gpt-4o", name: "OpenAI GPT-4o", description: "State-of-the-art multimodal intelligence" },
  ]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const list = await fetchModels();
      if (list && list.length > 0) {
        // Prepend Auto option if not present
        const hasAuto = list.some((m) => m.id === "auto");
        if (!hasAuto) {
          setModels([
            { id: "auto", name: "Auto (Best Available)", description: "Intelligent automatic routing & failover" },
            ...list,
          ]);
        } else {
          setModels(list);
        }
      }
    }
    load();
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeModelObj = models.find((m) => m.id === selectedModel) || models[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800/90 text-xs font-semibold text-zinc-200 transition-all shadow-xs"
      >
        {localOnly ? (
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
        ) : activeModelObj.is_local ? (
          <Cpu className="w-3.5 h-3.5 text-purple-400" />
        ) : activeModelObj.id === "auto" ? (
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
        ) : (
          <Zap className="w-3.5 h-3.5 text-amber-400" />
        )}

        <span className="truncate max-w-[140px] sm:max-w-[180px]">
          {localOnly ? "Local Only (Ollama)" : activeModelObj.name}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-72 sm:w-80 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl z-50 p-2 space-y-1 animate-fadeIn">
          <div className="px-3 py-2 border-b border-zinc-800/80 mb-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Select AI Engine</p>
            <p className="text-[10px] text-zinc-500">Auto mode selects the best model with automatic failover.</p>
          </div>

          <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1">
            {models.map((model) => {
              const isSelected = selectedModel === model.id;
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start justify-between gap-2 p-2.5 rounded-xl text-left transition-all ${
                    isSelected
                      ? "bg-blue-600/15 border border-blue-500/30 text-white"
                      : "hover:bg-zinc-900 text-zinc-300 border border-transparent"
                  }`}
                >
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{model.name}</span>
                      {model.is_local && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                          LOCAL
                        </span>
                      )}
                      {model.id === "auto" && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                          AUTO
                        </span>
                      )}
                    </div>
                    {model.description && (
                      <p className="text-[11px] text-zinc-500 line-clamp-1">{model.description}</p>
                    )}
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
