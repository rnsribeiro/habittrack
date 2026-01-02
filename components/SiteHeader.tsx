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
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`ht-btn ${active ? "ht-btn-active" : ""}`}
    >
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
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Título */}
        <div className="flex items-center gap-6">
          <span className="ht-app-title text-lg">
            HabitTrack
          </span>

          {/* Navegação */}
          <nav className="flex items-center gap-2">
            <NavButton href="/habits" label="Visualizar" />
            <NavButton href="/manage" label="Gerenciar" />
            <NavButton href="/dashboard" label="Dashboard" />
          </nav>
        </div>

        {/* Ações */}
        <button onClick={logout} className="ht-btn ht-btn-danger">
          Sair
        </button>
      </div>
    </header>
  );
}
