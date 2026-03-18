"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";
import { useRequireSession } from "@/src/lib/useRequireSession";
import { apiFetch } from "@/src/lib/api";
import type { Book } from "@/lib/types";

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function isoToDateInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function percentage(book: Book) {
  const value = Math.round((book.current_page / book.total_pages) * 100);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

function statusMeta(status: Book["status"]) {
  if (status === "finished") {
    return {
      label: "Concluido",
      badge: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
      bar: "from-emerald-400 to-green-500",
    };
  }

  if (status === "reading") {
    return {
      label: "Lendo",
      badge: "border-sky-300/20 bg-sky-400/10 text-sky-100",
      bar: "from-sky-400 to-cyan-500",
    };
  }

  return {
    label: "Abandonado",
    badge: "border-slate-300/20 bg-slate-400/10 text-slate-100",
    bar: "from-slate-400 to-slate-500",
  };
}

function formatDateBR(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(iso));
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

  const [newPage, setNewPage] = useState(0);
  const [startedAt, setStartedAt] = useState("");
  const [finishDate, setFinishDate] = useState("");
  const [showFinishPicker, setShowFinishPicker] = useState(false);

  useEffect(() => {
    if (!ready || !id) return;

    (async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const response = await apiFetch(`/api/books/${id}`);
        const loadedBook = response.book as Book;

        setBook(loadedBook);
        setNewPage(loadedBook.current_page);
        setStartedAt(isoToDateInput(loadedBook.started_at));
        setFinishDate(isoToDateInput(loadedBook.finished_at) || isoToDateInput(new Date().toISOString()));
      } catch (error: unknown) {
        setErrorMsg(getErrorMessage(error, "Erro ao carregar livro."));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, ready]);

  const pct = useMemo(() => (book ? percentage(book) : 0), [book]);
  const status = useMemo(() => (book ? statusMeta(book.status) : statusMeta("reading")), [book]);

  async function updateProgress() {
    if (!book) return;

    setErrorMsg(null);
    const clamped = Math.max(0, Math.min(Number(newPage), book.total_pages));

    setSaving(true);
    try {
      const response = await apiFetch(`/api/books/${book.id}/progress`, {
        method: "POST",
        body: JSON.stringify({ new_current_page: clamped }),
      });

      const updatedBook = response.book as Book;
      setBook(updatedBook);
      setNewPage(updatedBook.current_page);
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, "Erro ao atualizar progresso."));
    } finally {
      setSaving(false);
    }
  }

  async function saveStartedAt() {
    if (!book) return;
    if (!startedAt) {
      setErrorMsg("Informe a data de inicio.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const response = await apiFetch(`/api/books/${book.id}`, {
        method: "PATCH",
        body: JSON.stringify({ started_at: startedAt }),
      });

      const updatedBook = response.book as Book;
      setBook(updatedBook);
      setStartedAt(isoToDateInput(updatedBook.started_at));
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, "Erro ao salvar a data de inicio."));
    } finally {
      setSaving(false);
    }
  }

  function openFinishPicker() {
    if (!book) return;
    setErrorMsg(null);
    setFinishDate(isoToDateInput(book.finished_at) || isoToDateInput(new Date().toISOString()));
    setShowFinishPicker(true);
  }

  async function confirmFinish() {
    if (!book) return;
    if (!finishDate) {
      setErrorMsg("Informe a data de conclusao.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const response = await apiFetch(`/api/books/${book.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "finished",
          finished_at: finishDate,
        }),
      });

      const updatedBook = response.book as Book;
      setBook(updatedBook);
      setNewPage(updatedBook.current_page);
      setStartedAt(isoToDateInput(updatedBook.started_at));
      setFinishDate(isoToDateInput(updatedBook.finished_at) || finishDate);
      setShowFinishPicker(false);
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, "Erro ao concluir livro."));
    } finally {
      setSaving(false);
    }
  }

  async function unfinishBackToReading() {
    if (!book) return;

    setSaving(true);
    setErrorMsg(null);
    try {
      const response = await apiFetch(`/api/books/${book.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "reading" }),
      });

      const updatedBook = response.book as Book;
      setBook(updatedBook);
      setFinishDate(isoToDateInput(new Date().toISOString()));
      setShowFinishPicker(false);
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, "Erro ao voltar para lendo."));
    } finally {
      setSaving(false);
    }
  }

  async function removeBook() {
    if (!book) return;
    if (!confirm("Excluir este livro?")) return;

    setSaving(true);
    try {
      await apiFetch(`/api/books/${book.id}`, { method: "DELETE" });
      router.replace("/reading");
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, "Erro ao excluir."));
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <div className="p-6 text-sm text-slate-300">Carregando...</div>;
  if (loading) return <div className="p-6 text-sm text-slate-300">Carregando livro...</div>;
  if (!book) return <div className="p-6 text-sm text-slate-300">Livro nao encontrado.</div>;

  return (
    <div className="app-page pb-4">
      <section className="app-surface-dark overflow-hidden p-6 sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="flex flex-col gap-4">
              <button className="app-btn app-btn-secondary w-fit" onClick={() => router.push("/reading")}>
                &larr; Voltar
              </button>

              <div className="h-40 w-28 overflow-hidden rounded-[28px] border border-white/10 bg-white/10 shadow-lg">
                {book.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-300">Sem capa</div>
                )}
              </div>
            </div>

            <div className="max-w-3xl">
              <span className="app-kicker">Leitura em detalhe</span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{book.title}</h1>
              <p className="mt-2 text-lg text-slate-200">{book.author}</p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${status.badge}`}>{status.label}</span>
                <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-sm font-semibold text-white">
                  {book.current_page}/{book.total_pages} paginas
                </span>
                <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-sm font-semibold text-white">
                  {pct}% concluido
                </span>
              </div>

              <div className="mt-5 max-w-2xl">
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full bg-gradient-to-r ${status.bar}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="app-subtle-dark mt-3 text-sm leading-6">
                  O progresso visual acompanha as paginas registradas. O paginometro so conta quando o livro e marcado como
                  concluido.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[20rem] xl:grid-cols-1">
            {book.status !== "finished" ? (
              <button className="app-btn app-btn-secondary" onClick={openFinishPicker} disabled={saving}>
                Marcar como concluido
              </button>
            ) : (
              <button className="app-btn app-btn-secondary" onClick={unfinishBackToReading} disabled={saving}>
                Voltar para lendo
              </button>
            )}

            <button className="app-btn app-btn-danger" onClick={removeBook} disabled={saving}>
              Excluir livro
            </button>
          </div>
        </div>
      </section>

      {errorMsg ? (
        <div className="rounded-[22px] border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-700">{errorMsg}</div>
      ) : null}

      {showFinishPicker ? (
        <section className="app-surface p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">Conclusao</div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">Salvar data final da leitura</h2>
              <p className="mt-2 text-sm text-slate-600">A data escolhida sera usada para o paginometro e para os filtros por ano.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="app-btn app-btn-secondary" onClick={() => setShowFinishPicker(false)} disabled={saving}>
                Cancelar
              </button>
              <button className="app-btn app-btn-primary" onClick={confirmFinish} disabled={saving}>
                {saving ? "Salvando..." : "Confirmar conclusao"}
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,240px)_auto] md:items-end">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Data de conclusao</label>
              <input type="date" className="app-input" value={finishDate} onChange={(event) => setFinishDate(event.target.value)} />
            </div>

            <button className="app-btn app-btn-secondary w-fit" onClick={() => setFinishDate(isoToDateInput(new Date().toISOString()))} disabled={saving}>
              Usar hoje
            </button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="app-surface p-6">
          <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">Progresso</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Atualize a pagina atual e a data de inicio</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3 md:items-end">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Pagina atual</label>
              <input
                className="app-input"
                type="number"
                min={0}
                max={book.total_pages}
                value={newPage}
                onChange={(event) => setNewPage(Number(event.target.value || 0))}
              />
            </div>

            <button className="app-btn app-btn-secondary" onClick={() => setNewPage(book.total_pages)} disabled={saving}>
              Ir para o final
            </button>

            <button className="app-btn app-btn-primary" onClick={updateProgress} disabled={saving}>
              {saving ? "Salvando..." : "Atualizar progresso"}
            </button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3 md:items-end">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Data de inicio</label>
              <input type="date" className="app-input" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} />
            </div>

            <button className="app-btn app-btn-secondary" onClick={() => setStartedAt(isoToDateInput(book.started_at))} disabled={saving}>
              Descartar
            </button>

            <button className="app-btn app-btn-primary" onClick={saveStartedAt} disabled={saving}>
              Salvar inicio
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="app-surface p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">Resumo</div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-sm text-slate-500">Status</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{status.label}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Inicio</div>
                <div className="mt-1 text-base font-semibold text-slate-900">{formatDateBR(book.started_at)}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Conclusao</div>
                <div className="mt-1 text-base font-semibold text-slate-900">{formatDateBR(book.finished_at)}</div>
              </div>
            </div>
          </section>

          <section className="app-surface p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">Historico</div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div>
                Criado em{" "}
                <span className="font-semibold text-slate-900">
                  {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(book.created_at))}
                </span>
              </div>

              <div>
                Atualizado em{" "}
                <span className="font-semibold text-slate-900">
                  {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(book.updated_at))}
                </span>
              </div>

              <div>
                Total de paginas <span className="font-semibold text-slate-900">{book.total_pages}</span>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
