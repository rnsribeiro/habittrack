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

export async function POST(req: Request) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.habit_id || !body?.date) {
    return NextResponse.json({ error: "habit_id and date required" }, { status: 400 });
  }

  const supa = supaFromToken(token);
  const { data: userRes } = await supa.auth.getUser();
  if (!userRes?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const { habit_id, date } = body as { habit_id: string; date: string };

  const { data: existing, error: exErr } = await supa
    .from("habit_completions")
    .select("id")
    .eq("habit_id", habit_id)
    .eq("date", date)
    .maybeSingle();

  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });

  if (existing?.id) {
    const { error } = await supa.from("habit_completions").delete().eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ done: false });
  }

  const { error } = await supa.from("habit_completions").insert({
    user_id: userRes.user.id,
    habit_id,
    date,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ done: true });
}
