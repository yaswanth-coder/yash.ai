"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  ImageIcon,
  Video,
  Box,
  Code2,
  Music,
  FileText,
  Search,
  Pen,
} from "lucide-react";
import MobileNav from "@/components/MobileNav";

const studios = [
  {
    id: "image",
    name: "Image Studio",
    description: "AI image generation and editing",
    icon: ImageIcon,
    href: "/create/image",
    // purple gradient — top-right bright, fades bottom-left
    gradient: "radial-gradient(ellipse at 85% 15%, #9333ea 0%, #6d28d9 30%, #1e1b4b 65%, #0a0a0f 100%)",
    iconBg: "bg-purple-500/20",
    iconColor: "text-purple-300",
  },
  {
    id: "video",
    name: "Video Studio",
    description: "Create, edit, and animate professional videos",
    icon: Video,
    href: "/create/video",
    // pink/red gradient
    gradient: "radial-gradient(ellipse at 75% 20%, #f43f5e 0%, #be185d 30%, #4c0519 65%, #0a0a0f 100%)",
    iconBg: "bg-rose-500/20",
    iconColor: "text-rose-300",
  },
  {
    id: "code",
    name: "Code Studio",
    description: "Write, test, and deploy code with AI",
    icon: Code2,
    href: "/create/code",
    // green/teal gradient
    gradient: "radial-gradient(ellipse at 80% 20%, #10b981 0%, #059669 30%, #064e3b 65%, #0a0a0f 100%)",
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-300",
  },
  {
    id: "3d",
    name: "3D Studio",
    description: "Model, texture, and render 3D scenes and assets",
    icon: Box,
    href: "/create/3d",
    // orange gradient
    gradient: "radial-gradient(ellipse at 80% 20%, #f97316 0%, #ea580c 30%, #431407 65%, #0a0a0f 100%)",
    iconBg: "bg-orange-500/20",
    iconColor: "text-orange-300",
  },
  {
    id: "audio",
    name: "Audio Studio",
    description: "Generate, process, and mix audio tracks",
    icon: Music,
    href: "/create/audio",
    // cyan/teal gradient
    gradient: "radial-gradient(ellipse at 20% 20%, #06b6d4 0%, #0891b2 25%, #155e75 55%, #0a0a0f 100%)",
    iconBg: "bg-cyan-500/20",
    iconColor: "text-cyan-300",
  },
  {
    id: "research",
    name: "Deep Research",
    description: "Comprehensive AI-driven data synthesis & analysis",
    icon: Search,
    href: "/create/research",
    // blue/indigo gradient
    gradient: "radial-gradient(ellipse at 40% 30%, #3b82f6 0%, #1d4ed8 30%, #1e1b4b 60%, #0a0a0f 100%)",
    iconBg: "bg-blue-500/20",
    iconColor: "text-blue-300",
  },
  {
    id: "design",
    name: "Design Canvas",
    description: "Vector art, UI/UX design, and digital artwork",
    icon: Pen,
    href: "/create/design",
    // purple/indigo
    gradient: "radial-gradient(ellipse at 60% 25%, #8b5cf6 0%, #6d28d9 30%, #2e1065 60%, #0a0a0f 100%)",
    iconBg: "bg-violet-500/20",
    iconColor: "text-violet-300",
  },
  {
    id: "documents",
    name: "Doc Synthesis",
    description: "Analyze, summarize, and generate dynamic documents",
    icon: FileText,
    href: "/create/documents",
    // yellow/gold gradient
    gradient: "radial-gradient(ellipse at 80% 20%, #eab308 0%, #ca8a04 30%, #713f12 60%, #0a0a0f 100%)",
    iconBg: "bg-yellow-500/20",
    iconColor: "text-yellow-300",
  },
];

export default function CreateHubPage() {
  return (
    <div
      className="min-h-screen text-white font-sans flex flex-col pb-20 md:pb-0"
      style={{ background: "#0a0a0f" }}
    >
      {/* Top Navigation Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-white">Create Studio</span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
          <span className="text-white font-semibold border-b border-white pb-0.5">Dashboard</span>
          <Link href="/projects" className="hover:text-white transition-colors">Projects</Link>
          <Link href="/agents" className="hover:text-white transition-colors">Team</Link>
          <Link href="/settings" className="hover:text-white transition-colors">Settings</Link>
        </nav>

        <div className="flex items-center gap-3">
          <button className="relative w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-xs font-bold text-white select-none">
            YA
          </div>
        </div>
      </header>

      {/* Card Grid */}
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-7xl mx-auto">
          {studios.map((studio) => {
            const Icon = studio.icon;
            return (
              <Link
                key={studio.id}
                href={studio.href}
                className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl cursor-pointer"
                style={{
                  background: studio.gradient,
                  minHeight: "200px",
                }}
              >
                {/* Subtle dark overlay for text readability */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors rounded-2xl" />

                <div className="relative z-10 flex flex-col h-full gap-3">
                  {/* Icon */}
                  <div
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl ${studio.iconBg} backdrop-blur-sm flex items-center justify-center border border-white/10`}
                  >
                    <Icon className={`w-5 h-5 ${studio.iconColor}`} />
                  </div>

                  {/* Title + Description */}
                  <div className="flex-1">
                    <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                      {studio.name}
                    </h2>
                    <p className="text-xs sm:text-[13px] text-white/60 mt-1 leading-relaxed line-clamp-3">
                      {studio.description}
                    </p>
                  </div>

                  {/* Get Started Button */}
                  <button className="w-full py-2 px-4 rounded-xl bg-black/30 hover:bg-black/50 backdrop-blur-sm border border-white/10 hover:border-white/20 text-white text-xs sm:text-sm font-semibold transition-all text-center">
                    Get Started
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
