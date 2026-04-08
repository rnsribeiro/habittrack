"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/src/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const { locale, setLocale } = useI18n();

  const copy =
    locale === "en"
      ? {
          login: "Sign in",
          signup: "Create account",
          subtitle: "Track habits day by day, keep tasks organized, and follow your reading progress.",
          email: "Email",
          password: "Password",
          emailPlaceholder: "you@email.com",
          processing: "Processing...",
          createAccount: "Create an account",
          alreadyHaveAccount: "I already have an account",
          tip: "Tip: use a valid email address. Supabase may require confirmation.",
          success: "Account created! Check your email if confirmation is enabled.",
          authError: "Authentication failed.",
          language: "Language",
        }
      : {
          login: "Entrar",
          signup: "Criar conta",
          subtitle: "Acompanhe habitos por dia, organize tarefas e siga seu progresso de leitura.",
          email: "E-mail",
          password: "Senha",
          emailPlaceholder: "voce@email.com",
          processing: "Processando...",
          createAccount: "Criar uma conta",
          alreadyHaveAccount: "Ja tenho conta",
          tip: "Dica: use um e-mail valido. O Supabase pode exigir confirmacao.",
          success: "Conta criada! Verifique seu e-mail se a confirmacao estiver ativa.",
          authError: "Erro ao autenticar.",
          language: "Idioma",
        };

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
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
        else setMsg(copy.success);
      }
    } catch (error: unknown) {
      setMsg(error instanceof Error ? error.message : copy.authError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.06),transparent_60%)]" />

      <div className="w-full max-w-md">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="ht-muted inline-flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-black/80 dark:bg-white/80" />
              HabitTrack
            </p>

            <h1 className="mt-2 text-3xl font-semibold">{mode === "login" ? copy.login : copy.signup}</h1>

            <p className="ht-muted-2 mt-2 text-sm">{copy.subtitle}</p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-xs font-semibold text-slate-200">
            <span className="px-2 text-slate-300">{copy.language}</span>
            <button
              type="button"
              onClick={() => setLocale("pt")}
              className={`rounded-full px-3 py-2 ${locale === "pt" ? "bg-white text-slate-900" : "text-slate-200"}`}
            >
              PT
            </button>
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`rounded-full px-3 py-2 ${locale === "en" ? "bg-white text-slate-900" : "text-slate-200"}`}
            >
              EN
            </button>
          </div>
        </div>

        <div className="ht-card p-6 shadow-[0_20px_60px_rgba(0,0,0,0.20)]">
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">{copy.email}</label>
              <input
                className="w-full rounded-xl px-3 py-2"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={copy.emailPlaceholder}
                autoComplete="email"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-700">{copy.password}</label>
              <input
                className="w-full rounded-xl px-3 py-2"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="........"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            {msg ? <div className="rounded-xl border bg-white/60 px-3 py-2 text-sm dark:bg-black/20">{msg}</div> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-black py-2 text-white disabled:opacity-60 hover:opacity-95"
            >
              {loading ? copy.processing : mode === "login" ? copy.login : copy.signup}
            </button>

            <button
              type="button"
              className="w-full rounded-xl border bg-white py-2 text-zinc-600 hover:bg-zinc-50"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? copy.createAccount : copy.alreadyHaveAccount}
            </button>
          </form>
        </div>

        <p className="mt-4 text-xs text-slate-300">{copy.tip}</p>
      </div>
    </main>
  );
}
