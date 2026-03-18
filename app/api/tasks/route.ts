import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { coerceTaskStatus, getTaskStatus, isTaskStatus } from "@/lib/tasks";
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

export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const supa = supaFromToken(token);
  const { data: userRes } = await supa.auth.getUser();
  if (!userRes?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type"); // due|scheduled|anytime|null
  const done = url.searchParams.get("done"); // true|false|null
  const status = url.searchParams.get("status");
  const category = parseCategory(url.searchParams.get("category"));
  const uncategorized = url.searchParams.get("uncategorized") === "true";

  if (status && !isTaskStatus(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  let q = supa.from("tasks").select("*").eq("user_id", userRes.user.id);

  if (type) q = q.eq("task_type", type);
  if (done === "true") q = q.eq("is_done", true);
  if (done === "false") q = q.eq("is_done", false);
  if (category) q = q.eq("category", category);
  if (uncategorized) q = q.is("category", null);

  const { data, error } = await q
    .order("is_done", { ascending: true })
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const tasks = status ? (data ?? []).filter((task) => getTaskStatus(task) === status) : (data ?? []);
  return NextResponse.json({ tasks });
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
  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  const task_type = body.task_type as "due" | "scheduled" | "anytime";
  if (!["due", "scheduled", "anytime"].includes(task_type)) {
    return NextResponse.json({ error: "Invalid task_type" }, { status: 400 });
  }

  const priority = (body.priority ?? "medium") as "low" | "medium" | "high";
  if (!["low", "medium", "high"].includes(priority)) {
    return NextResponse.json({ error: "Invalid priority" }, { status: 400 });
  }

  let status: TaskStatus;
  try {
    status = parseTaskStatus(body.status, body.is_done === true);
  } catch {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const payload: {
    user_id: string;
    title: string;
    notes: string | null;
    category: string | null;
    task_type: "due" | "scheduled" | "anytime";
    priority: "low" | "medium" | "high";
    status: TaskStatus;
    is_done: boolean;
    due_date: string | null;
    scheduled_at: string | null;
  } = {
    user_id: userRes.user.id,
    title,
    notes: typeof body.notes === "string" ? body.notes.trim() || null : body.notes ?? null,
    category: parseCategory(body.category) ?? null,
    task_type,
    priority,
    status,
    is_done: status === "done",
    due_date: null,
    scheduled_at: null,
  };

  if (task_type === "due") payload.due_date = body.due_date; // YYYY-MM-DD
  if (task_type === "scheduled") payload.scheduled_at = body.scheduled_at; // ISO

  let { data, error } = await supa.from("tasks").insert(payload).select("*").single();

  if (error && isMissingStatusColumn(error.message)) {
    const { status: ignoredStatus, ...legacyPayload } = payload;
    void ignoredStatus;
    ({ data, error } = await supa.from("tasks").insert(legacyPayload).select("*").single());
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ task: data });
}
