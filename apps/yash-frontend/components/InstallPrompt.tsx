"use client";

import React from "react";
import Image from "next/image";
import { Download, X, Sparkles } from "lucide-react";
import { usePwaInstall } from "@/context/PwaContext";

export default function InstallPrompt() {
  const { isInstallable, isInstalled, isBannerDismissed, promptInstall, dismissBanner } =
    usePwaInstall();

  // Do not show if already running as standalone app or dismissed or not installable
  if (isInstalled || isBannerDismissed || !isInstallable) {
    return null;
  }

  return (
    <aside
      aria-label="Install App Banner"
      className="fixed bottom-16 md:bottom-6 left-4 right-4 md:left-auto md:right-6 z-40 max-w-sm mx-auto md:mx-0 p-3.5 rounded-2xl border border-white/15 bg-neutral-950/90 backdrop-blur-2xl shadow-2xl shadow-indigo-950/40 text-neutral-100 flex items-center justify-between gap-3 animate-fade-in"
      style={{
        background: "linear-gradient(135deg, rgba(20, 20, 36, 0.94) 0%, rgba(10, 10, 20, 0.96) 100%)",
        boxShadow: "0 12px 36px rgba(0, 0, 0, 0.6), 0 0 24px rgba(79, 70, 229, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
      }}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 shrink-0 shadow-md shadow-indigo-500/30">
          <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
        </div>
        <div className="overflow-hidden">
          <h4 className="text-xs font-semibold text-white tracking-tight flex items-center gap-1.5 truncate">
            Install Yash.AI
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              App
            </span>
          </h4>
          <p className="text-[11px] text-neutral-400 truncate">
            Fast, full-screen mobile & desktop app
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={promptInstall}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>

        <button
          onClick={dismissBanner}
          className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Dismiss"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
