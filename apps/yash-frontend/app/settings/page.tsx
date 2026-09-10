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
  AlertTriangle,
  RefreshCw,
  Zap,
} from "lucide-react";
import { fetchProviders, ProvidersResponse } from "@/services/providers";
import { exportUserData, deleteUserAccount } from "@/services/feedback";
import { getMemorySettings, updateMemorySettings } from "@/services/memory";
import { removeToken } from "@/services/auth";

export default function SettingsPage() {
  const [providersData, setProvidersData] = useState<ProvidersResponse | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [learningEnabled, setLearningEnabled] = useState(true);
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
      const [pRes, memRes] = await Promise.all([fetchProviders(), getMemorySettings()]);
      setProvidersData(pRes);
      setLearningEnabled(memRes.learning_enabled);

      const savedLocalOnly = localStorage.getItem("yash_ai_local_only") === "true";
      setLocalOnly(savedLocalOnly);
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleToggleLearning = async () => {
    const next = !learningEnabled;
    setLearningEnabled(next);
    await updateMemorySettings(next);
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
    <div className="min-h-screen bg-black text-white p-6 sm:p-10 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400" />
                <span>Settings & Architecture Dashboard</span>
              </h1>
              <p className="text-xs text-zinc-400">
                Manage AI provider gateways, memory engine, privacy mode, and user data.
              </p>
            </div>
          </div>
        </div>

        {/* 1. AI Providers Gateway Dashboard */}
        <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>Multi-Provider AI Gateway</span>
            </h2>
            <button
              onClick={loadSettings}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Status</span>
            </button>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Yash.AI automatically routes requests and provides quota/rate-limit fallback across configured local and cloud providers.
          </p>

          {loadingProviders ? (
            <div className="text-xs text-zinc-500 py-4">Probing AI provider health...</div>
          ) : providersData ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {Object.entries(providersData.providers).map(([name, p]) => (
                <div
                  key={name}
                  className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-zinc-200">{name}</span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        p.status === "ONLINE"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : p.status === "DISABLED"
                          ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 flex items-center justify-between">
                    <span>{p.is_local ? "Local Provider" : "Cloud Gateway"}</span>
                    {p.latency_ms !== undefined && p.latency_ms > 0 && (
                      <span className="text-zinc-400 font-mono">{p.latency_ms}ms</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
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

        {/* 3. AI Memory & Learning */}
        <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            <span>AI Memory & Personalization</span>
          </h2>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-zinc-200 block">Continuous Habit Learning</span>
              <span className="text-[11px] text-zinc-500">
                Allow Yash.AI to automatically extract your coding styles, stack preferences, and goals.
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
    </div>
  );
}
