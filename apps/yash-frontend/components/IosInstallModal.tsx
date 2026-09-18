"use client";

import React from "react";
import { X, Share, PlusSquare, Sparkles, Smartphone } from "lucide-react";
import { usePwaInstall } from "@/context/PwaContext";

export default function IosInstallModal() {
  const { showIosGuide, setShowIosGuide, isIOS } = usePwaInstall();

  if (!showIosGuide) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div
        className="w-full sm:max-w-md bg-neutral-900 border border-white/10 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl space-y-5 text-neutral-100 animate-slide-up"
        style={{
          background: "linear-gradient(180deg, rgba(20, 20, 32, 0.98) 0%, rgba(10, 10, 18, 0.98) 100%)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Install Yash.AI</h3>
              <p className="text-xs text-neutral-400">Add to your Home Screen</p>
            </div>
          </div>
          <button
            onClick={() => setShowIosGuide(false)}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="space-y-3.5 text-xs text-neutral-300">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
              1
            </div>
            <div className="space-y-1">
              <p className="font-medium text-white flex items-center gap-1.5">
                Tap the <Share className="w-3.5 h-3.5 text-blue-400 inline" /> Share button
              </p>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                In Safari, look for the share icon at the bottom of your iPhone screen (or top of iPad).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
              2
            </div>
            <div className="space-y-1">
              <p className="font-medium text-white flex items-center gap-1.5">
                Scroll and tap <PlusSquare className="w-3.5 h-3.5 text-indigo-400 inline" /> Add to Home Screen
              </p>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Scroll down the action list in the share sheet to find "Add to Home Screen".
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
              3
            </div>
            <div className="space-y-1">
              <p className="font-medium text-white">Tap "Add" in top-right</p>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Yash.AI will be saved to your device home screen and open in full-screen standalone mode.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => setShowIosGuide(false)}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Got It, I'll Add It
        </button>
      </div>
    </div>
  );
}
