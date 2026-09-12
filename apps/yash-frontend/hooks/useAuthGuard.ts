"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/services/auth";

/**
 * useAuthGuard — redirects unauthenticated users to /login.
 *
 * - Returns `ready = true` immediately if a token exists in localStorage,
 *   avoiding layout flicker and double-hop render delays.
 * - The user is NEVER logged out automatically by this guard.
 *   Logout only happens when the user clicks "Sign Out".
 */
export function useAuthGuard(): boolean {
  const [ready, setReady] = useState<boolean>(() => isAuthenticated());
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  return ready;
}
