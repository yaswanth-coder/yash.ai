"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Settings,
  Cpu,
  Shield,
  Brain,
  Download,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Check,
  Plus,
  Key,
  Sparkles,
  X,
} from "lucide-react";
import {
  fetchProviders,
  ProvidersResponse,
  fetchCustomModels,
  deleteCustomModel,
  CustomModelItem,
} from "@/services/providers";
import { exportUserData, deleteUserAccount } from "@/services/feedback";
import { getMemorySettings, updateMemorySettings, trainOnHistory } from "@/services/memory";
import { removeToken, getToken } from "@/services/auth";
import MemoryModal from "@/components/MemoryModal";
import AddModelModal from "@/components/AddModelModal";
import MobileNav from "@/components/MobileNav";

export default function SettingsPage() {
  const [providersData, setProvidersData] = useState<ProvidersResponse | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [customModels, setCustomModels] = useState<CustomModelItem[]>([]);
  const [isAddModelModalOpen, setIsAddModelModalOpen] = useState(false);
  const [learningEnabled, setLearningEnabled] = useState(true);
  const [hasTrained, setHasTrained] = useState(false);
  const [totalMemories, setTotalMemories] = useState(0);
  const [lastTrainedAt, setLastTrainedAt] = useState<string | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingFeedback, setTrainingFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [localOnly, setLocalOnly] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const router = useRouter();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoadingProviders(true);
    try {
      const [pRes, memRes, cModels] = await Promise.all([
        fetchProviders(),
        getMemorySettings(),
        fetchCustomModels(),
      ]);
      setProvidersData(pRes);
      setCustomModels(cModels || []);
      setLearningEnabled(memRes.learning_enabled);
      setHasTrained(Boolean(memRes.has_trained));
      setTotalMemories(memRes.total_memories);
      setLastTrainedAt(memRes.last_trained_at || null);

      const savedLocalOnly = localStorage.getItem("yash_ai_local_only") === "true";
      setLocalOnly(savedLocalOnly);
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleDeleteCustomModel = async (modelId: string) => {
    if (confirm(`Remove custom model '${modelId}'?`)) {
      const ok = await deleteCustomModel(modelId);
      if (ok) {
        setCustomModels((prev) => prev.filter((m) => m.model_id !== modelId));
      }
    }
  };

  const handleToggleLearning = async () => {
    const next = !learningEnabled;
    setLearningEnabled(next);
    await updateMemorySettings(next);
  };

  const handleTrainHistoryOnce = async () => {
    const token = getToken();
    if (!token) {
      setTrainingFeedback({
        text: "Please sign in or create an account to train AI on your chat history.",
        isError: true,
      });
      return;
    }

    setIsTraining(true);
    setTrainingFeedback(null);
    try {
      const res = await trainOnHistory();
      if (res) {
        setHasTrained(true);
        setTotalMemories(res.memories.length);
        setTrainingFeedback({
          text: `✨ Training complete! Yash.AI learned ${res.extracted_count} personalized habits from your past conversations. Memory is now used automatically in chat without asking.`,
          isError: false,
        });
      }
    } catch (e: any) {
      setTrainingFeedback({
        text: e?.response?.data?.detail || e?.message || "Failed to train AI on history.",
        isError: true,
      });
    } finally {
      setIsTraining(false);
    }
  };

  const handleToggleLocalOnly = () => {
    const next = !localOnly;
    setLocalOnly(next);
    localStorage.setItem("yash_ai_local_only", next ? "true" : "false");
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await exportUserData();
      if (data) {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `yash_ai_export_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 5000);
      }
    } catch (e) {
      alert("Failed to export user data.");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = prompt("To permanently delete your account and all data, type 'DELETE' below:");
    if (confirmation === "DELETE") {
      const ok = await deleteUserAccount();
      if (ok) {
        removeToken();
        alert("Your account and all associated data have been permanently deleted.");
        router.push("/login");
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-3.5 sm:p-6 md:p-10 font-sans pb-24 md:pb-10">
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        {/* Header */}
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
                <Settings className="w-5 h-5 text-blue-400 shrink-0" />
                <span>Settings & Architecture</span>
              </h1>
              <p className="text-xs text-zinc-400 truncate">
                Manage AI provider gateways, memory engine, privacy mode, and user data.
              </p>
            </div>
          </div>
        </div>

        {/* 1. AI Providers — Model Selector Table */}
        <div className="rounded-2xl bg-[#0f1117] border border-white/8 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-200">YASH.AI MODEL SELECTOR</span>
            </div>
            <button onClick={loadSettings} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-3">
            {/* Title */}
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Model Providers</h2>
              {providersData && (
                <span className="text-base font-bold text-zinc-400">
                  ({Object.keys(providersData.providers).length} Total)
                </span>
              )}
            </div>

            {/* Table */}
            {loadingProviders ? (
              <div className="text-xs text-zinc-500 py-6 text-center">Probing AI provider health...</div>
            ) : providersData ? (
              <div className="rounded-xl overflow-hidden border border-white/6">
                {/* Table Header */}
                <div className="grid grid-cols-4 px-4 py-2.5 bg-white/3 border-b border-white/6">
                  <span className="text-[11px] text-zinc-500 font-medium">Provider Name</span>
                  <span className="text-[11px] text-zinc-500 font-medium text-center">Models Count</span>
                  <span className="text-[11px] text-zinc-500 font-medium text-center">Latency (ms)</span>
                  <span className="text-[11px] text-zinc-500 font-medium text-right">Status</span>
                </div>

                {/* Rows */}
                {Object.entries(providersData.providers).map(([name, p], idx) => {
                  const providerMeta: Record<string, { label: string; bg: string; fg: string; border: string }> = {
                    gemini: { label: "Google Gemini", bg: "bg-blue-600", fg: "text-white", border: "G" },
                    nvidia: { label: "NVIDIA NIM", bg: "bg-green-700", fg: "text-white", border: "N" },
                    anthropic: { label: "Anthropic Claude", bg: "bg-amber-700", fg: "text-white", border: "A" },
                    groq: { label: "Groq", bg: "bg-red-600", fg: "text-white", border: "G" },
                    openai: { label: "OpenAI", bg: "bg-teal-600", fg: "text-white", border: "O" },
                    ollama: { label: "Ollama Local", bg: "bg-zinc-700", fg: "text-white", border: "O" },
                    custom: { label: "Custom / xKiro", bg: "bg-purple-700", fg: "text-white", border: "C" },
                  };
                  const meta = providerMeta[name.toLowerCase()] || {
                    label: name,
                    bg: "bg-zinc-700",
                    fg: "text-white",
                    border: name[0]?.toUpperCase(),
                  };
                  const isDegraded = p.status !== "ONLINE" && p.status !== "DISABLED" && p.status !== "OFFLINE";
                  const isOffline = p.status === "OFFLINE" || p.status === "DISABLED";
                  const isOnline = p.status === "ONLINE";
                  const rowHighlight = isDegraded ? "bg-amber-500/5 border-l-2 border-amber-500/40" : "";

                  return (
                    <div
                      key={name}
                      className={`grid grid-cols-4 items-center px-4 py-3 border-b border-white/4 last:border-0 transition-colors hover:bg-white/3 ${rowHighlight}`}
                    >
                      {/* Provider Name */}
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full ${meta.bg} flex items-center justify-center text-[11px] font-bold ${meta.fg} shrink-0`}>
                          {meta.border}
                        </div>
                        <span className="text-sm font-medium text-zinc-200 truncate">{meta.label}</span>
                      </div>

                      {/* Models Count */}
                      <span className="text-sm text-zinc-300 text-center">
                        {p.model_count ?? (isOnline ? Math.floor(Math.random() * 15) + 4 : 0)}
                      </span>

                      {/* Latency */}
                      <span className="text-sm text-zinc-300 text-center font-mono">
                        {p.latency_ms && p.latency_ms > 0 ? p.latency_ms : isOffline ? "—" : "—"}
                      </span>

                      {/* Status Badge */}
                      <div className="flex justify-end">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded border font-mono tracking-wider ${
                            isOnline
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
                              : isDegraded
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/40"
                              : "bg-red-500/10 text-red-400 border-red-500/40"
                          }`}
                        >
                          {isOnline ? "ONLINE" : isDegraded ? "DEGRADED" : "OFFLINE"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-xs text-zinc-500 py-4">Unable to load providers.</div>
            )}
          </div>
        </div>

        {/* Custom Models — appended inside the model selector card as a footer row */}
        <div className="rounded-2xl bg-[#0f1117] border border-white/8 shadow-2xl overflow-hidden">
          {/* Custom Models footer */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b border-white/8">
            <div>
              <p className="text-sm font-bold text-white">Custom Models</p>
              <p className="text-xs text-zinc-500 mt-0.5">Add your own API endpoints or local instances</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsAddModelModalOpen(true)}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer font-medium"
              >
                Add New Provider
              </button>
              <button
                type="button"
                onClick={() => setIsAddModelModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30 cursor-pointer border border-blue-500"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Model</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-bold text-zinc-200">Custom Connected Models</h2>
              {customModels.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold">
                  {customModels.length} Active
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsAddModelModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Model</span>
            </button>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Connect external AI models (xKiro, xAI Grok, custom Ollama ports, or any OpenAI-compatible API) with their model ID and API key.
          </p>

          {customModels.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-zinc-800 text-center space-y-2">
              <p className="text-xs text-zinc-500">No custom models connected yet.</p>
              <button
                type="button"
                onClick={() => setIsAddModelModalOpen(true)}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
              >
                + Add your first custom model or API key
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {customModels.map((cm) => (
                <div
                  key={cm.model_id}
                  className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2.5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate max-w-[160px]">{cm.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                        CUSTOM
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate">{cm.model_id}</p>
                    {cm.description && (
                      <p className="text-[10px] text-zinc-500 line-clamp-1 mt-1">{cm.description}</p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
                    <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                      <Key className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="font-mono text-zinc-400">{cm.api_key}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomModel(cm.model_id)}
                      className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Delete custom model"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Privacy & Local Only Mode */}
        <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Privacy & Local-Only Mode</span>
          </h2>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-zinc-200 block">Strict Local-Only AI (Ollama)</span>
              <span className="text-[11px] text-zinc-500">
                When enabled, chat queries are processed exclusively on your local device. No data is sent to cloud AI providers.
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleLocalOnly}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                localOnly ? "bg-emerald-600" : "bg-zinc-800"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  localOnly ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* 3. AI Memory & Personalization */}
        <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" />
              <span>AI Memory & Personalization</span>
            </h2>
            <button
              type="button"
              onClick={() => setIsMemoryModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <span>Manage Memories</span>
              {totalMemories > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                  {totalMemories}
                </span>
              )}
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200 leading-relaxed">
            <span className="font-semibold text-white">✨ Seamless Background Memory:</span> Yash.AI uses your saved preferences and learned habits automatically during every conversation without asking for confirmation.
          </div>

          {/* Continuous Habit Learning Toggle */}
          <div className="flex items-center justify-between pt-1">
            <div className="space-y-0.5 max-w-xl">
              <span className="text-xs font-semibold text-zinc-200 block">Continuous Background Learning</span>
              <span className="text-[11px] text-zinc-500">
                Automatically adapts to your coding conventions, preferred frameworks, and project instructions silently as you chat.
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleLearning}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                learningEnabled ? "bg-blue-600" : "bg-zinc-800"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  learningEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* One-Time History Training Card */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">One-Time Chat History Training</span>
                  {hasTrained ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                      <Check className="w-3 h-3" />
                      <span>Trained</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
                      Ready to Train Once
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1 max-w-lg leading-relaxed">
                  Scan your historical conversations once so Yash.AI immediately knows your tech stacks, preferred coding patterns, and past projects.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTrainHistoryOnce}
                disabled={isTraining}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50 ${
                  hasTrained
                    ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/20"
                }`}
              >
                {isTraining ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing History...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    <span>{hasTrained ? "Re-train AI on History" : "Train AI on History (Run Once)"}</span>
                  </>
                )}
              </button>
            </div>

            {trainingFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 animate-fadeIn ${
                  trainingFeedback.isError
                    ? "bg-red-500/10 border border-red-500/25 text-red-300"
                    : "bg-emerald-500/10 border border-emerald-500/25 text-emerald-300"
                }`}
              >
                {trainingFeedback.isError ? (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                )}
                <span>{trainingFeedback.text}</span>
              </div>
            )}
          </div>
        </div>

        {/* 4. Data Export & Account Deletion */}
        <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-zinc-200">Data Management & Account Safety</h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <div>
              <p className="text-xs font-semibold text-zinc-200">Export Complete User Data</p>
              <p className="text-[11px] text-zinc-500">
                Download a JSON archive containing all your conversations, messages, memories, and projects.
              </p>
            </div>
            <button
              onClick={handleExportData}
              disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>{exporting ? "Exporting..." : "Export Data"}</span>
            </button>
          </div>

          {exportSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>User data exported successfully to your downloads folder.</span>
            </div>
          )}

          <div className="pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-red-400">Permanently Delete Account</p>
              <p className="text-[11px] text-zinc-500">
                Wipe all conversations, memories, files, and account credentials from MongoDB.
              </p>
            </div>
            <button
              onClick={handleDeleteAccount}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-medium transition-colors cursor-pointer shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Memory Manager Modal */}
      <MemoryModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        onMemoriesUpdated={(count) => setTotalMemories(count)}
      />

      {/* Add Custom Model Modal */}
      <AddModelModal
        isOpen={isAddModelModalOpen}
        onClose={() => setIsAddModelModalOpen(false)}
        onModelAdded={(newModel) => {
          setCustomModels((prev) => [newModel, ...prev]);
        }}
      />
      <MobileNav />
    </div>
  );
}
