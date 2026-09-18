"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

interface PwaContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isBannerDismissed: boolean;
  showIosGuide: boolean;
  setShowIosGuide: (show: boolean) => void;
  promptInstall: () => Promise<boolean>;
  dismissBanner: () => void;
}

const PwaContext = createContext<PwaContextType>({
  isInstallable: false,
  isInstalled: false,
  isIOS: false,
  isBannerDismissed: false,
  showIosGuide: false,
  setShowIosGuide: () => {},
  promptInstall: async () => false,
  dismissBanner: () => {},
});

export const usePwaInstall = () => useContext(PwaContext);

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // 1. Detect if already running in standalone/installed mode
    const checkInstalled = () => {
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");
      setIsInstalled(isStandalone);
    };

    checkInstalled();
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    mediaQuery.addEventListener("change", handleMediaChange);

    // 2. Detect iOS / iPadOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
    setIsIOS(isIosDevice);

    // 3. Check 7-day dismissal cooldown
    const dismissedUntil = localStorage.getItem("yash_pwa_dismissed_until");
    if (dismissedUntil && parseInt(dismissedUntil, 10) > Date.now()) {
      setIsBannerDismissed(true);
    }

    // 4. Capture beforeinstallprompt (Chromium / Android / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 5. Detect app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    // 6. Register Service Worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[PWA] Service Worker registered with scope:", reg.scope);
          })
          .catch((err) => {
            console.warn("[PWA] Service Worker registration failed:", err);
          });
      });
    }

    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (isInstalled) return false;

    // On iOS Safari, open the step-by-step visual sheet
    if (isIOS) {
      setShowIosGuide(true);
      return true;
    }

    // On Chromium browsers, trigger the native dialog
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === "accepted") {
          setIsInstalled(true);
          setIsInstallable(false);
          setDeferredPrompt(null);
          return true;
        }
      } catch (err) {
        console.warn("[PWA] Error displaying prompt:", err);
      }
    }

    // Fallback if beforeinstallprompt not fired yet (e.g. Chrome desktop menu)
    setShowIosGuide(true);
    return false;
  }, [deferredPrompt, isIOS, isInstalled]);

  const dismissBanner = useCallback(() => {
    setIsBannerDismissed(true);
    // 7-day cooldown
    const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem("yash_pwa_dismissed_until", expiry.toString());
  }, []);

  return (
    <PwaContext.Provider
      value={{
        isInstallable: isInstallable || (isIOS && !isInstalled),
        isInstalled,
        isIOS,
        isBannerDismissed,
        showIosGuide,
        setShowIosGuide,
        promptInstall,
        dismissBanner,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
}
