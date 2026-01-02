// app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace("/habits");
      else router.replace("/login");
    })();
  }, [router]);

  return <div className="p-6 text-sm text-zinc-600">Redirecionando...</div>;
}
