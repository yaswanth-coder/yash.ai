import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * useAuthGuard — redirects unauthenticated users to /login.
 * Returns `ready` (boolean) that is true only after the auth check has passed,
 * so protected pages can avoid flashing their content before the redirect fires.
 */
export function useAuthGuard(): boolean {
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== "undefined"
      ? localStorage.getItem("yash_ai_token")
      : null;

    if (!token) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  return ready;
}
