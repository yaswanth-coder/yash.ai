"use client";

import React, { useState } from "react";
import { X, Sparkles, Key, Globe, Layers, AlertCircle, CheckCircle2 } from "lucide-react";
import { addCustomModel, CustomModelItem } from "@/services/providers";

interface AddModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModelAdded?: (model: CustomModelItem) => void;
}

export default function AddModelModal({
  isOpen,
  onClose,
  onModelAdded,
}: AddModelModalProps) {
  const [name, setName] = useState("");
  const [modelId, setModelId] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [apiKey, setApiKey] = useState("");
  const [contextWindow, setContextWindow] = useState("128000");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelId.trim()) {
      setError("Model ID is required (e.g., 'xkiro-v1' or 'grok-2')");
      return;
    }
    if (!apiKey.trim()) {
      setError("API key is required to connect to the model");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const added = await addCustomModel({
        model_id: modelId.trim(),
        name: name.trim() || modelId.trim(),
        base_url: baseUrl.trim() || "https://api.openai.com/v1",
        api_key: apiKey.trim(),
        context_window: parseInt(contextWindow, 10) || 128000,
        description: description.trim(),
      });

      if (added) {
        setSuccess(true);
        if (onModelAdded) {
          onModelAdded(added);
        }
        setTimeout(() => {
          setName("");
          setModelId("");
          setApiKey("");
          setDescription("");
          setSuccess(false);
          onClose();
        }, 900);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to add model");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-lg rounded-2xl p-6 relative space-y-5 shadow-2xl border border-white/10"
        style={{
          background: "rgba(10, 10, 22, 0.95)",
          backdropFilter: "blur(32px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add Custom Model</h2>
              <p className="text-xs text-zinc-400">
                Connect any OpenAI-compatible provider (xKiro, xAI Grok, Ollama, etc.)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Model successfully added and ready to use!</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. xKiro Intelligence"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Model ID <span className="text-blue-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. xkiro-v1 or grok-2"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 mb-1">
              <Globe className="w-3.5 h-3.5 text-zinc-400" />
              <span>Base URL (API Endpoint)</span>
            </label>
            <input
              type="text"
              placeholder="https://api.openai.com/v1 or https://api.xkiro.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 mb-1">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>API Key <span className="text-blue-400">*</span></span>
            </label>
            <input
              type="password"
              placeholder="Paste your API key from xkiro / xAI / provider"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50 font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 mb-1">
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                <span>Context Window</span>
              </label>
              <input
                type="number"
                placeholder="128000"
                value={contextWindow}
                onChange={(e) => setContextWindow(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Fast coding & reasoning"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              {loading ? "Adding Model..." : "Save & Use Model"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
