import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getToken(req: Request) {
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

export async function GET(req: Request) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const supa = supaFromToken(token);
  const { data: userRes } = await supa.auth.getUser();
  if (!userRes?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const { data, error } = await supa
    .from("habits")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ habits: data });
}

export async function POST(req: Request) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.title) return NextResponse.json({ error: "title required" }, { status: 400 });

  const supa = supaFromToken(token);
  const { data: userRes } = await supa.auth.getUser();
  if (!userRes?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const payload = {
    user_id: userRes.user.id,
    title: body.title,
    color: body.color ?? "#22c55e",
    frequency: body.frequency ?? "daily",
  };

  const { data, error } = await supa.from("habits").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ habit: data });
}
