"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

/**
 * Mount this once inside any authenticated layout (founder dashboard, org space).
 * Listens for Supabase auth state changes and redirects to /login with an
 * explanatory message if the session ends unexpectedly while the user is
 * mid-session (token refresh failure, session expiry, manual sign-out from
 * another tab, etc.) — instead of leaving them on a broken page silently
 * failing every subsequent request.
 */
export function useSessionExpiryGuard() {
  const router = useRouter();
  const hasSeenSession = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) hasSeenSession.current = true;
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        if (hasSeenSession.current) {
          router.push("/login?reason=expired");
        }
        return;
      }

      if (session) {
        hasSeenSession.current = true;
      } else if (hasSeenSession.current) {
        // Session dropped to null without an explicit SIGNED_OUT event
        // (e.g. refresh token expired/revoked) — treat the same way.
        router.push("/login?reason=expired");
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [router]);
}
