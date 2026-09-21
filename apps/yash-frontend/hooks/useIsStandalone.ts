"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect whether Yash.AI is running in standalone installed PWA mode
 * across Android, iOS, Windows, macOS, and Linux.
 */
export function useIsStandalone(): boolean {
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkStandalone = (): boolean => {
      const isMediaQueryStandalone = window.matchMedia("(display-mode: standalone)").matches;
      const isIosStandalone = (window.navigator as any).standalone === true;
      const isAndroidAppReferrer = document.referrer.includes("android-app://");
      const isTwa = window.matchMedia("(display-mode: fullscreen)").matches || window.matchMedia("(display-mode: minimal-ui)").matches;

      return Boolean(isMediaQueryStandalone || isIosStandalone || isAndroidAppReferrer || isTwa);
    };

    setIsStandalone(checkStandalone());

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handler = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return isStandalone;
}

export default useIsStandalone;
