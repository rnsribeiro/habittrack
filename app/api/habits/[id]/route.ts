// app/api/habits/[id]/route.ts
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

// ✅ No Next 16 (Turbopack), params pode vir como Promise no tipo gerado
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
    .from("habits")
    .select("*")
    .eq("id", id)
    .eq("user_id", userRes.user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ habit: data });
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

  // Campos permitidos
  const payload: any = {};
  if (typeof body.title === "string") payload.title = body.title;
  if (typeof body.color === "string") payload.color = body.color;

  const { data, error } = await supa
    .from("habits")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userRes.user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ habit: data });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const id = await getId(ctx);

  const supa = supaFromToken(token);
  const { data: userRes } = await supa.auth.getUser();
  if (!userRes?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const { error } = await supa
    .from("habits")
    .delete()
    .eq("id", id)
    .eq("user_id", userRes.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
