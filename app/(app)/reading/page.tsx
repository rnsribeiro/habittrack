"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";
import { useRequireSession } from "@/src/lib/useRequireSession";
import { apiFetch } from "@/src/lib/api";
import type { Book } from "@/lib/types";
import { PeriodControls } from "@/components/PeriodControls";
import type { Period } from "@/src/lib/period";
import { formatRangeLabel, getPeriodRange, shiftAnchor, toISODate } from "@/src/lib/period";

function formatDateBR(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(iso));
}

function percentage(book: Book) {
  const value = Math.round((book.current_page / book.total_pages) * 100);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

function statusLabel(status: Book["status"]) {
  if (status === "reading") return "Lendo";
  if (status === "finished") return "Concluido";
  return "Abandonado";
}

function statusClasses(status: Book["status"]) {
  if (status === "finished") {
    return {
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      bar: "from-emerald-500 to-green-600",
    };
  }

  if (status === "reading") {
    return {
      badge: "border-sky-200 bg-sky-50 text-sky-700",
      bar: "from-sky-500 to-cyan-600",
    };
  }

  return {
    badge: "border-slate-200 bg-slate-100 text-slate-600",
    bar: "from-slate-400 to-slate-500",
  };
}

function listHeading(status: "all" | "reading" | "finished" | "abandoned") {
  if (status === "reading") return "Livros em andamento";
  if (status === "finished") return "Livros concluidos";
  if (status === "abandoned") return "Leituras abandonadas";
  return "Todos os livros";
}

export default function ReadingPage() {
  const { ready } = useRequireSession("/login");
  const router = useRouter();

  const [books, setBooks] = useState<Book[]>([]);
  const [status, setStatus] = useState<"all" | "reading" | "finished" | "abandoned">("reading");
  const [finishedYear, setFinishedYear] = useState<string>("all");
  const [availableFinishedYears, setAvailableFinishedYears] = useState<number[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [period, setPeriod] = useState<Period>("month");
  const [anchor, setAnchor] = useState<Date>(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });

  const range = useMemo(() => getPeriodRange(anchor, period), [anchor, period]);
  const rangeLabel = useMemo(() => formatRangeLabel(period, anchor), [period, anchor]);

  const [pagesInPeriod, setPagesInPeriod] = useState(0);
  const [pagesTotal, setPagesTotal] = useState(0);
  const [finishedInPeriod, setFinishedInPeriod] = useState(0);

  const effectiveFinishedYear = useMemo(() => {
    if (status !== "finished" || finishedYear === "all") return "all";
    return availableFinishedYears.some((year) => String(year) === finishedYear) ? finishedYear : "all";
  }, [availableFinishedYears, finishedYear, status]);

  const filteredHint = useMemo(() => {
    if (status === "reading") return "Mostrando primeiro o que voce esta lendo agora.";
    if (status === "finished" && effectiveFinishedYear !== "all") return `Mostrando apenas conclusoes de ${effectiveFinishedYear}.`;
    if (status === "finished") return "Voce pode filtrar os concluidos por ano.";
    if (status === "abandoned") return "Leituras pausadas ou abandonadas.";
    return "Visao completa da sua biblioteca.";
  }, [effectiveFinishedYear, status]);

  const summary = useMemo(() => {
    const totalBooks = books.length;
    const totalPagesInProgress = books.reduce((sum, book) => sum + book.current_page, 0);
    const averageProgress =
      totalBooks === 0 ? 0 : Math.round(books.reduce((sum, book) => sum + percentage(book), 0) / totalBooks);
    return { totalBooks, totalPagesInProgress, averageProgress };
  }, [books]);

  useEffect(() => {
    if (!ready) return;

    (async () => {
      setErrorMsg(null);
      try {
        const params = new URLSearchParams();
        if (status !== "all") params.set("status", status);
        if (status === "finished" && effectiveFinishedYear !== "all") params.set("finishedYear", effectiveFinishedYear);

        const query = params.toString();
        const response = await apiFetch(`/api/books${query ? `?${query}` : ""}`);

        setBooks(response.books ?? []);
        setAvailableFinishedYears(response.available_finished_years ?? []);
      } catch (error: unknown) {
        setErrorMsg(getErrorMessage(error, "Erro ao carregar livros."));
      }
    })();
  }, [effectiveFinishedYear, ready, status]);

  useEffect(() => {
    if (!ready) return;

    (async () => {
      setErrorMsg(null);
      try {
        const start = toISODate(range.start);
        const end = toISODate(range.end);
        const { pages_in_period, pages_total, finished_in_period } = await apiFetch(
          `/api/reading/stats?start=${start}&end=${end}`
        );

        setPagesInPeriod(pages_in_period);
        setPagesTotal(pages_total);
        setFinishedInPeriod(finished_in_period);
      } catch (error: unknown) {
        setErrorMsg(getErrorMessage(error, "Erro ao carregar paginometro."));
      }
    })();
  }, [range.end, range.start, ready]);

  if (!ready) return <div className="p-6 text-sm text-slate-300">Carregando...</div>;

  return (
    <div className="app-page pb-4">
      <section className="app-surface-dark overflow-hidden p-6 sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <span className="app-kicker">Leitura com contexto</span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Foco no que esta em andamento</h1>
            <p className="app-subtle-dark mt-3 max-w-2xl text-sm leading-6 sm:text-base">
              A pagina agora abre priorizando seus livros em leitura, mas mantem o acesso rapido aos concluidos, ao historico
              por ano e ao paginometro do periodo.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[30rem]">
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Livros visiveis</div>
              <div className="mt-2 text-3xl font-semibold text-white">{summary.totalBooks}</div>
              <div className="mt-1 text-sm text-slate-300">{filteredHint}</div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Paginas atuais</div>
              <div className="mt-2 text-3xl font-semibold text-white">{summary.totalPagesInProgress}</div>
              <div className="mt-1 text-sm text-slate-300">Somatorio das paginas registradas na lista atual.</div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Progresso medio</div>
              <div className="mt-2 text-3xl font-semibold text-white">{summary.averageProgress}%</div>
              <div className="mt-1 text-sm text-slate-300">Media aproximada de avanco dos livros exibidos.</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["reading", "finished", "all", "abandoned"] as const).map((value) => (
              <button
                key={value}
                onClick={() => setStatus(value)}
                className={`app-chip ${status === value ? "app-chip-active" : "app-chip-muted"}`}
              >
                {value === "reading" ? "Lendo" : value === "finished" ? "Concluidos" : value === "abandoned" ? "Abandonados" : "Todos"}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {status === "finished" ? (
              <div className="min-w-[12rem]">
                <label className="mb-2 block text-sm font-medium text-slate-200">Ano de conclusao</label>
                <select className="app-select" value={effectiveFinishedYear} onChange={(event) => setFinishedYear(event.target.value)}>
                  <option value="all">Todos os anos</option>
                  {availableFinishedYears.map((year) => (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <button className="app-btn app-btn-primary" onClick={() => router.push("/reading/new")}>
              Cadastrar livro
            </button>
          </div>
        </div>
      </section>

      <section className="app-surface-dark p-6 sm:p-7">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="app-kicker">Paginometro</span>
              <h2 className="mt-3 text-2xl font-semibold text-white">Somente livros concluidos entram na contagem</h2>
              <p className="app-subtle-dark mt-2 text-sm">{rangeLabel}</p>
            </div>

            <div className="text-sm text-slate-200">
              <span className="font-semibold text-white">{finishedInPeriod}</span> livro(s) concluidos no periodo
            </div>
          </div>

          <PeriodControls
            period={period}
            anchor={anchor}
            onPeriodChange={(nextPeriod) => {
              setPeriod(nextPeriod);
              const nextDate = new Date();
              nextDate.setHours(0, 0, 0, 0);
              setAnchor(nextDate);
            }}
            onPrev={() => setAnchor((current) => shiftAnchor(current, period, -1))}
            onNext={() => setAnchor((current) => shiftAnchor(current, period, 1))}
            onToday={() => {
              const nextDate = new Date();
              nextDate.setHours(0, 0, 0, 0);
              setAnchor(nextDate);
            }}
          />

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="text-sm text-slate-300">Paginas no periodo</div>
              <div className="mt-2 text-3xl font-semibold text-white">{pagesInPeriod}</div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="text-sm text-slate-300">Total geral concluido</div>
              <div className="mt-2 text-3xl font-semibold text-white">{pagesTotal}</div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
              <div className="text-sm text-slate-300">Conclusoes no periodo</div>
              <div className="mt-2 text-3xl font-semibold text-white">{finishedInPeriod}</div>
            </div>
          </div>
        </div>
      </section>

      {errorMsg ? (
        <div className="rounded-[22px] border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-700">{errorMsg}</div>
      ) : null}

      <section className="app-page">
        <div>
          <span className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-300">Biblioteca</span>
          <h2 className="mt-2 text-2xl font-semibold text-white">{listHeading(status)}</h2>
          <p className="mt-2 text-sm text-slate-300">{filteredHint}</p>
        </div>

        {books.length === 0 ? <div className="app-surface p-8 text-center text-slate-500">Nenhum livro encontrado para esse filtro.</div> : null}

        <div className="grid gap-4 xl:grid-cols-2">
          {books.map((book) => {
            const tone = statusClasses(book.status);
            const pct = percentage(book);

            return (
              <button
                key={book.id}
                className="app-surface group overflow-hidden p-5 text-left transition hover:-translate-y-1"
                onClick={() => router.push(`/reading/${book.id}`)}
              >
                <div className="flex items-start gap-4">
                  <div className="h-28 w-20 shrink-0 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-100">
                    {book.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center px-3 text-center text-xs text-slate-500">Sem capa</div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-xl font-semibold text-slate-900 transition group-hover:text-emerald-700">{book.title}</h3>
                        <p className="mt-1 truncate text-sm text-slate-600">{book.author}</p>
                      </div>

                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone.badge}`}>{statusLabel(book.status)}</span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[20px] border border-slate-200 bg-slate-50/90 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Inicio</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">{formatDateBR(book.started_at)}</div>
                      </div>

                      <div className="rounded-[20px] border border-slate-200 bg-slate-50/90 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Conclusao</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">{formatDateBR(book.finished_at)}</div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <span>
                          {book.current_page}/{book.total_pages} paginas
                        </span>
                        <span className="font-semibold text-slate-900">{pct}%</span>
                      </div>

                      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                        <div className={`h-full bg-gradient-to-r ${tone.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
