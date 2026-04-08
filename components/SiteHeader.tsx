"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
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

function LocaleToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useI18n();

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      {(["pt", "en"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setLocale(value)}
          className={`ht-btn h-[2.5rem] min-h-[2.5rem] px-3 text-xs uppercase tracking-[0.12em] ${
            locale === value ? "ht-btn-active" : ""
          }`}
        >
          {value}
        </button>
      ))}
    </div>
  );
}

export function SiteHeader() {
  const router = useRouter();
  const { locale } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const copy =
    locale === "en"
      ? {
          system: "Personal system",
          habits: "Habits",
          dashboard: "Dashboard",
          manage: "Manage",
          tasks: "Tasks",
          reading: "Reading",
          signOut: "Sign out",
          menu: "Menu",
          close: "Close",
        }
      : {
          system: "Sistema pessoal",
          habits: "Habitos",
          dashboard: "Dashboard",
          manage: "Gerenciar",
          tasks: "Tarefas",
          reading: "Leitura",
          signOut: "Sair",
          menu: "Menu",
          close: "Fechar",
        };

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="ht-header">
      <div className="mx-auto max-w-7xl">
        <div className="ht-header-shell px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <Link href="/dashboard" className="flex flex-col" onClick={() => setMobileMenuOpen(false)}>
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200/80">{copy.system}</span>
              <span className="ht-app-title text-2xl">HabitTrack</span>
            </Link>

            <div className="hidden lg:flex lg:flex-wrap lg:items-center lg:gap-2">
              <NavButton href="/habits" label={copy.habits} />
              <NavButton href="/dashboard" label={copy.dashboard} />
              <NavButton href="/manage" label={copy.manage} />
              <NavButton href="/tasks" label={copy.tasks} />
              <NavButton href="/reading" label={copy.reading} />
              <LocaleToggle />
              <button onClick={logout} className="ht-btn ht-btn-danger">
                {copy.signOut}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="ht-btn lg:hidden"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-site-menu"
            >
              {mobileMenuOpen ? copy.close : copy.menu}
            </button>
          </div>

          <div id="mobile-site-menu" className={`${mobileMenuOpen ? "mt-4 flex" : "hidden"} flex-col gap-2 lg:hidden`}>
            <LocaleToggle className="mb-2" />
            <NavButton href="/habits" label={copy.habits} className="w-full justify-start" onClick={() => setMobileMenuOpen(false)} />
            <NavButton href="/dashboard" label={copy.dashboard} className="w-full justify-start" onClick={() => setMobileMenuOpen(false)} />
            <NavButton href="/manage" label={copy.manage} className="w-full justify-start" onClick={() => setMobileMenuOpen(false)} />
            <NavButton href="/tasks" label={copy.tasks} className="w-full justify-start" onClick={() => setMobileMenuOpen(false)} />
            <NavButton href="/reading" label={copy.reading} className="w-full justify-start" onClick={() => setMobileMenuOpen(false)} />
            <button onClick={logout} className="ht-btn ht-btn-danger w-full justify-start">
              {copy.signOut}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
