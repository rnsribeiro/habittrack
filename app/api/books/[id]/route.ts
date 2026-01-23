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

export async function GET(req: NextRequest, ctx: Ctx) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const id = await getId(ctx);
  const supa = supaFromToken(token);

  const { data: userRes } = await supa.auth.getUser();
  if (!userRes?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const { data, error } = await supa
    .from("books")
    .select("*")
    .eq("id", id)
    .eq("user_id", userRes.user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ book: data });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const id = await getId(ctx);
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const supa = supaFromToken(token);
  const { data: userRes } = await supa.auth.getUser();
  if (!userRes?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const payload: any = {};

  if (typeof body.title === "string") payload.title = body.title;
  if (typeof body.author === "string") payload.author = body.author;
  if (typeof body.cover_url === "string" || body.cover_url === null) payload.cover_url = body.cover_url;

  if (typeof body.total_pages === "number") payload.total_pages = body.total_pages;

  // started_at (aceita YYYY-MM-DD ou ISO)
  if (typeof body.started_at === "string" || body.started_at === null) {
    if (body.started_at === null) payload.started_at = null;
    else {
      const v = body.started_at;
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) payload.started_at = `${v}T00:00:00.000Z`;
      else payload.started_at = new Date(v).toISOString();
    }
  }

  // ✅ finished_at (aceita YYYY-MM-DD ou ISO) — só faz sentido se status=finished
  if (typeof body.finished_at === "string" || body.finished_at === null) {
    if (body.finished_at === null) payload.finished_at = null;
    else {
      const v = body.finished_at;
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) payload.finished_at = `${v}T00:00:00.000Z`;
      else payload.finished_at = new Date(v).toISOString();
    }
  }

  if (typeof body.status === "string") {
    if (!["reading", "finished", "abandoned"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    payload.status = body.status;

    // Se virou finished e não mandou finished_at, usa "agora"
    if (body.status === "finished" && !("finished_at" in payload)) {
      payload.finished_at = new Date().toISOString();
    }

    // Se sair de finished, zera finished_at
    if (body.status !== "finished") payload.finished_at = null;
  }

  if (typeof body.current_page === "number") {
    payload.current_page = body.current_page;
  }

  const { data, error } = await supa
    .from("books")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userRes.user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ book: data });
}



export async function DELETE(req: NextRequest, ctx: Ctx) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const id = await getId(ctx);
  const supa = supaFromToken(token);

  const { data: userRes } = await supa.auth.getUser();
  if (!userRes?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const { error } = await supa.from("books").delete().eq("id", id).eq("user_id", userRes.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
