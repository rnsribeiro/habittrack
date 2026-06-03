import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { CalendarEventStatus } from "@/lib/types";

const EVENT_STATUSES: CalendarEventStatus[] = ["planned", "done", "canceled"];
const DEFAULT_COLOR = "#22c55e";

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

function parseNullableText(value: unknown, maxLength = 500) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function parseDateTime(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseColor(value: unknown) {
  if (typeof value !== "string") return DEFAULT_COLOR;
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : DEFAULT_COLOR;
}

function parseStatus(value: unknown): CalendarEventStatus {
  return EVENT_STATUSES.includes(value as CalendarEventStatus) ? (value as CalendarEventStatus) : "planned";
}

export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const supa = supaFromToken(token);
  const { data: userRes } = await supa.auth.getUser();
  if (!userRes?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const url = new URL(req.url);
  const start = parseDateTime(url.searchParams.get("start"));
  const end = parseDateTime(url.searchParams.get("end"));
  const status = url.searchParams.get("status");

  if (status && !EVENT_STATUSES.includes(status as CalendarEventStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  let q = supa.from("calendar_events").select("*").eq("user_id", userRes.user.id);

  if (start) q = q.gte("start_at", start);
  if (end) q = q.lt("start_at", end);
  if (status) q = q.eq("status", status);

  const { data, error } = await q.order("start_at", { ascending: true }).order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ events: data ?? [] });
}

export async function POST(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const supa = supaFromToken(token);
  const { data: userRes } = await supa.auth.getUser();
  if (!userRes?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const startAt = parseDateTime(body.start_at);
  if (!startAt) return NextResponse.json({ error: "Valid start_at required" }, { status: 400 });

  const endAt = body.end_at === null || body.end_at === "" || body.end_at === undefined ? null : parseDateTime(body.end_at);
  if (body.end_at && !endAt) return NextResponse.json({ error: "Invalid end_at" }, { status: 400 });
  if (endAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
    return NextResponse.json({ error: "end_at must be after start_at" }, { status: 400 });
  }

  const { data, error } = await supa
    .from("calendar_events")
    .insert({
      user_id: userRes.user.id,
      title,
      notes: parseNullableText(body.notes, 1000) ?? null,
      location: parseNullableText(body.location, 160) ?? null,
      category: parseNullableText(body.category, 80) ?? null,
      color: parseColor(body.color),
      start_at: startAt,
      end_at: endAt,
      all_day: body.all_day === true,
      status: parseStatus(body.status),
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ event: data });
}
