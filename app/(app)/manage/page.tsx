"use client";

import { useEffect, useMemo, useState } from "react";
import type { Habit } from "@/lib/types";
import { apiFetch } from "@/src/lib/api";
import { useRequireSession } from "@/src/lib/useRequireSession";
import { HabitForm } from "@/components/habits/HabitForm";

export default function HabitsManagePage() {
  const { ready } = useRequireSession("/login");

  const [habits, setHabits] = useState<Habit[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
      new Date(now.getFullYear(), now.getMonth(), 1)
    );
  }, [now]);

  async function loadHabits() {
    const { habits } = await apiFetch("/api/habits");
    setHabits(habits);
  }

  useEffect(() => {
    if (!ready) return;
    (async () => {
      setErrorMsg(null);
      try {
        await loadHabits();
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Erro ao carregar hábitos.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function createHabit(payload: { title: string; color: string }) {
    setErrorMsg(null);
    const { habit } = await apiFetch("/api/habits", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setHabits((h) => [...h, habit]);
  }

  async function updateHabit(id: string, patch: Partial<Pick<Habit, "title" | "color">>) {
    setErrorMsg(null);
    setBusyId(id);
    try {
      const { habit } = await apiFetch(`/api/habits/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setHabits((list) => list.map((x) => (x.id === id ? habit : x)));
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Erro ao atualizar.");
    } finally {
      setBusyId(null);
    }
  }

  async function archiveHabit(id: string) {
    setErrorMsg(null);
    setBusyId(id);
    try {
      await apiFetch(`/api/habits/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ archived_at: new Date().toISOString() }),
      });
      setHabits((list) => list.filter((x) => x.id !== id));
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Erro ao arquivar.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteHabit(id: string) {
    setErrorMsg(null);
    setBusyId(id);
    try {
      await apiFetch(`/api/habits/${id}`, { method: "DELETE" });
      setHabits((list) => list.filter((x) => x.id !== id));
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Erro ao excluir.");
    } finally {
      setBusyId(null);
    }
  }

  if (!ready) return <div className="p-6 text-sm text-zinc-600">Carregando...</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h1 className="text-xl font-semibold">Gerenciar hábitos</h1>
          <p className="text-sm text-zinc-600">
            Crie/edite hábitos aqui. A visualização do mês atual ({monthLabel}) fica em “Visualizar”.
          </p>
        </div>
      </div>

      <HabitForm onCreate={createHabit} />

      {errorMsg ? (
        <div className="rounded-xl border bg-zinc-50 px-3 py-2 text-sm">
          {errorMsg}
        </div>
      ) : null}

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b font-medium">Seus hábitos</div>

        {habits.length === 0 ? (
          <div className="p-4 text-sm text-zinc-600">Nenhum hábito cadastrado.</div>
        ) : (
          <ul className="divide-y">
            {habits.map((h) => (
              <li key={h.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <input
                      className="border rounded-lg px-2 py-1 text-sm w-full max-w-[420px]"
                      defaultValue={h.title}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== h.title) updateHabit(h.id, { title: v });
                      }}
                    />
                    <input
                      type="color"
                      className="h-9 w-14 border rounded-lg"
                      defaultValue={h.color}
                      onChange={(e) => updateHabit(h.id, { color: e.target.value })}
                      title="Cor do hábito"
                    />
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    Cor atual: <span style={{ color: h.color }}>{h.color}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={busyId === h.id}
                    onClick={() => archiveHabit(h.id)}
                    className="text-sm px-3 py-2 rounded-xl border bg-white hover:bg-zinc-50 disabled:opacity-60"
                  >
                    Arquivar
                  </button>
                  <button
                    disabled={busyId === h.id}
                    onClick={() => deleteHabit(h.id)}
                    className="text-sm px-3 py-2 rounded-xl border border-red-300 bg-white hover:bg-red-50 text-red-700 disabled:opacity-60"
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-zinc-500">
        Dica: editar o título acontece ao sair do campo (blur).
      </p>
    </div>
  );
}
