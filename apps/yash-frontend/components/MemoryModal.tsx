"use client";

import React, { useState, useEffect } from "react";
import {
  Brain,
  Sparkles,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Zap,
  Info,
  RefreshCw,
  Sliders,
  ShieldCheck,
} from "lucide-react";
import {
  MemoryItem,
  fetchMemories,
  addMemory,
  deleteMemory,
  clearAllMemories,
  trainOnHistory,
  getMemorySettings,
  updateMemorySettings,
} from "@/services/memory";

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemoriesUpdated?: (count: number) => void;
}

export default function MemoryModal({ isOpen, onClose, onMemoriesUpdated }: MemoryModalProps) {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState(false);
  const [trainingMsg, setTrainingMsg] = useState<string | null>(null);
  const [learningEnabled, setLearningEnabled] = useState(true);
  const [newFact, setNewFact] = useState("");
  const [newCategory, setNewCategory] = useState("preference");
  const [savingNew, setSavingNew] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, settings] = await Promise.all([fetchMemories(), getMemorySettings()]);
      setMemories(list);
      setLearningEnabled(settings.learning_enabled);
      if (onMemoriesUpdated) onMemoriesUpdated(list.length);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLearning = async () => {
    const nextState = !learningEnabled;
    setLearningEnabled(nextState);
    await updateMemorySettings(nextState);
  };

  const handleTrainOnHistory = async () => {
    setTraining(true);
    setTrainingMsg(null);
    try {
      const res = await trainOnHistory();
      if (res) {
        setMemories(res.memories);
        setTrainingMsg(`✨ Trained AI! Extracted and organized ${res.extracted_count} memories from your history.`);
        if (onMemoriesUpdated) onMemoriesUpdated(res.memories.length);
      }
    } catch (e) {
      setTrainingMsg("Failed to train on history. Please check connection.");
    } finally {
      setTraining(false);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;

    setSavingNew(true);
    try {
      const created = await addMemory(newFact, newCategory);
      if (created) {
        setMemories((prev) => [created, ...prev]);
        setNewFact("");
        if (onMemoriesUpdated) onMemoriesUpdated(memories.length + 1);
      }
    } finally {
      setSavingNew(false);
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteMemory(id);
    if (success) {
      setMemories((prev) => {
        const next = prev.filter((m) => m.id !== id);
        if (onMemoriesUpdated) onMemoriesUpdated(next.length);
        return next;
      });
    }
  };

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to clear all learned memories?")) {
      const success = await clearAllMemories();
      if (success) {
        setMemories([]);
        if (onMemoriesUpdated) onMemoriesUpdated(0);
      }
    }
  };

  if (!isOpen) return null;

  const categoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "skill":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "project":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "style":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>AI Memory & Personal Training</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                  {memories.length} Active
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Yash.AI learns your preferences & habits to craft customized answers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Training Bar */}
        <div className="p-6 border-b border-zinc-800/80 bg-gradient-to-r from-blue-950/20 via-zinc-900/40 to-indigo-950/20 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Toggle Learning */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleLearning}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  learningEnabled ? "bg-blue-600" : "bg-zinc-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    learningEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <div>
                <span className="text-xs font-semibold text-zinc-200 block">
                  Continuous Learning {learningEnabled ? "(Enabled)" : "(Paused)"}
                </span>
                <span className="text-[11px] text-zinc-500">
                  Automatically learn preferences from everyday chats
                </span>
              </div>
            </div>

            {/* Train on History Button */}
            <button
              onClick={handleTrainOnHistory}
              disabled={training}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {training ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing History...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Train AI on Chat History</span>
                </>
              )}
            </button>
          </div>

          {trainingMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{trainingMsg}</span>
            </div>
          )}
        </div>

        {/* Add Custom Memory Form */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/30">
          <form onSubmit={handleAddMemory} className="flex gap-2">
            <input
              type="text"
              value={newFact}
              onChange={(e) => setNewFact(e.target.value)}
              placeholder="Add custom rule (e.g. Always write clean TypeScript code with strict typing)..."
              className="flex-1 px-3.5 py-2 text-xs bg-zinc-900 border border-zinc-700/60 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="px-2.5 py-2 text-xs bg-zinc-900 border border-zinc-700/60 rounded-xl text-zinc-300 focus:outline-none focus:border-blue-500"
            >
              <option value="preference">Preference</option>
              <option value="skill">Skill / Stack</option>
              <option value="project">Project</option>
              <option value="style">Style</option>
            </select>
            <button
              type="submit"
              disabled={savingNew || !newFact.trim()}
              className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>
        </div>

        {/* Memories List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="text-center py-12 text-zinc-500 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading AI memories...</span>
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mx-auto mb-3">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-300">No Memories Extracted Yet</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
                Click <strong>"Train AI on Chat History"</strong> above to extract facts from past conversations, or add custom instructions.
              </p>
              <button
                onClick={handleTrainOnHistory}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Train on History Now</span>
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                <span>Stored Learned Facts ({memories.length})</span>
                <button
                  onClick={handleClearAll}
                  className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              </div>

              {memories.map((m) => (
                <div
                  key={m.id}
                  className="group flex items-start justify-between gap-3 p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 transition-all"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${categoryColor(
                          m.category
                        )}`}
                      >
                        {m.category}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {m.source === "training" ? "From History" : m.source === "chat" ? "From Chat" : "Custom"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-200 leading-relaxed font-sans">{m.fact}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-all"
                    title="Delete Memory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Memories are stored securely in your private MongoDB store.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
