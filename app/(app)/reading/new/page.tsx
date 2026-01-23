"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireSession } from "@/src/lib/useRequireSession";
import { apiFetch } from "@/src/lib/api";

export default function ReadingNewPage() {
  const { ready } = useRequireSession("/login");
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [totalPages, setTotalPages] = useState<number>(200);

  // ✅ data de início (YYYY-MM-DD)
  const [startedAt, setStartedAt] = useState<string>(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!title.trim()) return setMsg("Informe o título.");
    if (!author.trim()) return setMsg("Informe o autor.");
    if (!Number.isFinite(totalPages) || totalPages <= 0) return setMsg("total_pages inválido.");

    setSaving(true);
    try {
      const { book } = await apiFetch("/api/books", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim(),
          cover_url: coverUrl.trim() ? coverUrl.trim() : null,
          total_pages: Number(totalPages),
          started_at: startedAt, // YYYY-MM-DD ✅
        }),
      });

      router.replace(`/reading/${book.id}`);
    } catch (e: any) {
      setMsg(e?.message ?? "Erro ao cadastrar.");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <div className="p-6 text-sm text-zinc-600">Carregando...</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between flex-col sm:flex-row gap-3">
        <div>
          <button className="text-sm px-3 py-2 rounded-xl border hover:bg-zinc-50" onClick={() => router.push("/reading")}>
            ← Voltar
          </button>
          <h1 className="text-xl font-semibold mt-3">Cadastrar livro</h1>
          <p className="text-sm text-zinc-600">Capa via URL, progresso por páginas, e conclusão para contar no paginômetro.</p>
        </div>
      </div>

      {msg ? <div className="rounded-xl border bg-zinc-50 px-3 py-2 text-sm">{msg}</div> : null}

      <div className="bg-white border rounded-2xl p-5">
        <form className="space-y-4" onSubmit={onCreate}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-zinc-700">Título</label>
              <input className="w-full mt-1 border rounded-xl px-3 py-2" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-zinc-700">Autor</label>
              <input className="w-full mt-1 border rounded-xl px-3 py-2" value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-sm text-zinc-700">URL da capa (opcional)</label>
              <input
                className="w-full mt-1 border rounded-xl px-3 py-2"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://..."
              />
              <p className="text-xs text-zinc-500 mt-1">Dica: use URL pública (https).</p>
            </div>

            <div>
              <label className="text-sm text-zinc-700">Total de páginas</label>
              <input
                className="w-full mt-1 border rounded-xl px-3 py-2"
                type="number"
                min={1}
                value={totalPages}
                onChange={(e) => setTotalPages(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-sm text-zinc-700">Data de início da leitura</label>
              <input
                className="w-full mt-1 border rounded-xl px-3 py-2"
                type="date"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 flex gap-2 justify-end">
              <button
                type="button"
                className="text-sm px-4 py-2 rounded-xl border hover:bg-zinc-50"
                onClick={() => router.push("/reading")}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="text-sm px-4 py-2 rounded-xl bg-black text-white hover:opacity-95 disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Cadastrar"}
              </button>
            </div>
          </div>
        </form>

        {coverUrl.trim() ? (
          <div className="mt-5 border rounded-2xl p-4 bg-zinc-50 flex items-start gap-4">
            <div className="h-28 w-20 rounded-xl border bg-white overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverUrl.trim()} alt="Prévia da capa" className="h-full w-full object-cover" />
            </div>
            <div className="text-sm text-zinc-700">
              <div className="font-semibold">Prévia da capa</div>
              <div className="text-xs text-zinc-600 mt-1">Se a imagem não carregar, tente outra URL pública.</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
