"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";
import { useRequireSession } from "@/src/lib/useRequireSession";
import { apiFetch } from "@/src/lib/api";

export default function ReadingNewPage() {
  const { ready } = useRequireSession("/login");
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [totalPages, setTotalPages] = useState<number>(200);
  const [startedAt, setStartedAt] = useState<string>(() => {
    const date = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    setMsg(null);

    if (!title.trim()) return setMsg("Informe o titulo.");
    if (!author.trim()) return setMsg("Informe o autor.");
    if (!Number.isFinite(totalPages) || totalPages <= 0) return setMsg("Informe um total de paginas valido.");

    setSaving(true);
    try {
      const response = await apiFetch("/api/books", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim(),
          cover_url: coverUrl.trim() ? coverUrl.trim() : null,
          total_pages: Number(totalPages),
          started_at: startedAt,
        }),
      });

      router.replace(`/reading/${response.book.id}`);
    } catch (error: unknown) {
      setMsg(getErrorMessage(error, "Erro ao cadastrar livro."));
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <div className="p-6 text-sm text-slate-300">Carregando...</div>;

  return (
    <div className="app-page pb-4">
      <section className="app-surface-dark overflow-hidden p-6 sm:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <button className="app-btn app-btn-secondary" onClick={() => router.push("/reading")}>
              &larr; Voltar
            </button>

            <span className="app-kicker mt-5">Novo livro</span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Cadastre uma nova leitura</h1>
            <p className="app-subtle-dark mt-3 max-w-2xl text-sm leading-6 sm:text-base">
              Adicione capa, total de paginas e data de inicio para acompanhar o progresso sem perder o historico.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/6 p-4 text-sm text-slate-200">
            Depois do cadastro voce ja cai direto na tela do livro para atualizar progresso e marcar a conclusao.
          </div>
        </div>
      </section>

      {msg ? <div className="rounded-[22px] border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-700">{msg}</div> : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="app-surface p-6">
          <form className="space-y-5" onSubmit={onCreate}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Titulo</label>
                <input className="app-input" value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Autor</label>
                <input className="app-input" value={author} onChange={(event) => setAuthor(event.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">URL da capa</label>
                <input
                  className="app-input"
                  value={coverUrl}
                  onChange={(event) => setCoverUrl(event.target.value)}
                  placeholder="https://..."
                />
                <p className="mt-2 text-xs text-slate-500">Use uma URL publica de imagem para a capa.</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Total de paginas</label>
                <input
                  className="app-input"
                  type="number"
                  min={1}
                  value={totalPages}
                  onChange={(event) => setTotalPages(Number(event.target.value || 0))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,240px)_auto] md:items-end">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Data de inicio</label>
                <input type="date" className="app-input" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} />
              </div>

              <div className="flex flex-wrap gap-3 md:justify-end">
                <button type="button" className="app-btn app-btn-secondary" onClick={() => router.push("/reading")}>
                  Cancelar
                </button>

                <button type="submit" disabled={saving} className="app-btn app-btn-primary">
                  {saving ? "Salvando..." : "Cadastrar livro"}
                </button>
              </div>
            </div>
          </form>
        </div>

        <aside className="space-y-4">
          <section className="app-surface p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">Previa</div>

            {coverUrl.trim() ? (
              <div className="mt-4 flex items-start gap-4">
                <div className="h-36 w-24 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverUrl.trim()} alt="Previa da capa" className="h-full w-full object-cover" />
                </div>

                <div className="min-w-0">
                  <div className="text-lg font-semibold text-slate-900">{title.trim() || "Titulo do livro"}</div>
                  <div className="mt-1 text-sm text-slate-600">{author.trim() || "Autor"}</div>
                  <div className="mt-4 text-sm text-slate-500">{totalPages || 0} paginas</div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Adicione uma URL de capa para visualizar a previa aqui.</p>
            )}
          </section>

          <section className="app-surface p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">Boas praticas</div>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>Preencha a data de inicio para deixar a linha do tempo consistente.</li>
              <li>O progresso e atualizado por pagina atual, sem concluir automaticamente no fim.</li>
              <li>Quando marcar como concluido, o livro passa a aparecer nos filtros por ano.</li>
            </ul>
          </section>
        </aside>
      </section>
    </div>
  );
}
