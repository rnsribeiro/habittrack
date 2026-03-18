import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getToken(req: NextRequest) {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

function supaFromToken(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const supa = supaFromToken(token);
  const { data: userRes } = await supa.auth.getUser();
  if (!userRes?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status"); // reading|finished|abandoned|null
  const finishedYear = url.searchParams.get("finishedYear");

  let q = supa.from("books").select("*").eq("user_id", userRes.user.id);
  if (status) q = q.eq("status", status);

  if (finishedYear) {
    const year = Number(finishedYear);
    if (!Number.isInteger(year) || year < 1900 || year > 9999) {
      return NextResponse.json({ error: "finishedYear invalido" }, { status: 400 });
    }

    q = q
      .gte("finished_at", `${year}-01-01T00:00:00.000Z`)
      .lt("finished_at", `${year + 1}-01-01T00:00:00.000Z`);
  }

  const [booksRes, yearsRes] = await Promise.all([
    q.order("updated_at", { ascending: false }),
    supa
      .from("books")
      .select("finished_at")
      .eq("user_id", userRes.user.id)
      .eq("status", "finished")
      .not("finished_at", "is", null),
  ]);

  const { data, error } = booksRes;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (yearsRes.error) return NextResponse.json({ error: yearsRes.error.message }, { status: 500 });

  const availableFinishedYears = Array.from(
    new Set(
      (yearsRes.data ?? [])
        .map((row) => row.finished_at)
        .filter(Boolean)
        .map((value) => new Date(value as string).getFullYear())
        .filter((year) => Number.isFinite(year))
    )
  ).sort((a, b) => b - a);

  return NextResponse.json({ books: data ?? [], available_finished_years: availableFinishedYears });
}

export async function POST(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const supa = supaFromToken(token);
  const { data: userRes } = await supa.auth.getUser();
  if (!userRes?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const title = String(body.title ?? "").trim();
  const author = String(body.author ?? "").trim();
  const cover_url = body.cover_url ? String(body.cover_url) : null;

  const total_pages = Number(body.total_pages);
  if (!Number.isFinite(total_pages) || total_pages <= 0) {
    return NextResponse.json({ error: "total_pages inválido" }, { status: 400 });
  }

  // started_at: pode vir como "YYYY-MM-DD" (recomendado) ou ISO
  let started_at: string | null = null;
  if (body.started_at) {
    const v = String(body.started_at);
    // se vier "YYYY-MM-DD", converte pra ISO 00:00Z
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) started_at = `${v}T00:00:00.000Z`;
    else started_at = new Date(v).toISOString();
  } else {
    started_at = new Date().toISOString();
  }

  if (!title) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
  if (!author) return NextResponse.json({ error: "Autor obrigatório" }, { status: 400 });

  const payload: {
    user_id: string;
    title: string;
    author: string;
    cover_url: string | null;
    total_pages: number;
    current_page: number;
    status: "reading";
    started_at: string | null;
  } = {
    user_id: userRes.user.id,
    title,
    author,
    cover_url,
    total_pages,
    current_page: 0,
    status: "reading",
    started_at,
  };

  const { data, error } = await supa.from("books").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ book: data });
}
