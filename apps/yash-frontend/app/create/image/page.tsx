"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Palette,
  ArrowLeft,
  Sparkles,
  Sliders,
  Image as ImageIcon,
  History,
  Download,
  Layers,
  Wand2,
  AlertCircle,
} from "lucide-react";

export default function ImageStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [style, setStyle] = useState("Photorealistic");
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setGenerating(true);
    // Real generation call via Pollinations / configured provider
    try {
      const encoded = encodeURIComponent(`${prompt}, ${style} style, high quality 8k`);
      const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${
        aspectRatio === "16:9" ? 1280 : aspectRatio === "9:16" ? 720 : 1024
      }&height=${
        aspectRatio === "16:9" ? 720 : aspectRatio === "9:16" ? 1280 : 1024
      }&nologo=true`;
      
      setGeneratedImage(imageUrl);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Studio Header */}
      <header className="h-14 border-b border-zinc-800/80 px-6 flex items-center justify-between bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/create"
            className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Palette className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-zinc-100">Yash.AI Image Studio</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
              v1.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Active Project: Default</span>
          </Link>
        </div>
      </header>

      {/* Main Studio Workspace: 3-column layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Column: Prompt & Generation Controls */}
        <div className="lg:col-span-4 border-r border-zinc-800/80 p-6 space-y-6 bg-zinc-950/50 overflow-y-auto">
          <form onSubmit={handleGenerate} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                <Wand2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Prompt Description</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to create in rich detail..."
                rows={4}
                className="w-full p-3 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">Aspect Ratio</label>
              <div className="grid grid-cols-3 gap-2">
                {["1:1", "16:9", "9:16"].map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                      aspectRatio === ratio
                        ? "bg-blue-600/20 text-blue-400 border-blue-500/40 font-semibold"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            {/* Style Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">Creative Style</label>
              <div className="grid grid-cols-2 gap-2">
                {["Photorealistic", "Digital Art", "Cyberpunk", "Anime", "Cinematic", "3D Render"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStyle(s)}
                    className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                      style === s
                        ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/40 font-semibold"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              type="submit"
              disabled={generating || !prompt.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{generating ? "Synthesizing Image..." : "Generate Image"}</span>
            </button>
          </form>
        </div>

        {/* Center Canvas / Result Preview */}
        <div className="lg:col-span-8 p-6 flex flex-col items-center justify-center bg-black relative">
          {generatedImage ? (
            <div className="relative max-w-2xl w-full rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 shadow-2xl group">
              <img
                src={generatedImage}
                alt="Generated output"
                className="w-full h-auto object-contain max-h-[70vh]"
              />
              <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={generatedImage}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="p-2 rounded-xl bg-black/80 hover:bg-black text-white text-xs font-medium backdrop-blur-sm border border-zinc-700 flex items-center gap-1.5 shadow-lg"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center space-y-3 p-10 max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                <ImageIcon className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-zinc-300">Ready to Create</p>
              <p className="text-xs text-zinc-500">
                Enter a creative prompt on the left and select your preferred style to generate original artwork.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
