"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase/client";

function NavButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link href={href} className={`ht-btn ${active ? "ht-btn-active" : ""}`}>
      {label}
    </Link>
  );
}

export function SiteHeader() {
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="ht-header">
      <div className="mx-auto max-w-7xl">
        <div className="ht-header-shell px-4 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <Link href="/dashboard" className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200/80">
                  Sistema pessoal
                </span>
                <span className="ht-app-title text-2xl">HabitTrack</span>
              </Link>

              <nav className="flex flex-wrap items-center gap-2">
                <NavButton href="/habits" label="Hábitos" />
                <NavButton href="/dashboard" label="Dashboard" />
                <NavButton href="/manage" label="Gerenciar" />
                <NavButton href="/tasks" label="Tarefas" />
                <NavButton href="/reading" label="Leitura" />
              </nav>
            </div>

            <button onClick={logout} className="ht-btn ht-btn-danger self-start lg:self-auto">
              Sair
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
