"use client";

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Palette,
  ArrowLeft,
  Sparkles,
  Wand2,
  Download,
  Layers,
  ChevronDown,
  RefreshCw,
  Lock,
  Unlock,
  Minus,
  AlertCircle,
  Save,
  Clock,
} from "lucide-react";

const ASPECT_RATIOS = [
  { label: "1:1", value: "1:1", icon: "■" },
  { label: "16:9", value: "16:9", icon: "▬" },
  { label: "9:16", value: "9:16", icon: "▮" },
  { label: "4:3", value: "4:3", icon: "▭" },
  { label: "3:4", value: "3:4", icon: "▯" },
  { label: "3:2", value: "3:2", icon: "▬" },
];

const STYLES = [
  "Photorealistic", "Digital Art", "Cyberpunk", "Anime",
  "Cinematic", "3D Render", "Watercolor", "Oil Painting",
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ImageStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [showNegative, setShowNegative] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [style, setStyle] = useState("Photorealistic");
  const [seed, setSeed] = useState<number | null>(null);
  const [seedLocked, setSeedLocked] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedAssetId, setGeneratedAssetId] = useState<string | null>(null);
  const [savedToProject, setSavedToProject] = useState(false);
  const [history, setHistory] = useState<{ url: string; prompt: string; seed: number | null }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const getToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access_token") || "";
    }
    return "";
  };

  const randomSeed = () => Math.floor(Math.random() * 2147483647);

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    setEnhancing(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/generations/enhance-prompt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ prompt: prompt.trim(), style }),
      });
      if (res.ok) {
        const data = await res.json();
        setPrompt(data.enhanced_prompt);
        promptRef.current?.focus();
      }
    } catch (err) {
      setError("Prompt enhancement unavailable — check network.");
    } finally {
      setEnhancing(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    setSavedToProject(false);
    setProgress(10);

    const usedSeed = seedLocked && seed !== null ? seed : randomSeed();
    if (!seedLocked) setSeed(usedSeed);

    // Animated progress
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 8, 88));
    }, 600);

    try {
      const token = getToken();
      if (token) {
        // Try backend sync generation (persists to asset store)
        try {
          const res = await fetch(`${API_BASE}/generations/generate-image-sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              project_id: "default",
              prompt: prompt.trim(),
              negative_prompt: negativePrompt.trim() || undefined,
              aspect_ratio: aspectRatio,
              style,
              seed: usedSeed,
              model: "flux",
              provider: "pollinations",
            }),
          });

          if (res.ok) {
            const data = await res.json();
            setGeneratedImage(data.url);
            setGeneratedAssetId(data.asset_id);
            setSavedToProject(true);
            setHistory((h) => [{ url: data.url, prompt, seed: usedSeed }, ...h.slice(0, 7)]);
            return;
          }
        } catch { /* fallthrough to direct Pollinations */ }
      }

      // Fallback: direct Pollinations for unauthenticated / dev
      const encoded = encodeURIComponent(
        `${prompt.trim()}, ${style} style, high quality 8k${negativePrompt ? " --no " + negativePrompt : ""}`
      );
      const wMap: Record<string, number> = {
        "1:1": 1024, "16:9": 1280, "9:16": 720, "4:3": 1024, "3:4": 768, "3:2": 1080,
      };
      const hMap: Record<string, number> = {
        "1:1": 1024, "16:9": 720, "9:16": 1280, "4:3": 768, "3:4": 1024, "3:2": 720,
      };
      const w = wMap[aspectRatio] ?? 1024;
      const h = hMap[aspectRatio] ?? 1024;
      const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${w}&height=${h}&seed=${usedSeed}&model=flux&nologo=true`;
      setGeneratedImage(imageUrl);
      setHistory((h) => [{ url: imageUrl, prompt, seed: usedSeed }, ...h.slice(0, 7)]);
    } catch (err) {
      setError("Generation failed. Please try again.");
    } finally {
      clearInterval(progressInterval);
      setProgress(100);
      setTimeout(() => setProgress(0), 800);
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Studio Header */}
      <header className="h-14 border-b border-zinc-800/80 px-5 flex items-center justify-between bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link href="/create" className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Palette className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-zinc-100">Yash.AI Image Studio</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
              Multi-Provider
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {savedToProject && (
            <span className="text-xs text-emerald-400 flex items-center gap-1.5">
              <Save className="w-3 h-3" /> Saved to Project
            </span>
          )}
          <Link href="/projects" className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors">
            <Layers className="w-3.5 h-3.5" />
            <span>Projects</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Panel — Controls */}
        <aside className="lg:col-span-4 xl:col-span-3 border-r border-zinc-800/80 p-5 space-y-5 bg-zinc-950/50 overflow-y-auto">
          <form onSubmit={handleGenerate} className="space-y-5">
            {/* Prompt */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                <Wand2 className="w-3.5 h-3.5 text-blue-400" />
                Prompt
              </label>
              <textarea
                ref={promptRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to create in vivid detail..."
                rows={4}
                className="w-full p-3 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 resize-none transition-colors"
              />
              <button
                type="button"
                onClick={handleEnhancePrompt}
                disabled={!prompt.trim() || enhancing}
                className="w-full py-2 text-xs font-semibold rounded-xl border border-indigo-600/40 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {enhancing ? "Enhancing..." : "Enhance Prompt with AI"}
              </button>
            </div>

            {/* Negative Prompt */}
            <div>
              <button
                type="button"
                onClick={() => setShowNegative((v) => !v)}
                className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
              >
                <Minus className="w-3 h-3" />
                {showNegative ? "Hide" : "Add"} Negative Prompt
              </button>
              {showNegative && (
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="What to avoid: blurry, ugly, watermark..."
                  rows={2}
                  className="mt-2 w-full p-3 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-500/50 resize-none transition-colors"
                />
              )}
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">Aspect Ratio</label>
              <div className="grid grid-cols-3 gap-1.5">
                {ASPECT_RATIOS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setAspectRatio(r.value)}
                    className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                      aspectRatio === r.value
                        ? "bg-blue-600/20 text-blue-400 border-blue-500/40 font-bold"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Style */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">Creative Style</label>
              <div className="grid grid-cols-2 gap-1.5">
                {STYLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStyle(s)}
                    className={`py-1.5 text-xs font-medium rounded-xl border transition-all ${
                      style === s
                        ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/40 font-bold"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Seed */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">Seed</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={seed ?? ""}
                  onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Random"
                  className="flex-1 p-2 text-xs bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setSeed(randomSeed())}
                  className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                  title="Randomize"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSeedLocked((v) => !v)}
                  className={`p-2 rounded-xl border transition-colors ${
                    seedLocked
                      ? "bg-amber-600/20 border-amber-500/40 text-amber-400"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                  title={seedLocked ? "Unlock seed" : "Lock seed"}
                >
                  {seedLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Generate */}
            <button
              type="submit"
              disabled={generating || !prompt.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {generating ? "Synthesizing..." : "Generate Image"}
            </button>
          </form>

          {/* History */}
          {history.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Recent Generations
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {history.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => setGeneratedImage(h.url)}
                    className="aspect-square rounded-lg overflow-hidden border border-zinc-800 hover:border-blue-500/50 transition-colors"
                  >
                    <img src={h.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Center Canvas */}
        <main className="lg:col-span-8 xl:col-span-9 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_#0f0f1a_0%,_#000_100%)] relative overflow-hidden">
          {/* Progress bar */}
          {generating && progress > 0 && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-zinc-900 z-20">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {error && (
            <div className="absolute top-4 left-4 right-4 p-3 rounded-xl bg-red-900/30 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 z-10">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {generatedImage ? (
            <div className="relative w-full h-full flex items-center justify-center p-8">
              <div className="relative group max-w-2xl w-full">
                <img
                  src={generatedImage}
                  alt="Generated output"
                  className="w-full h-auto rounded-2xl border border-zinc-800/60 shadow-2xl shadow-black/60 object-contain max-h-[70vh]"
                />
                {/* Floating action bar */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 backdrop-blur-md border border-zinc-700/60 rounded-2xl px-4 py-2 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity">
                  <a
                    href={generatedImage}
                    download="yash-ai-generated.png"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-zinc-200 hover:text-white px-3 py-1.5 rounded-xl hover:bg-zinc-700/50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                  <div className="w-px h-4 bg-zinc-700" />
                  <button
                    onClick={() => { setPrompt(""); setGeneratedImage(null); setGeneratedAssetId(null); setSavedToProject(false); }}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-zinc-700/50 transition-colors"
                  >
                    New Canvas
                  </button>
                  {generatedAssetId && (
                    <>
                      <div className="w-px h-4 bg-zinc-700" />
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <Save className="w-3 h-3" /> In Gallery
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center space-y-4 p-10 max-w-sm pointer-events-none">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-blue-700/30 flex items-center justify-center">
                <Palette className="w-10 h-10 text-blue-500/60" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-200">Ready to Create</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Enter your vision on the left, choose a style, then click Generate. Your creation will be automatically saved to your project gallery.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
