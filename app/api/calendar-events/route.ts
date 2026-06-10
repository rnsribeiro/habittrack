import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { CalendarEvent, CalendarEventStatus } from "@/lib/types";

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

function startOfLocalDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function daysBetweenLocalDates(from: Date, to: Date) {
  const fromDay = startOfLocalDay(from);
  const toDay = startOfLocalDay(to);
  return Math.max(0, Math.floor((toDay.getTime() - fromDay.getTime()) / 86400000));
}

async function rollPendingEventsToToday(supa: ReturnType<typeof supaFromToken>, userId: string) {
  const todayStart = startOfLocalDay(new Date());

  const { data, error } = await supa
    .from("calendar_events")
    .select("id,start_at,end_at")
    .eq("user_id", userId)
    .eq("status", "planned")
    .lt("start_at", todayStart.toISOString());

  if (error) return error;

  const overdueEvents = (data ?? []) as Pick<CalendarEvent, "id" | "start_at" | "end_at">[];
  await Promise.all(
    overdueEvents.map((event) => {
      const startAt = new Date(event.start_at);
      const daysToMove = daysBetweenLocalDates(startAt, todayStart);
      if (daysToMove <= 0) return Promise.resolve();

      const nextStart = addDays(startAt, daysToMove);
      const nextEnd = event.end_at ? addDays(new Date(event.end_at), daysToMove) : null;

      return supa
        .from("calendar_events")
        .update({
          start_at: nextStart.toISOString(),
          end_at: nextEnd ? nextEnd.toISOString() : null,
        })
        .eq("id", event.id)
        .eq("user_id", userId);
    })
  );
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

  const rolloverError = await rollPendingEventsToToday(supa, userRes.user.id);
  if (rolloverError) return NextResponse.json({ error: rolloverError.message }, { status: 500 });

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
