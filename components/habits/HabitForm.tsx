"use client";

import { useState } from "react";

export function HabitForm({
  onCreate,
}: {
  onCreate: (payload: { title: string; color: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("#22c55e");
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        setLoading(true);
        try {
          await onCreate({ title: title.trim(), color });
          setTitle("");
        } finally {
          setLoading(false);
        }
      }}
    >
      <div className="flex-1">
        <label className="text-sm text-zinc-600">Novo hábito</label>
        <input
          className="w-full border rounded-xl px-3 py-2"
          placeholder="Ex: Ler 10 páginas"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div>
        <label className="text-sm text-zinc-600">Cor</label>
        <input
          className="h-10.5 w-20 border rounded-xl px-2"
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          title="Cor do hábito"
        />
      </div>

      <button
        disabled={loading}
        className="h-[42px] rounded-xl bg-black text-white px-4 disabled:opacity-60"
        type="submit"
      >
        {loading ? "Salvando..." : "Criar"}
      </button>
    </form>
  );
}
