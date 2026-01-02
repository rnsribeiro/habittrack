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

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json({ error: "start and end required" }, { status: 400 });
  }

  const supa = supaFromToken(token);
  const { data: userRes } = await supa.auth.getUser();
  if (!userRes?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const { data, error } = await supa
    .from("habit_completions")
    .select("habit_id,date")
    .gte("date", start)
    .lte("date", end);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ completions: data });
}
