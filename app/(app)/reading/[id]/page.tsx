"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { intlLocale } from "@/lib/locale";
import type { Book } from "@/lib/types";
import { apiFetch } from "@/src/lib/api";
import { useRequireSession } from "@/src/lib/useRequireSession";

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

function statusMeta(status: Book["status"], locale: "pt" | "en") {
  if (status === "finished") {
    return {
      label: locale === "en" ? "Finished" : "Concluido",
      badge: "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
      bar: "from-emerald-400 to-green-500",
    };
  }

  if (status === "reading") {
    return {
      label: locale === "en" ? "Reading" : "Lendo",
      badge: "border-sky-300/20 bg-sky-400/10 text-sky-100",
      bar: "from-sky-400 to-cyan-500",
    };
  }

  return {
    label: locale === "en" ? "Abandoned" : "Abandonado",
    badge: "border-slate-300/20 bg-slate-400/10 text-slate-100",
    bar: "from-slate-400 to-slate-500",
  };
}

function formatDate(iso: string | null, locale: "pt" | "en") {
  if (!iso) return "-";
  return new Intl.DateTimeFormat(intlLocale(locale)).format(new Date(iso));
}

export default function ReadingDetailsPage() {
  const { ready } = useRequireSession("/login");
  const { locale } = useI18n();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const copy =
    locale === "en"
      ? {
          loading: "Loading...",
          loadingBook: "Loading book...",
          notFound: "Book not found.",
          back: "Back",
          noCover: "No cover",
          kicker: "Reading details",
          pages: "pages",
          finishedPct: "complete",
          progressHint: "Visual progress follows the registered pages. Reading stats only count the book when it is marked as finished.",
          markFinished: "Mark as finished",
          backToReading: "Back to reading",
          deleteBook: "Delete book",
          finish: "Finish",
          finishTitle: "Save final reading date",
          finishHint: "The selected date will be used for reading stats and yearly filters.",
          cancel: "Cancel",
          confirmFinish: "Confirm finish",
          finishDate: "Finish date",
          useToday: "Use today",
          progress: "Progress",
          progressTitle: "Update current page and start date",
          currentPage: "Current page",
          goToEnd: "Jump to the end",
          updateProgress: "Update progress",
          startedAt: "Start date",
          discard: "Discard",
          saveStart: "Save start date",
          summary: "Summary",
          status: "Status",
          start: "Start",
          finishLabel: "Finish",
          history: "History",
          createdAt: "Created on",
          updatedAt: "Updated on",
          totalPages: "Total pages",
          save: "Saving...",
          confirmDelete: "Delete this book?",
          errors: {
            load: "Could not load book.",
            progress: "Could not update progress.",
            startDate: "Please enter the start date.",
            saveStart: "Could not save start date.",
            finishDate: "Please enter the finish date.",
            finishBook: "Could not finish book.",
            backToReading: "Could not move book back to reading.",
            delete: "Could not delete book.",
          },
        }
      : {
          loading: "Carregando...",
          loadingBook: "Carregando livro...",
          notFound: "Livro nao encontrado.",
          back: "Voltar",
          noCover: "Sem capa",
          kicker: "Leitura em detalhe",
          pages: "paginas",
          finishedPct: "concluido",
          progressHint: "O progresso visual acompanha as paginas registradas. O paginometro so conta quando o livro e marcado como concluido.",
          markFinished: "Marcar como concluido",
          backToReading: "Voltar para lendo",
          deleteBook: "Excluir livro",
          finish: "Conclusao",
          finishTitle: "Salvar data final da leitura",
          finishHint: "A data escolhida sera usada para o paginometro e para os filtros por ano.",
          cancel: "Cancelar",
          confirmFinish: "Confirmar conclusao",
          finishDate: "Data de conclusao",
          useToday: "Usar hoje",
          progress: "Progresso",
          progressTitle: "Atualize a pagina atual e a data de inicio",
          currentPage: "Pagina atual",
          goToEnd: "Ir para o final",
          updateProgress: "Atualizar progresso",
          startedAt: "Data de inicio",
          discard: "Descartar",
          saveStart: "Salvar inicio",
          summary: "Resumo",
          status: "Status",
          start: "Inicio",
          finishLabel: "Conclusao",
          history: "Historico",
          createdAt: "Criado em",
          updatedAt: "Atualizado em",
          totalPages: "Total de paginas",
          save: "Salvando...",
          confirmDelete: "Excluir este livro?",
          errors: {
            load: "Erro ao carregar livro.",
            progress: "Erro ao atualizar progresso.",
            startDate: "Informe a data de inicio.",
            saveStart: "Erro ao salvar a data de inicio.",
            finishDate: "Informe a data de conclusao.",
            finishBook: "Erro ao concluir livro.",
            backToReading: "Erro ao voltar para lendo.",
            delete: "Erro ao excluir.",
          },
        };

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
        setErrorMsg(getErrorMessage(error, copy.errors.load));
      } finally {
        setLoading(false);
      }
    })();
  }, [copy.errors.load, id, ready]);

  const pct = useMemo(() => (book ? percentage(book) : 0), [book]);
  const status = useMemo(() => (book ? statusMeta(book.status, locale) : statusMeta("reading", locale)), [book, locale]);

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
      setErrorMsg(getErrorMessage(error, copy.errors.progress));
    } finally {
      setSaving(false);
    }
  }

  async function saveStartedAt() {
    if (!book) return;
    if (!startedAt) return setErrorMsg(copy.errors.startDate);

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
      setErrorMsg(getErrorMessage(error, copy.errors.saveStart));
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
    if (!finishDate) return setErrorMsg(copy.errors.finishDate);

    setSaving(true);
    setErrorMsg(null);
    try {
      const response = await apiFetch(`/api/books/${book.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "finished", finished_at: finishDate }),
      });
      const updatedBook = response.book as Book;
      setBook(updatedBook);
      setNewPage(updatedBook.current_page);
      setStartedAt(isoToDateInput(updatedBook.started_at));
      setFinishDate(isoToDateInput(updatedBook.finished_at) || finishDate);
      setShowFinishPicker(false);
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, copy.errors.finishBook));
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
      setErrorMsg(getErrorMessage(error, copy.errors.backToReading));
    } finally {
      setSaving(false);
    }
  }

  async function removeBook() {
    if (!book || !confirm(copy.confirmDelete)) return;

    setSaving(true);
    try {
      await apiFetch(`/api/books/${book.id}`, { method: "DELETE" });
      router.replace("/reading");
    } catch (error: unknown) {
      setErrorMsg(getErrorMessage(error, copy.errors.delete));
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <div className="p-6 text-sm text-slate-300">{copy.loading}</div>;
  if (loading) return <div className="p-6 text-sm text-slate-300">{copy.loadingBook}</div>;
  if (!book) return <div className="p-6 text-sm text-slate-300">{copy.notFound}</div>;

  return (
    <div className="app-page pb-4">
      <section className="app-surface-dark overflow-hidden p-6 sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="flex flex-col gap-4">
              <button className="app-btn app-btn-secondary w-fit" onClick={() => router.push("/reading")}>
                &larr; {copy.back}
              </button>

              <div className="h-40 w-28 overflow-hidden rounded-[28px] border border-white/10 bg-white/10 shadow-lg">
                {book.cover_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-300">{copy.noCover}</div>
                )}
              </div>
            </div>

            <div className="max-w-3xl">
              <span className="app-kicker">{copy.kicker}</span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{book.title}</h1>
              <p className="mt-2 text-lg text-slate-200">{book.author}</p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${status.badge}`}>{status.label}</span>
                <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-sm font-semibold text-white">
                  {book.current_page}/{book.total_pages} {copy.pages}
                </span>
                <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-sm font-semibold text-white">
                  {pct}% {copy.finishedPct}
                </span>
              </div>

              <div className="mt-5 max-w-2xl">
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full bg-gradient-to-r ${status.bar}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="app-subtle-dark mt-3 text-sm leading-6">{copy.progressHint}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[20rem] xl:grid-cols-1">
            {book.status !== "finished" ? (
              <button className="app-btn app-btn-secondary" onClick={openFinishPicker} disabled={saving}>
                {copy.markFinished}
              </button>
            ) : (
              <button className="app-btn app-btn-secondary" onClick={unfinishBackToReading} disabled={saving}>
                {copy.backToReading}
              </button>
            )}
            <button className="app-btn app-btn-danger" onClick={removeBook} disabled={saving}>
              {copy.deleteBook}
            </button>
          </div>
        </div>
      </section>

      {errorMsg ? <div className="rounded-[22px] border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-700">{errorMsg}</div> : null}

      {showFinishPicker ? (
        <section className="app-surface p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">{copy.finish}</div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">{copy.finishTitle}</h2>
              <p className="mt-2 text-sm text-slate-600">{copy.finishHint}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="app-btn app-btn-secondary" onClick={() => setShowFinishPicker(false)} disabled={saving}>
                {copy.cancel}
              </button>
              <button className="app-btn app-btn-primary" onClick={confirmFinish} disabled={saving}>
                {saving ? copy.save : copy.confirmFinish}
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,240px)_auto] md:items-end">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{copy.finishDate}</label>
              <input type="date" className="app-input" value={finishDate} onChange={(event) => setFinishDate(event.target.value)} />
            </div>
            <button className="app-btn app-btn-secondary w-fit" onClick={() => setFinishDate(isoToDateInput(new Date().toISOString()))} disabled={saving}>
              {copy.useToday}
            </button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="app-surface p-6">
          <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">{copy.progress}</div>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">{copy.progressTitle}</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3 md:items-end">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{copy.currentPage}</label>
              <input className="app-input" type="number" min={0} max={book.total_pages} value={newPage} onChange={(event) => setNewPage(Number(event.target.value || 0))} />
            </div>
            <button className="app-btn app-btn-secondary" onClick={() => setNewPage(book.total_pages)} disabled={saving}>
              {copy.goToEnd}
            </button>
            <button className="app-btn app-btn-primary" onClick={updateProgress} disabled={saving}>
              {saving ? copy.save : copy.updateProgress}
            </button>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3 md:items-end">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">{copy.startedAt}</label>
              <input type="date" className="app-input" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} />
            </div>
            <button className="app-btn app-btn-secondary" onClick={() => setStartedAt(isoToDateInput(book.started_at))} disabled={saving}>
              {copy.discard}
            </button>
            <button className="app-btn app-btn-primary" onClick={saveStartedAt} disabled={saving}>
              {copy.saveStart}
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="app-surface p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">{copy.summary}</div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-sm text-slate-500">{copy.status}</div>
                <div className="mt-1 text-lg font-semibold text-slate-900">{status.label}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">{copy.start}</div>
                <div className="mt-1 text-base font-semibold text-slate-900">{formatDate(book.started_at, locale)}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">{copy.finishLabel}</div>
                <div className="mt-1 text-base font-semibold text-slate-900">{formatDate(book.finished_at, locale)}</div>
              </div>
            </div>
          </section>

          <section className="app-surface p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">{copy.history}</div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div>
                {copy.createdAt} <span className="font-semibold text-slate-900">{new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "short", timeStyle: "short" }).format(new Date(book.created_at))}</span>
              </div>
              <div>
                {copy.updatedAt} <span className="font-semibold text-slate-900">{new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "short", timeStyle: "short" }).format(new Date(book.updated_at))}</span>
              </div>
              <div>
                {copy.totalPages} <span className="font-semibold text-slate-900">{book.total_pages}</span>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
