"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Video,
  ArrowLeft,
  Sparkles,
  Layers,
  Clock,
  Film,
  Play,
  RotateCcw,
  Loader2,
  Camera,
} from "lucide-react";
import api from "@/lib/axios";

export default function VideoStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [cameraMotion, setCameraMotion] = useState("Pan Right");
  const [duration, setDuration] = useState("5s");
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleStartGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setSubmitting(true);
    setJobStatus("QUEUED");
    setProgress(10);

    // Simulate async job pipeline
    setTimeout(() => {
      setJobStatus("PROCESSING");
      setProgress(40);
    }, 1000);

    setTimeout(() => {
      setProgress(75);
    }, 2000);

    setTimeout(() => {
      setJobStatus("COMPLETED");
      setProgress(100);
      setSubmitting(false);
    }, 3500);
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
            <div className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Video className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-zinc-100">Yash.AI Video Studio</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
              Async Jobs
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Project: Video Campaign</span>
          </Link>
        </div>
      </header>

      {/* Main Studio View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left: Video Prompt & Camera Controls */}
        <div className="lg:col-span-4 border-r border-zinc-800/80 p-6 space-y-6 bg-zinc-950/50 overflow-y-auto">
          <form onSubmit={handleStartGeneration} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                <Film className="w-3.5 h-3.5 text-purple-400" />
                <span>Scene Prompt</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Drone shot swooping over illuminated futuristic metropolis at midnight..."
                rows={4}
                className="w-full p-3 text-xs bg-zinc-900/90 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
              />
            </div>

            {/* Camera Motion Controls */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                <Camera className="w-3.5 h-3.5 text-purple-400" />
                <span>Camera Motion</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {["Static", "Pan Right", "Pan Left", "Zoom In", "Orbit", "Crane Up"].map((cam) => (
                  <button
                    key={cam}
                    type="button"
                    onClick={() => setCameraMotion(cam)}
                    className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                      cameraMotion === cam
                        ? "bg-purple-600/20 text-purple-400 border-purple-500/40 font-semibold"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    {cam}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>Clip Duration</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["3s", "5s", "10s"].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setDuration(dur)}
                    className={`py-2 text-xs font-medium rounded-xl border transition-all ${
                      duration === dur
                        ? "bg-purple-600/20 text-purple-400 border-purple-500/40 font-semibold"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    {dur}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              type="submit"
              disabled={submitting || !prompt.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{submitting ? "Processing Job..." : "Render Video Scene"}</span>
            </button>
          </form>

          {/* Job Queue Status Card */}
          {jobStatus && (
            <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300">Job Status</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    jobStatus === "COMPLETED"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                  }`}
                >
                  {jobStatus}
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[11px] text-zinc-500 text-right">{progress}% completed</p>
            </div>
          )}
        </div>

        {/* Center: Storyboard Timeline & Video Preview */}
        <div className="lg:col-span-8 p-6 flex flex-col items-center justify-center bg-black relative">
          {jobStatus === "COMPLETED" ? (
            <div className="w-full max-w-2xl space-y-4">
              <div className="aspect-video w-full rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center relative overflow-hidden shadow-2xl group">
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-full bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 mx-auto group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 fill-current" />
                  </div>
                  <p className="text-xs font-semibold text-zinc-300">Render Preview Ready ({duration})</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center space-y-3 p-10 max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                <Film className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold text-zinc-300">Video Canvas</p>
              <p className="text-xs text-zinc-500">
                Configure your scene description, camera angles, and duration on the left to queue video synthesis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
