"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/habits");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        const { data } = await supabase.auth.getSession();
        if (data.session) router.replace("/habits");
        else setMsg("Conta criada! Verifique seu e-mail (se confirmação estiver ativa).");
      }
    } catch (err: any) {
      setMsg(err?.message ?? "Erro ao autenticar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 flex items-center justify-center">
      {/* fundo mais confortável no dark */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.06),transparent_60%)]" />

      <div className="w-full max-w-md">
        <div className="mb-6">
          <p className="inline-flex items-center gap-2 text-sm ht-muted">
            <span className="h-2 w-2 rounded-full bg-black/80 dark:bg-white/80" />
            HabitTrack
          </p>

          <h1 className="text-3xl font-semibold mt-2">
            {mode === "login" ? "Entrar" : "Criar conta"}
          </h1>

          <p className="text-sm mt-2 ht-muted-2">
            Rastreie hábitos por dia, semana, mês e veja seu progresso.
          </p>
        </div>

        <div className="ht-card p-6 shadow-[0_20px_60px_rgba(0,0,0,0.20)]">
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium ht-muted">E-mail</label>
              <input
                className="w-full rounded-xl px-3 py-2"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium ht-muted">Senha</label>
              <input
                className="w-full rounded-xl px-3 py-2"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            {msg && (
              <div className="rounded-xl border px-3 py-2 text-sm bg-white/60 dark:bg-black/20">
                {msg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-black text-white py-2 disabled:opacity-60 hover:opacity-95"
            >
              {loading ? "Processando..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>

            <button
              type="button"
              className="w-full rounded-xl border text-zinc-600 py-2 bg-white hover:bg-zinc-50"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Criar uma conta" : "Já tenho conta"}
            </button>
          </form>
        </div>

        <p className="text-xs ht-muted-2 mt-4">
          Dica: use um e-mail válido (o Supabase pode exigir confirmação).
        </p>
      </div>
    </main>
  );
}
