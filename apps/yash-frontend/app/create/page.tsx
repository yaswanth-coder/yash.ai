"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  Palette,
  Video,
  Box,
  Code2,
  Music,
  FileText,
  Compass,
  ArrowRight,
  FolderKanban,
  Zap,
} from "lucide-react";

interface StudioCard {
  id: string;
  name: string;
  badge: string;
  category: string;
  description: string;
  icon: any;
  href: string;
  gradient: string;
  features: string[];
}

const studios: StudioCard[] = [
  {
    id: "image",
    name: "Image Studio",
    badge: "Visual AI",
    category: "Generative",
    description: "Multi-provider text-to-image synthesis, variation, style transfers, and canvas editing.",
    icon: Palette,
    href: "/create/image",
    gradient: "from-blue-600/20 via-indigo-600/10 to-transparent",
    features: ["Text-to-Image", "Image-to-Image", "Upscaling", "Style Controls"],
  },
  {
    id: "video",
    name: "Video Studio",
    badge: "Motion AI",
    category: "Generative",
    description: "Timeline-based asynchronous AI video generation, storyboarding, and scene synthesis.",
    icon: Video,
    href: "/create/video",
    gradient: "from-purple-600/20 via-pink-600/10 to-transparent",
    features: ["Text-to-Video", "Storyboarding", "Async Jobs", "Scene Timeline"],
  },
  {
    id: "design",
    name: "Visual Canvas",
    badge: "Infinite Canvas",
    category: "Design",
    description: "Infinite collaborative workspace with shapes, connectors, sticky notes, and AI canvas commands.",
    icon: Sparkles,
    href: "/create/design",
    gradient: "from-emerald-600/20 via-teal-600/10 to-transparent",
    features: ["Infinite Pan & Zoom", "AI Canvas Tools", "Connectors", "Grouping"],
  },
  {
    id: "3d",
    name: "3D Studio",
    badge: "Spatial Engine",
    category: "3D & VR",
    description: "Interactive Three.js viewport, primitive modeling, materials, scene tree, and GLTF/GLB export.",
    icon: Box,
    href: "/create/3d",
    gradient: "from-amber-600/20 via-orange-600/10 to-transparent",
    features: ["3D Viewport", "AI Primitives", "Materials & Lighting", "GLTF Export"],
  },
  {
    id: "code",
    name: "Code Studio",
    badge: "Development",
    category: "Coding",
    description: "Safe sandbox runner, Monaco-style editor, Git preview, and intelligent AI pair programmer.",
    icon: Code2,
    href: "/create/code",
    gradient: "from-cyan-600/20 via-blue-600/10 to-transparent",
    features: ["AST-Validated Sandbox", "Syntax Highlighting", "Live Preview", "Diffs"],
  },
  {
    id: "audio",
    name: "Audio Studio",
    badge: "Voice & Speech",
    category: "Audio",
    description: "Speech-to-text transcription, AI text-to-speech, waveform visualizer, and voice pipelines.",
    icon: Music,
    href: "/create/audio",
    gradient: "from-rose-600/20 via-red-600/10 to-transparent",
    features: ["Text-to-Speech", "Audio Waveforms", "Transcription", "Voice Modes"],
  },
  {
    id: "documents",
    name: "Document Studio",
    badge: "Productivity",
    category: "Documents",
    description: "Distraction-free rich text & markdown workspace with AI summarization and report generation.",
    icon: FileText,
    href: "/create/documents",
    gradient: "from-indigo-600/20 via-blue-600/10 to-transparent",
    features: ["Markdown & WYSIWYG", "AI Summarizer", "Citation Support", "Export to PDF"],
  },
  {
    id: "research",
    name: "Research Studio",
    badge: "Intelligence",
    category: "Research",
    description: "Multi-source deep web investigation, fact checking, citation validation, and synthesis reports.",
    icon: Compass,
    href: "/create/research",
    gradient: "from-violet-600/20 via-indigo-600/10 to-transparent",
    features: ["Live Web Search", "Fact Verification", "Source Attribution", "Deep Synthesis"],
  },
];

export default function CreateHubPage() {
  return (
    <div className="min-h-screen bg-black text-white p-6 sm:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Yash.AI Creation Suite
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-xs text-zinc-400">8 Workspaces Available</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-blue-400" />
              <span>Creative Workspaces</span>
            </h1>
            <p className="text-sm text-zinc-400 max-w-2xl">
              Launch specialized creative studios for images, video, 3D, canvas, code, audio, documents, and research.
              Every creation automatically synchronizes with your universal projects and cloud assets.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/projects"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 transition-colors"
            >
              <FolderKanban className="w-4 h-4 text-blue-400" />
              <span>View Projects</span>
            </Link>
          </div>
        </div>

        {/* Studio Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {studios.map((studio) => {
            const Icon = studio.icon;
            return (
              <div
                key={studio.id}
                className="group relative flex flex-col justify-between p-5 rounded-2xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                {/* Gradient glow background */}
                <div
                  className={`absolute inset-0 bg-gradient-to-b ${studio.gradient} opacity-40 group-hover:opacity-80 transition-opacity pointer-events-none`}
                />

                <div className="relative space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">
                      {studio.badge}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-base font-bold text-zinc-100 group-hover:text-white transition-colors">
                      {studio.name}
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-3 leading-relaxed">
                      {studio.description}
                    </p>
                  </div>

                  {/* Feature tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {studio.features.map((feat) => (
                      <span
                        key={feat}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900/90 text-zinc-400 border border-zinc-800/60"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="relative pt-6">
                  <Link
                    href={studio.href}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-blue-600 text-zinc-200 hover:text-white text-xs font-semibold border border-zinc-800 hover:border-blue-500 transition-all shadow-sm group-hover:shadow-md"
                  >
                    <span>Launch Studio</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
