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
  const start = url.searchParams.get("start"); // YYYY-MM-DD
  const end = url.searchParams.get("end");     // YYYY-MM-DD
  if (!start || !end) return NextResponse.json({ error: "Missing start/end" }, { status: 400 });

  const startTs = `${start}T00:00:00.000Z`;
  const endTs = `${end}T23:59:59.999Z`;

  // concluídos no período
  const { data: finishedPeriod, error: e1 } = await supa
    .from("books")
    .select("id,total_pages")
    .eq("user_id", userRes.user.id)
    .eq("status", "finished")
    .gte("finished_at", startTs)
    .lte("finished_at", endTs);

  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const pages_in_period = (finishedPeriod ?? []).reduce((acc, b: any) => acc + (b.total_pages ?? 0), 0);
  const finished_in_period = (finishedPeriod ?? []).length;

  // total geral concluído
  const { data: finishedAll, error: e2 } = await supa
    .from("books")
    .select("total_pages")
    .eq("user_id", userRes.user.id)
    .eq("status", "finished");

  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  const pages_total = (finishedAll ?? []).reduce((acc, b: any) => acc + (b.total_pages ?? 0), 0);

  return NextResponse.json({
    pages_in_period,
    pages_total,
    finished_in_period,
  });
}
