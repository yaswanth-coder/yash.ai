"use client";

import React, { useState, useEffect } from "react";
import { WifiOff, RefreshCw, X } from "lucide-react";

export default function OfflineNotice() {
  const [isOffline, setIsOffline] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check initial state
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => {
      setIsOffline(true);
      setDismissed(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen for service worker updates
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                setHasUpdate(true);
              }
            });
          }
        });
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleReload = () => {
    window.location.reload();
  };

  if (!isOffline && !hasUpdate) return null;
  if (dismissed && !hasUpdate) return null;

  return (
    <div
      className="fixed top-3 inset-x-3 sm:top-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto sm:max-w-md z-50 animate-glass-slide-down pointer-events-auto"
      role="status"
      aria-live="polite"
    >
      {isOffline ? (
        <div
          className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-medium text-amber-200 border border-amber-500/30 shadow-2xl"
          style={{
            background: "rgba(30, 20, 10, 0.92)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <span>You&apos;re offline. Reconnect to continue using Yash.AI.</span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg text-amber-400/70 hover:text-amber-200 hover:bg-amber-500/10 transition-colors cursor-pointer"
            aria-label="Dismiss offline alert"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : hasUpdate ? (
        <div
          className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-medium text-blue-200 border border-blue-500/30 shadow-2xl"
          style={{
            background: "rgba(10, 20, 35, 0.92)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-blue-400 shrink-0 animate-spin" />
            <span>New version available</span>
          </div>
          <button
            onClick={handleReload}
            className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
          >
            Refresh to update
          </button>
        </div>
      ) : null}
    </div>
  );
}
