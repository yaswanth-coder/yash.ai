"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Brain, X, Zap } from "lucide-react";

interface TrainingBannerProps {
  onOpenMemoryModal: () => void;
  onTrainNow: () => void;
  isTraining?: boolean;
}

export default function TrainingBanner({
  onOpenMemoryModal,
  onTrainNow,
  isTraining,
}: TrainingBannerProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Check if dismissed in current session
    const isDismissed = sessionStorage.getItem("yash_memory_banner_dismissed");
    if (!isDismissed) {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem("yash_memory_banner_dismissed", "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="mx-4 sm:mx-6 mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-purple-950/60 border border-blue-500/30 text-white shadow-xl shadow-blue-950/30 backdrop-blur-md animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-blue-500/20">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">
                Personalize Yash.AI Responses
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                Continuous Learning
              </span>
            </div>
            <p className="text-xs text-zinc-300">
              Train the AI on your chat history to automatically adapt to your tech stack, style, and preferences.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={onTrainNow}
            disabled={isTraining}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>{isTraining ? "Analyzing History..." : "Train AI on History"}</span>
          </button>

          <button
            onClick={onOpenMemoryModal}
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700/60 transition-colors"
          >
            Manage Memory
          </button>

          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
