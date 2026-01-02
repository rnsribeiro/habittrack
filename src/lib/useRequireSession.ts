"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

export function useRequireSession(redirectTo: string = "/login") {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!data.session) {
        router.replace(redirectTo);
        return;
      }

      setSession(data.session);
      setReady(true);
    })();

    // mantém sincronizado se logar/deslogar em outra aba
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;

      if (!newSession) {
        setSession(null);
        setReady(false);
        router.replace(redirectTo);
        return;
      }

      setSession(newSession);
      setReady(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router, redirectTo]);

  return { ready, session };
}
