"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadSession, type Session } from "@/lib/session";

/** Hydration-safe session: null on first render everywhere, loaded after mount. */
export function usePortalSession() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      const s = loadSession();
      if (!s || s.studentList.length === 0) {
        router.replace("/login");
        return;
      }
      setSession(s);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);
  return { session, setSession };
}
