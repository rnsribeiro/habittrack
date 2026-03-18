"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";

function NavButton({
  href,
  label,
  className = "",
  onClick,
}: {
  href: string;
  label: string;
  className?: string;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link href={href} onClick={onClick} className={`ht-btn ${active ? "ht-btn-active" : ""} ${className}`.trim()}>
      {label}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="ht-header">
      <div className="mx-auto max-w-7xl">
        <div className="ht-header-shell px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <Link href="/dashboard" className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200/80">Sistema pessoal</span>
              <span className="ht-app-title text-2xl">HabitTrack</span>
            </Link>

            <div className="hidden lg:flex lg:flex-wrap lg:items-center lg:gap-2">
              <NavButton href="/habits" label="Habitos" />
              <NavButton href="/dashboard" label="Dashboard" />
              <NavButton href="/manage" label="Gerenciar" />
              <NavButton href="/tasks" label="Tarefas" />
              <NavButton href="/reading" label="Leitura" />
              <button onClick={logout} className="ht-btn ht-btn-danger">
                Sair
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="ht-btn lg:hidden"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-site-menu"
            >
              {mobileMenuOpen ? "Fechar" : "Menu"}
            </button>
          </div>

          <div id="mobile-site-menu" className={`${mobileMenuOpen ? "mt-4 flex" : "hidden"} flex-col gap-2 lg:hidden`}>
            <NavButton href="/habits" label="Habitos" className="w-full justify-start" onClick={() => setMobileMenuOpen(false)} />
            <NavButton href="/dashboard" label="Dashboard" className="w-full justify-start" onClick={() => setMobileMenuOpen(false)} />
            <NavButton href="/manage" label="Gerenciar" className="w-full justify-start" onClick={() => setMobileMenuOpen(false)} />
            <NavButton href="/tasks" label="Tarefas" className="w-full justify-start" onClick={() => setMobileMenuOpen(false)} />
            <NavButton href="/reading" label="Leitura" className="w-full justify-start" onClick={() => setMobileMenuOpen(false)} />
            <button onClick={logout} className="ht-btn ht-btn-danger w-full justify-start">
              Sair
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
