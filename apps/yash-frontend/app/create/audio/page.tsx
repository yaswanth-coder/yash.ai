"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Music,
  ArrowLeft,
  Play,
  Pause,
  Mic,
  Volume2,
  Download,
  Sparkles,
  FileAudio,
} from "lucide-react";

export default function AudioStudioPage() {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("Alloy (Natural)");
  const [speed, setSpeed] = useState("1.0x");
  const [generating, setGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleSynthesize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setHasGenerated(true);
    }, 1200);
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    // Web Speech API fallback for local audio demonstration
    if ("speechSynthesis" in window && !isPlaying) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    } else if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
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
            <div className="w-7 h-7 rounded-lg bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Music className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-zinc-100">Yash.AI Audio Studio</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
              Voice & Speech
            </span>
          </div>
        </div>
      </header>

      {/* Main Studio View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left: Script & Voice Controls */}
        <div className="lg:col-span-5 border-r border-zinc-800/80 p-6 space-y-6 bg-zinc-950/50 overflow-y-auto">
          <form onSubmit={handleSynthesize} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Text to Synthesize</span>
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter narration script or dialogue for AI voice generation..."
                rows={5}
                className="w-full p-3 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 transition-colors resize-none"
              />
            </div>

            {/* Voice Model Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">Voice Persona</label>
              <div className="grid grid-cols-2 gap-2">
                {["Alloy (Natural)", "Echo (Deep)", "Fable (British)", "Nova (Energetic)"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVoice(v)}
                    className={`py-2 px-3 text-xs font-medium rounded-xl border text-left transition-all ${
                      voice === v
                        ? "bg-rose-600/20 text-rose-400 border-rose-500/40 font-semibold"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Speed Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300">Playback Speed</label>
              <div className="grid grid-cols-4 gap-2">
                {["0.8x", "1.0x", "1.2x", "1.5x"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeed(s)}
                    className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                      speed === s
                        ? "bg-rose-600/20 text-rose-400 border-rose-500/40 font-semibold"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={generating || !text.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{generating ? "Generating Audio..." : "Generate Voice Audio"}</span>
            </button>
          </form>
        </div>

        {/* Center/Right: Waveform & Playback Controls */}
        <div className="lg:col-span-7 p-6 flex flex-col items-center justify-center bg-black relative">
          {hasGenerated ? (
            <div className="w-full max-w-xl p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <FileAudio className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">Rendered Audio Track</h3>
                    <p className="text-xs text-zinc-500">{voice} • {speed}</p>
                  </div>
                </div>
              </div>

              {/* Simulated Audio Waveform visualization */}
              <div className="h-20 bg-zinc-900/60 rounded-xl p-3 flex items-center justify-center gap-1.5 overflow-hidden">
                {[40, 60, 25, 90, 45, 70, 85, 30, 95, 60, 40, 75, 50, 80, 65, 35, 90, 70, 45, 60, 80, 30, 95].map(
                  (h, i) => (
                    <div
                      key={i}
                      className={`w-1.5 rounded-full transition-all duration-200 ${
                        isPlaying ? "bg-rose-500 animate-pulse" : "bg-zinc-700"
                      }`}
                      style={{ height: `${isPlaying ? Math.min(100, h * 1.1) : h}%` }}
                    />
                  )
                )}
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={togglePlayback}
                  className="flex items-center gap-2 py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>{isPlaying ? "Pause Speech" : "Play Speech"}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center space-y-3 p-10 max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                <Music className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-zinc-300">Voice Synthesis Canvas</p>
              <p className="text-xs text-zinc-500">
                Enter your text and select a voice profile on the left to render audio.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
