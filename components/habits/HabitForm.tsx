"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

export function HabitForm({
  onCreate,
}: {
  onCreate: (payload: { title: string; color: string }) => Promise<void>;
}) {
  const { locale } = useI18n();
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("#22c55e");
  const [loading, setLoading] = useState(false);

  const copy =
    locale === "en"
      ? {
          label: "New habit",
          placeholder: "Example: Read 10 pages",
          color: "Color",
          colorTitle: "Habit color",
          submit: "Create",
          saving: "Saving...",
        }
      : {
          label: "Novo habito",
          placeholder: "Ex: Ler 10 paginas",
          color: "Cor",
          colorTitle: "Cor do habito",
          submit: "Criar",
          saving: "Salvando...",
        };

  return (
    <form
      className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-end"
      onSubmit={async (event) => {
        event.preventDefault();
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
        <label className="text-sm font-medium text-slate-200">{copy.label}</label>
        <input
          className="w-full rounded-xl border px-3 py-2"
          placeholder={copy.placeholder}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-200">{copy.color}</label>
        <input
          className="h-10.5 w-20 rounded-xl border px-2"
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          title={copy.colorTitle}
        />
      </div>

      <button disabled={loading} className="h-[42px] rounded-xl bg-black px-4 text-white disabled:opacity-60" type="submit">
        {loading ? copy.saving : copy.submit}
      </button>
    </form>
  );
}
