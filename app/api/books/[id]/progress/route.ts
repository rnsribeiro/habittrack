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

type Ctx = { params: { id: string } | Promise<{ id: string }> };
async function getId(ctx: Ctx) {
  const p: any = (ctx as any).params;
  const resolved = typeof p?.then === "function" ? await p : p;
  return resolved.id as string;
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const id = await getId(ctx);
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const new_current_page = Number(body.new_current_page);
  if (!Number.isFinite(new_current_page) || new_current_page < 0) {
    return NextResponse.json({ error: "new_current_page inválido" }, { status: 400 });
  }

  const supa = supaFromToken(token);
  const { data: userRes } = await supa.auth.getUser();
  if (!userRes?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const { data: book, error: bookErr } = await supa
    .from("books")
    .select("*")
    .eq("id", id)
    .eq("user_id", userRes.user.id)
    .single();

  if (bookErr) return NextResponse.json({ error: bookErr.message }, { status: 500 });
  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const clamped = Math.min(new_current_page, book.total_pages);

  // não conclui automaticamente só porque chegou no final (você pediu pra contar apenas ao concluir)
  const { data: updated, error: upErr } = await supa
    .from("books")
    .update({
      current_page: clamped,
      status: book.status === "abandoned" ? "reading" : book.status,
    })
    .eq("id", book.id)
    .eq("user_id", userRes.user.id)
    .select("*")
    .single();

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ book: updated });
}
