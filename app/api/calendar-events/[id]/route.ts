import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { CalendarEventStatus } from "@/lib/types";

const EVENT_STATUSES: CalendarEventStatus[] = ["planned", "done", "canceled"];
const DEFAULT_COLOR = "#22c55e";

type Ctx = { params: { id: string } | Promise<{ id: string }> };

async function getId(ctx: Ctx) {
  const resolved = await ctx.params;
  return resolved.id;
}

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
  if (typeof value !== "string") return undefined;
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : DEFAULT_COLOR;
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

  const payload: Record<string, string | boolean | null> = {};
  let startForComparison: string | null = null;
  let endForComparison: string | null = null;

  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
    payload.title = title;
  }

  const notes = parseNullableText(body.notes, 1000);
  if (notes !== undefined) payload.notes = notes;

  const location = parseNullableText(body.location, 160);
  if (location !== undefined) payload.location = location;

  const category = parseNullableText(body.category, 80);
  if (category !== undefined) payload.category = category;

  const color = parseColor(body.color);
  if (color !== undefined) payload.color = color;

  if (typeof body.all_day === "boolean") payload.all_day = body.all_day;

  if (typeof body.status === "string") {
    if (!EVENT_STATUSES.includes(body.status as CalendarEventStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    payload.status = body.status;
  }

  if (body.start_at !== undefined) {
    const startAt = parseDateTime(body.start_at);
    if (!startAt) return NextResponse.json({ error: "Invalid start_at" }, { status: 400 });
    payload.start_at = startAt;
    startForComparison = startAt;
  }

  if (body.end_at !== undefined) {
    if (body.end_at === null || body.end_at === "") {
      payload.end_at = null;
    } else {
      const endAt = parseDateTime(body.end_at);
      if (!endAt) return NextResponse.json({ error: "Invalid end_at" }, { status: 400 });
      payload.end_at = endAt;
      endForComparison = endAt;
    }
  }

  if (startForComparison && endForComparison && new Date(endForComparison).getTime() <= new Date(startForComparison).getTime()) {
    return NextResponse.json({ error: "end_at must be after start_at" }, { status: 400 });
  }

  const { data, error } = await supa
    .from("calendar_events")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userRes.user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ event: data });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const id = await getId(ctx);
  const supa = supaFromToken(token);

  const { data: userRes } = await supa.auth.getUser();
  if (!userRes?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const { error } = await supa.from("calendar_events").delete().eq("id", id).eq("user_id", userRes.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
