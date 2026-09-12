"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, Cpu, Sparkles, Shield, Zap, Check } from "lucide-react";
import { ModelItem, fetchModels } from "@/services/providers";

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  localOnly?: boolean;
}

// Valid static fallback models with correct provider-prefixed IDs
const STATIC_MODELS: ModelItem[] = [
  { id: "auto", name: "Auto (Best Available)", description: "Intelligent automatic provider routing & failover" },
  { id: "gemini", name: "Gemini Flash", description: "Fast flagship multimodal AI — default" },
  { id: "nvidia:meta/llama-3.3-70b-instruct", name: "NVIDIA — Llama 3.3 70B", description: "NVIDIA NIM accelerated GPU inference" },
  { id: "nvidia:deepseek-ai/deepseek-r1", name: "NVIDIA — DeepSeek R1", description: "Leading open reasoning model on NVIDIA NIM" },
  { id: "groq:llama-3.3-70b-versatile", name: "Groq — Llama 3.3 70B", description: "Ultra-fast LPU inference" },
  { id: "anthropic:claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", description: "Advanced reasoning & coding" },
  { id: "openai:gpt-4o", name: "OpenAI GPT-4o", description: "State-of-the-art multimodal intelligence" },
  { id: "ollama:llama3", name: "Ollama — Llama 3 (Local)", is_local: true, description: "Runs 100% locally on your machine" },
];

export default function ModelSelector({
  selectedModel,
  onSelectModel,
  localOnly = false,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<ModelItem[]>(STATIC_MODELS);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const list = await fetchModels();
        if (list && list.length > 0) {
          // Only include models with valid provider-prefixed IDs or known bare names
          const validModels = list.filter((m) => {
            const id = m.id.toLowerCase();
            return (
              id === "auto" ||
              id === "gemini" ||
              id.startsWith("gemini:") ||
              id.startsWith("nvidia:") ||
              id.startsWith("anthropic:") ||
              id.startsWith("groq:") ||
              id.startsWith("ollama:") ||
              id.startsWith("openai:")
            );
          });
          const hasAuto = validModels.some((m) => m.id === "auto");
          setModels([
            ...(hasAuto ? [] : [STATIC_MODELS[0]]),
            ...validModels,
          ]);
        }
      } catch {
        // Use static fallback silently
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
      {/* Trigger button — liquid glass */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass-btn flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-200 transition-all"
      >
        {localOnly ? (
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
        ) : activeModelObj?.is_local ? (
          <Cpu className="w-3.5 h-3.5 text-violet-400" />
        ) : activeModelObj?.id === "auto" ? (
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
        ) : (
          <Zap className="w-3.5 h-3.5 text-amber-400" />
        )}
        <span className="truncate max-w-[140px] sm:max-w-[180px]">
          {localOnly ? "Local Only (Ollama)" : activeModelObj?.name}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown — liquid glass */}
      {isOpen && (
        <div
          className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-72 sm:w-80 rounded-2xl z-50 p-2 space-y-0.5 animate-glass-slide-down"
          style={{
            background: "rgba(8, 8, 20, 0.92)",
            backdropFilter: "blur(32px) saturate(200%)",
            WebkitBackdropFilter: "blur(32px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.70), 0 4px 16px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
        >
          {/* Header */}
          <div className="px-3 py-2 mb-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Select AI Engine</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">Auto mode selects best model with automatic failover.</p>
          </div>

          <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-0.5">
            {models.map((model) => {
              const isSelected = selectedModel === model.id;
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-start justify-between gap-2 p-2.5 rounded-xl text-left transition-all"
                  style={isSelected ? {
                    background: "rgba(59,130,246,0.12)",
                    border: "1px solid rgba(59,130,246,0.25)",
                    color: "white",
                  } : {
                    border: "1px solid transparent",
                    color: "rgba(212,212,216,1)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{model.name}</span>
                      {model.is_local && (
                        <span
                          className="text-[9px] px-1.5 rounded font-bold"
                          style={{
                            background: "rgba(124,92,252,0.20)",
                            border: "1px solid rgba(124,92,252,0.30)",
                            color: "rgba(196,181,253,1)",
                          }}
                        >
                          LOCAL
                        </span>
                      )}
                      {model.id === "auto" && (
                        <span
                          className="text-[9px] px-1.5 rounded font-bold"
                          style={{
                            background: "rgba(59,130,246,0.20)",
                            border: "1px solid rgba(59,130,246,0.30)",
                            color: "rgba(147,197,253,1)",
                          }}
                        >
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
