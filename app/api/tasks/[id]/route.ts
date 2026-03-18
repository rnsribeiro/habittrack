import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { coerceTaskStatus, isTaskStatus } from "@/lib/tasks";
import type { TaskStatus } from "@/lib/types";

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

function parseCategory(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 60) : null;
}

function parseTaskStatus(value: unknown, fallbackIsDone = false): TaskStatus {
  if (value === undefined || value === null || value === "") {
    return coerceTaskStatus(undefined, fallbackIsDone);
  }

  if (!isTaskStatus(value)) {
    throw new Error("Invalid status");
  }

  return value;
}

function isMissingStatusColumn(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("status") && (normalized.includes("column") || normalized.includes("schema cache"));
}

type Ctx = { params: { id: string } | Promise<{ id: string }> };
async function getId(ctx: Ctx) {
  const resolved = await Promise.resolve(ctx.params);
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
    .from("tasks")
    .select("*")
    .eq("id", id)
    .eq("user_id", userRes.user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ task: data });
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

  const payload: Record<string, unknown> = {};
  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
    payload.title = title;
  }

  if (typeof body.notes === "string" || body.notes === null) {
    payload.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  }

  if (typeof body.status === "string") {
    if (!isTaskStatus(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    payload.status = body.status;
    payload.is_done = body.status === "done";
  } else if (typeof body.is_done === "boolean") {
    const status = parseTaskStatus(undefined, body.is_done);
    payload.status = status;
    payload.is_done = body.is_done;
  }

  if (body.category === null || typeof body.category === "string") {
    const category = parseCategory(body.category);
    payload.category = category ?? null;
  }

  if (typeof body.priority === "string") {
    if (!["low", "medium", "high"].includes(body.priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
    }
    payload.priority = body.priority;
  }

  if (typeof body.task_type === "string") {
    if (!["due", "scheduled", "anytime"].includes(body.task_type)) {
      return NextResponse.json({ error: "Invalid task_type" }, { status: 400 });
    }
    payload.task_type = body.task_type;
    payload.due_date = null;
    payload.scheduled_at = null;
    if (body.task_type === "due") payload.due_date = body.due_date;
    if (body.task_type === "scheduled") payload.scheduled_at = body.scheduled_at;
  }

  let { data, error } = await supa
    .from("tasks")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userRes.user.id)
    .select("*")
    .single();

  if (error && isMissingStatusColumn(error.message) && "status" in payload) {
    const legacyPayload = { ...payload };
    delete legacyPayload.status;

    ({ data, error } = await supa
      .from("tasks")
      .update(legacyPayload)
      .eq("id", id)
      .eq("user_id", userRes.user.id)
      .select("*")
      .single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ task: data });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const id = await getId(ctx);
  const supa = supaFromToken(token);

  const { data: userRes } = await supa.auth.getUser();
  if (!userRes?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const { error } = await supa.from("tasks").delete().eq("id", id).eq("user_id", userRes.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
