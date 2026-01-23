"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRequireSession } from "@/src/lib/useRequireSession";
import { apiFetch } from "@/src/lib/api";
import type { Book } from "@/lib/types";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isoToDateInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function barClass(status: Book["status"]) {
  if (status === "finished") return "bg-green-600";
  if (status === "reading") return "bg-blue-600";
  return "bg-zinc-500";
}

export default function ReadingDetailsPage() {
  const { ready } = useRequireSession("/login");
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [newPage, setNewPage] = useState<number>(0);
  const [startedAt, setStartedAt] = useState<string>("");

  const [finishDate, setFinishDate] = useState<string>("");
  const [showFinishPicker, setShowFinishPicker] = useState(false);

  async function load() {
    const { book } = await apiFetch(`/api/books/${id}`);
    setBook(book);
    setNewPage(book.current_page);
    setStartedAt(isoToDateInput(book.started_at));
    setFinishDate(isoToDateInput(book.finished_at) || isoToDateInput(new Date().toISOString()));
  }

  useEffect(() => {
    if (!ready || !id) return;

    (async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        await load();
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Erro ao carregar livro.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, id]);

  const pct = useMemo(() => {
    if (!book) return 0;
    const v = Math.round((book.current_page / book.total_pages) * 100);
    return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
  }, [book]);

  async function updateProgress() {
    if (!book) return;
    setErrorMsg(null);

    const clamped = Math.max(0, Math.min(Number(newPage), book.total_pages));

    setSaving(true);
    try {
      const { book: updated } = await apiFetch(`/api/books/${book.id}/progress`, {
        method: "POST",
        body: JSON.stringify({ new_current_page: clamped }),
      });

      setBook(updated);
      setNewPage(updated.current_page);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Erro ao atualizar progresso.");
    } finally {
      setSaving(false);
    }
  }

  async function saveStartedAt() {
    if (!book) return;
    setErrorMsg(null);

    if (!startedAt) {
      setErrorMsg("Informe a data de início.");
      return;
    }

    setSaving(true);
    try {
      const { book: updated } = await apiFetch(`/api/books/${book.id}`, {
        method: "PATCH",
        body: JSON.stringify({ started_at: startedAt }),
      });

      setBook(updated);
      setStartedAt(isoToDateInput(updated.started_at));
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Erro ao salvar data de início.");
    } finally {
      setSaving(false);
    }
  }

  function openFinishPicker() {
    if (!book) return;
    setErrorMsg(null);

    const suggested = isoToDateInput(book.finished_at) || isoToDateInput(new Date().toISOString());
    setFinishDate(suggested);
    setShowFinishPicker(true);
  }

  async function confirmFinish() {
    if (!book) return;
    setErrorMsg(null);

    if (!finishDate) {
      setErrorMsg("Informe a data de conclusão.");
      return;
    }

    setSaving(true);
    try {
      const { book: updated } = await apiFetch(`/api/books/${book.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "finished",
          finished_at: finishDate,
        }),
      });

      setBook(updated);
      setNewPage(updated.current_page);
      setStartedAt(isoToDateInput(updated.started_at));
      setFinishDate(isoToDateInput(updated.finished_at) || finishDate);
      setShowFinishPicker(false);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Erro ao concluir livro.");
    } finally {
      setSaving(false);
    }
  }

  async function unfinishBackToReading() {
    if (!book) return;
    setErrorMsg(null);

    setSaving(true);
    try {
      const { book: updated } = await apiFetch(`/api/books/${book.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "reading" }),
      });

      setBook(updated);
      setFinishDate(isoToDateInput(new Date().toISOString()));
      setShowFinishPicker(false);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Erro ao voltar para 'lendo'.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!book) return;
    const ok = confirm("Excluir este livro?");
    if (!ok) return;

    setSaving(true);
    try {
      await apiFetch(`/api/books/${book.id}`, { method: "DELETE" });
      router.replace("/reading");
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Erro ao excluir.");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <div className="p-6 text-sm text-zinc-600">Carregando...</div>;
  if (loading) return <div className="p-6 text-sm text-zinc-600">Carregando livro...</div>;
  if (!book) return <div className="p-6 text-sm text-zinc-600">Livro não encontrado.</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between flex-col sm:flex-row gap-3">
        <div>
          <button
            className="text-sm px-3 py-2 rounded-xl border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
            onClick={() => router.push("/reading")}
          >
            ← Voltar
          </button>

          <h1 className="text-xl font-semibold mt-3 text-zinc-900">{book.title}</h1>
          <p className="text-sm text-zinc-700">{book.author}</p>
        </div>

        <div className="flex items-center gap-2">
          {book.status !== "finished" ? (
            <button
              className="text-sm px-4 py-2 rounded-xl border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
              onClick={openFinishPicker}
              disabled={saving}
            >
              Marcar como concluído
            </button>
          ) : (
            <button
              className="text-sm px-4 py-2 rounded-xl border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
              onClick={unfinishBackToReading}
              disabled={saving}
            >
              Voltar para “lendo”
            </button>
          )}

          <button
            className="text-sm px-4 py-2 rounded-xl border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
            onClick={remove}
            disabled={saving}
          >
            Excluir
          </button>
        </div>
      </div>

      {errorMsg ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
          {errorMsg}
        </div>
      ) : null}

      {showFinishPicker ? (
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
            <div>
              <div className="text-sm font-semibold text-zinc-900">Concluir livro</div>
              <div className="text-xs text-zinc-600">
                A data escolhida será salva e usada no paginômetro por período.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="text-sm px-4 py-2 rounded-xl border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
                onClick={() => setShowFinishPicker(false)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                className="text-sm px-4 py-2 rounded-xl bg-black text-white hover:opacity-95 disabled:opacity-60"
                onClick={confirmFinish}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Confirmar conclusão"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-sm text-zinc-800">Data de conclusão</label>
              <input
                className="w-full mt-1 border border-zinc-300 rounded-xl px-3 py-2 text-zinc-900 bg-white"
                type="date"
                value={finishDate}
                onChange={(e) => setFinishDate(e.target.value)}
              />
            </div>

            <button
              className="text-sm px-4 py-2 rounded-xl border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50"
              onClick={() => setFinishDate(isoToDateInput(new Date().toISOString()))}
              disabled={saving}
            >
              Hoje
            </button>
          </div>
        </div>
      ) : null}

      <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-5">
        <div className="flex items-start gap-4">
          <div className="h-28 w-20 rounded-xl border border-zinc-200 bg-zinc-50 overflow-hidden shrink-0">
            {book.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-zinc-500">
                Sem capa
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="h-2 rounded-full bg-zinc-200 overflow-hidden">
              {/* ✅ azul/verde */}
              <div className={`h-full ${barClass(book.status)}`} style={{ width: `${pct}%` }} />
            </div>

            <p className="text-xs text-zinc-600 mt-2">
              Progresso visual por páginas. <b>O paginômetro só conta quando o livro é concluído.</b>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-sm text-zinc-800">Página atual</label>
            <input
              className="w-full mt-1 border border-zinc-300 rounded-xl px-3 py-2 text-zinc-900 bg-white"
              type="number"
              min={0}
              max={book.total_pages}
              value={newPage}
              onChange={(e) => setNewPage(Number(e.target.value))}
            />
          </div>

          <button
            className="text-sm px-4 py-2 rounded-xl border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
            onClick={() => setNewPage(book.total_pages)}
            disabled={saving}
          >
            Ir para final
          </button>

          <button
            className="text-sm px-4 py-2 rounded-xl bg-black text-white hover:opacity-95 disabled:opacity-60"
            onClick={updateProgress}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Atualizar progresso"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-sm text-zinc-800">Data de início da leitura</label>
            <input
              className="w-full mt-1 border border-zinc-300 rounded-xl px-3 py-2 text-zinc-900 bg-white"
              type="date"
              value={startedAt}
              onChange={(e) => setStartedAt(e.target.value)}
            />
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-2">
            <button
              className="text-sm px-4 py-2 rounded-xl border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
              onClick={() => setStartedAt(isoToDateInput(book.started_at))}
              disabled={saving}
              title="Desfaz alterações"
            >
              Descartar
            </button>

            <button
              className="text-sm px-4 py-2 rounded-xl bg-black text-white hover:opacity-95 disabled:opacity-60"
              onClick={saveStartedAt}
              disabled={saving}
            >
              Salvar data de início
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
