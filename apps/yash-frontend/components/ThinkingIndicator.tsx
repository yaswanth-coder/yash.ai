"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Brain, ChevronDown, ChevronUp, Cpu, Orbit } from "lucide-react";

const THINKING_STEPS = [
  { label: "Analyzing prompt & contextual intent", icon: "🧠" },
  { label: "Retrieving relevant knowledge & patterns", icon: "🔍" },
  { label: "Formulating multi-step reasoning path", icon: "⚡" },
  { label: "Synthesizing precise & fluent answer", icon: "✨" },
];

export default function ThinkingIndicator() {
  const [elapsed, setElapsed] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);

  // Timer counter
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 100) / 10);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Step progression
  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStepIndex((prev) => (prev < THINKING_STEPS.length - 1 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(stepInterval);
  }, []);

  const currentStep = THINKING_STEPS[stepIndex];

  return (
    <div className="flex justify-start my-3 sm:my-4 animate-fadeIn w-full min-w-0">
      <div className="flex items-start gap-2.5 sm:gap-3.5 max-w-2xl w-full min-w-0">
        {/* AI Avatar with pulsing orbital aura */}
        <div className="relative shrink-0 mt-0.5">
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-2xl flex items-center justify-center text-white relative z-10"
            style={{
              background: "linear-gradient(135deg, rgba(59,130,246,0.85), rgba(139,92,246,0.85))",
              boxShadow: "0 0 16px rgba(124,92,252,0.45), inset 0 1px 0 rgba(255,255,255,0.25)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white animate-pulse" />
          </div>
          {/* Ambient Glow */}
          <div
            className="absolute -inset-1 rounded-2xl blur-md opacity-70 animate-pulse pointer-events-none"
            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6, #06b6d4)" }}
          />
        </div>

        {/* Liquid Glass Thinking Box */}
        <div
          className="flex-1 rounded-2xl overflow-hidden transition-all duration-300 min-w-0"
          style={{
            background: "rgba(12, 14, 28, 0.75)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(139, 92, 246, 0.22)",
            boxShadow:
              "0 8px 32px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 24px rgba(99,102,241,0.08)",
          }}
        >
          {/* Header Bar */}
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 py-3 flex items-center justify-between cursor-pointer select-none hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: "6s" }} />
                <span className="text-xs font-semibold text-zinc-200 tracking-wide flex items-center gap-1.5">
                  Thinking
                  <span className="text-zinc-500 font-mono text-[11px] font-normal">
                    ({elapsed.toFixed(1)}s)
                  </span>
                </span>
              </div>

              {/* Shimmering pulse pill */}
              <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-300">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
                <span>Deep Reasoning</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-zinc-400">
              <span className="text-[11px] text-zinc-400 font-medium hidden xs:inline">
                {currentStep.label}
              </span>
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </div>
          </div>

          {/* Expanded Step-by-Step Thought Stream */}
          {isExpanded && (
            <div className="px-4 pb-3.5 pt-1 space-y-2.5 border-t border-white/[0.06] animate-fadeIn">
              {/* Animated progress waves */}
              <div className="space-y-1.5 pt-1">
                {THINKING_STEPS.map((step, idx) => {
                  const isDone = idx < stepIndex;
                  const isCurrent = idx === stepIndex;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2.5 text-xs transition-all duration-300 ${
                        isCurrent
                          ? "text-cyan-300 font-medium translate-x-0.5"
                          : isDone
                          ? "text-zinc-400"
                          : "text-zinc-600 opacity-60"
                      }`}
                    >
                      <div className="w-4 flex items-center justify-center shrink-0">
                        {isDone ? (
                          <span className="text-[10px] text-emerald-400">✓</span>
                        ) : isCurrent ? (
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                        )}
                      </div>
                      <span className="text-[11px]">{step.icon}</span>
                      <span className="text-[11px] tracking-wide">{step.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Glowing Neural Waveform Animation */}
              <div className="pt-2 flex items-center justify-between border-t border-white/[0.04]">
                <div className="flex items-center gap-1 h-3">
                  {[40, 75, 55, 90, 65, 80, 45, 95, 60, 85, 50, 70].map((h, i) => (
                    <span
                      key={i}
                      className="w-0.5 rounded-full bg-gradient-to-t from-cyan-500 to-violet-400 animate-pulse"
                      style={{
                        height: `${h}%`,
                        animationDelay: `${i * 0.08}s`,
                        animationDuration: "0.9s",
                      }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5 animate-pulse">
                  <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" style={{ animationDuration: "4s" }} />
                  Thinking...
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
