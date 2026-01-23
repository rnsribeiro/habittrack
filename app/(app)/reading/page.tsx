"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireSession } from "@/src/lib/useRequireSession";
import { apiFetch } from "@/src/lib/api";
import type { Book } from "@/lib/types";

import { PeriodControls } from "@/components/PeriodControls";
import type { Period } from "@/src/lib/period";
import { formatRangeLabel, getPeriodRange, shiftAnchor, toISODate } from "@/src/lib/period";

function fmtDateBR(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(iso));
}

export default function ReadingPage() {
  const { ready } = useRequireSession("/login");
  const router = useRouter();

  const [books, setBooks] = useState<Book[]>([]);
  const [status, setStatus] = useState<"all" | "reading" | "finished" | "abandoned">("all");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // stats period
  const [period, setPeriod] = useState<Period>("month");
  const [anchor, setAnchor] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const range = useMemo(() => getPeriodRange(anchor, period), [anchor, period]);
  const rangeLabel = useMemo(() => formatRangeLabel(period, anchor), [period, anchor]);

  const [pagesInPeriod, setPagesInPeriod] = useState(0);
  const [pagesTotal, setPagesTotal] = useState(0);
  const [finishedInPeriod, setFinishedInPeriod] = useState(0);

  async function loadBooks() {
    const qs = status === "all" ? "" : `?status=${status}`;
    const { books } = await apiFetch(`/api/books${qs}`);
    setBooks(books);
  }

  async function loadStats() {
    const start = toISODate(range.start);
    const end = toISODate(range.end);
    const { pages_in_period, pages_total, finished_in_period } = await apiFetch(
      `/api/reading/stats?start=${start}&end=${end}`
    );
    setPagesInPeriod(pages_in_period);
    setPagesTotal(pages_total);
    setFinishedInPeriod(finished_in_period);
  }

  useEffect(() => {
    if (!ready) return;
    (async () => {
      setErrorMsg(null);
      try {
        await loadBooks();
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Erro ao carregar livros.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, status]);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      setErrorMsg(null);
      try {
        await loadStats();
      } catch (e: any) {
        setErrorMsg(e?.message ?? "Erro ao carregar paginômetro.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, period, anchor]);

  function pct(b: Book) {
    const v = Math.round((b.current_page / b.total_pages) * 100);
    return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
  }

  function statusLabel(s: Book["status"]) {
    if (s === "reading") return "lendo";
    if (s === "finished") return "concluído";
    return "abandonado";
  }

  function statusBarClass(s: Book["status"]) {
    // ✅ azul enquanto lendo, verde quando concluído
    if (s === "finished") return "bg-green-600";
    if (s === "reading") return "bg-blue-600";
    return "bg-zinc-500";
  }

  function statusTagClass(s: Book["status"]) {
    if (s === "finished") return "border-green-200 bg-green-50 text-green-800";
    if (s === "reading") return "border-blue-200 bg-blue-50 text-blue-800";
    return "border-zinc-200 bg-zinc-50 text-zinc-700";
  }

  if (!ready) return <div className="p-6 text-sm text-zinc-600">Carregando...</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between flex-col sm:flex-row gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Leitura</h1>
          <p className="text-sm text-zinc-600">
            Cadastre livros, acompanhe o progresso e conte páginas por período (somente concluídos).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="text-sm px-3 py-2 rounded-xl border border-zinc-300 bg-white text-zinc-900"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            <option value="all">Todos</option>
            <option value="reading">Lendo</option>
            <option value="finished">Concluídos</option>
            <option value="abandoned">Abandonados</option>
          </select>

          <button
            className="text-sm px-4 py-2 rounded-xl bg-black text-white hover:opacity-95"
            onClick={() => router.push("/reading/new")}
          >
            Cadastrar livro
          </button>
        </div>
      </div>

      {/* Paginômetro */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
          <div>
            <div className="text-sm font-semibold text-zinc-900">Paginômetro</div>
            <div className="text-xs text-zinc-600">{rangeLabel}</div>
          </div>
          <div className="text-sm text-zinc-700">
            <span className="font-semibold text-zinc-900">{finishedInPeriod}</span> livro(s) concluído(s) no período
          </div>
        </div>

        <PeriodControls
          period={period}
          anchor={anchor}
          onPeriodChange={(p) => {
            setPeriod(p);
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            setAnchor(d);
          }}
          onPrev={() => setAnchor((a) => shiftAnchor(a, period, -1))}
          onNext={() => setAnchor((a) => shiftAnchor(a, period, +1))}
          onToday={() => {
            const d = new Date();
            d.setHours(0, 0, 0, 0);
            setAnchor(d);
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border border-zinc-200 rounded-2xl p-4 bg-white">
            <div className="text-xs text-zinc-600">Páginas no período (concluídos)</div>
            <div className="text-2xl font-semibold text-zinc-900">{pagesInPeriod}</div>
          </div>
          <div className="border border-zinc-200 rounded-2xl p-4 bg-white">
            <div className="text-xs text-zinc-600">Total de páginas (concluídos - geral)</div>
            <div className="text-2xl font-semibold text-zinc-900">{pagesTotal}</div>
          </div>
        </div>
      </div>

      {errorMsg ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
          {errorMsg}
        </div>
      ) : null}

      {/* Lista */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-200 bg-white">
          <div className="text-sm font-semibold text-zinc-900">Livros</div>
          <div className="text-xs text-zinc-600">Clique para ver detalhes e editar datas.</div>
        </div>

        <div className="divide-y divide-zinc-200">
          {books.map((b) => (
            <button
              key={b.id}
              className="w-full text-left p-4 hover:bg-zinc-50"
              onClick={() => router.push(`/reading/${b.id}`)}
            >
              <div className="flex items-start gap-4">
                <div className="h-16 w-12 rounded-lg border border-zinc-200 bg-zinc-50 overflow-hidden shrink-0">
                  {b.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.cover_url} alt={b.title} className="h-full w-full object-cover" />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold text-zinc-900 truncate">{b.title}</div>

                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusTagClass(b.status)}`}>
                      {statusLabel(b.status)}
                    </span>
                  </div>

                  <div className="text-sm text-zinc-600 mt-1 truncate">{b.author}</div>

                  {/* ✅ datas */}
                  <div className="text-xs text-zinc-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      Início: <b className="text-zinc-900">{b.started_at ? fmtDateBR(b.started_at) : "—"}</b>
                    </span>
                    <span>
                      Conclusão: <b className="text-zinc-900">{b.finished_at ? fmtDateBR(b.finished_at) : "—"}</b>
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-zinc-600">
                      <span>
                        {b.current_page}/{b.total_pages} páginas
                      </span>
                      <span className="font-semibold text-zinc-900">{pct(b)}%</span>
                    </div>

                    <div className="h-2 mt-2 rounded-full bg-zinc-200 overflow-hidden">
                      {/* ✅ azul lendo / verde concluído */}
                      <div className={`h-full ${statusBarClass(b.status)}`} style={{ width: `${pct(b)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}

          {books.length === 0 ? (
            <div className="p-6 text-sm text-zinc-600">Nenhum livro cadastrado ainda.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
