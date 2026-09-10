"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * useAuthGuard — redirects unauthenticated users to /login.
 * Returns `ready` (boolean) immediately on client if token exists,
 * avoiding layout flicker and double-hop render delays.
 */
export function useAuthGuard(): boolean {
  const [ready, setReady] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return !!localStorage.getItem("yash_ai_token");
    }
    return false;
  });
  const router = useRouter();

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("yash_ai_token") : null;

    if (!token) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  return ready;
}
