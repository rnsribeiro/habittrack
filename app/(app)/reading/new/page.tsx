"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getErrorMessage } from "@/lib/errors";
import { useI18n } from "@/lib/i18n";
import { useRequireSession } from "@/src/lib/useRequireSession";
import { apiFetch } from "@/src/lib/api";

export default function ReadingNewPage() {
  const { ready } = useRequireSession("/login");
  const { locale } = useI18n();
  const router = useRouter();

  const copy =
    locale === "en"
      ? {
          loading: "Loading...",
          back: "Back",
          kicker: "New book",
          title: "Add a new reading",
          subtitle: "Add cover, page count, and a start date to track progress without losing history.",
          sideNote: "After saving, you go straight to the book page to update progress and finish it later.",
          fieldTitle: "Title",
          author: "Author",
          coverUrl: "Cover URL",
          coverHint: "Use a public image URL for the cover.",
          totalPages: "Total pages",
          startedAt: "Start date",
          cancel: "Cancel",
          save: "Add book",
          saving: "Saving...",
          preview: "Preview",
          noPreview: "Add a cover URL to preview it here.",
          placeholderTitle: "Book title",
          placeholderAuthor: "Author",
          placeholderPages: "pages",
          bestPractices: "Best practices",
          tips: [
            "Fill in the start date to keep your timeline consistent.",
            "Progress is updated by current page and does not finish automatically at the end.",
            "Once finished, the book becomes available in yearly filters.",
          ],
          errors: {
            title: "Please enter the title.",
            author: "Please enter the author.",
            totalPages: "Please enter a valid page count.",
            create: "Could not add the book.",
          },
        }
      : {
          loading: "Carregando...",
          back: "Voltar",
          kicker: "Novo livro",
          title: "Cadastre uma nova leitura",
          subtitle: "Adicione capa, total de paginas e data de inicio para acompanhar o progresso sem perder o historico.",
          sideNote: "Depois do cadastro voce ja cai direto na tela do livro para atualizar progresso e marcar a conclusao.",
          fieldTitle: "Titulo",
          author: "Autor",
          coverUrl: "URL da capa",
          coverHint: "Use uma URL publica de imagem para a capa.",
          totalPages: "Total de paginas",
          startedAt: "Data de inicio",
          cancel: "Cancelar",
          save: "Cadastrar livro",
          saving: "Salvando...",
          preview: "Previa",
          noPreview: "Adicione uma URL de capa para visualizar a previa aqui.",
          placeholderTitle: "Titulo do livro",
          placeholderAuthor: "Autor",
          placeholderPages: "paginas",
          bestPractices: "Boas praticas",
          tips: [
            "Preencha a data de inicio para deixar a linha do tempo consistente.",
            "O progresso e atualizado por pagina atual, sem concluir automaticamente no fim.",
            "Quando marcar como concluido, o livro passa a aparecer nos filtros por ano.",
          ],
          errors: {
            title: "Informe o titulo.",
            author: "Informe o autor.",
            totalPages: "Informe um total de paginas valido.",
            create: "Erro ao cadastrar livro.",
          },
        };

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

    if (!title.trim()) return setMsg(copy.errors.title);
    if (!author.trim()) return setMsg(copy.errors.author);
    if (!Number.isFinite(totalPages) || totalPages <= 0) return setMsg(copy.errors.totalPages);

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
      setMsg(getErrorMessage(error, copy.errors.create));
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <div className="p-6 text-sm text-slate-300">{copy.loading}</div>;

  return (
    <div className="app-page pb-4">
      <section className="app-surface-dark overflow-hidden p-6 sm:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <button className="app-btn app-btn-secondary" onClick={() => router.push("/reading")}>
              &larr; {copy.back}
            </button>
            <span className="app-kicker mt-5">{copy.kicker}</span>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{copy.title}</h1>
            <p className="app-subtle-dark mt-3 max-w-2xl text-sm leading-6 sm:text-base">{copy.subtitle}</p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/6 p-4 text-sm text-slate-200">{copy.sideNote}</div>
        </div>
      </section>

      {msg ? <div className="rounded-[22px] border border-red-200/80 bg-red-50/90 px-4 py-3 text-sm text-red-700">{msg}</div> : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="app-surface p-6">
          <form className="space-y-5" onSubmit={onCreate}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{copy.fieldTitle}</label>
                <input className="app-input" value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{copy.author}</label>
                <input className="app-input" value={author} onChange={(event) => setAuthor(event.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">{copy.coverUrl}</label>
                <input className="app-input" value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} placeholder="https://..." />
                <p className="mt-2 text-xs text-slate-500">{copy.coverHint}</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{copy.totalPages}</label>
                <input className="app-input" type="number" min={1} value={totalPages} onChange={(event) => setTotalPages(Number(event.target.value || 0))} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,240px)_auto] md:items-end">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{copy.startedAt}</label>
                <input type="date" className="app-input" value={startedAt} onChange={(event) => setStartedAt(event.target.value)} />
              </div>

              <div className="flex flex-wrap gap-3 md:justify-end">
                <button type="button" className="app-btn app-btn-secondary" onClick={() => router.push("/reading")}>
                  {copy.cancel}
                </button>
                <button type="submit" disabled={saving} className="app-btn app-btn-primary">
                  {saving ? copy.saving : copy.save}
                </button>
              </div>
            </div>
          </form>
        </div>

        <aside className="space-y-4">
          <section className="app-surface p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">{copy.preview}</div>
            {coverUrl.trim() ? (
              <div className="mt-4 flex items-start gap-4">
                <div className="h-36 w-24 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverUrl.trim()} alt={copy.preview} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-slate-900">{title.trim() || copy.placeholderTitle}</div>
                  <div className="mt-1 text-sm text-slate-600">{author.trim() || copy.placeholderAuthor}</div>
                  <div className="mt-4 text-sm text-slate-500">{totalPages || 0} {copy.placeholderPages}</div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">{copy.noPreview}</p>
            )}
          </section>

          <section className="app-surface p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">{copy.bestPractices}</div>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {copy.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
        </aside>
      </section>
    </div>
  );
}
