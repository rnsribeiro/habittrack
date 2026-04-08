import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getBlockDuration,
  getSupabaseAdminClient,
  isAdminUser,
  mapManagedUser,
  mergeBlockedMetadata,
} from "@/src/lib/supabase/admin";

function getToken(req: NextRequest) {
  const header = req.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

function supaFromToken(token: string) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

type Ctx = { params: { id: string } | Promise<{ id: string }> };

async function getId(ctx: Ctx) {
  const resolved = await Promise.resolve(ctx.params);
  return resolved.id as string;
}

async function getRequester(req: NextRequest) {
  const token = getToken(req);
  if (!token) return { error: NextResponse.json({ error: "Missing token" }, { status: 401 }) };

  const supa = supaFromToken(token);
  const { data: userRes } = await supa.auth.getUser();
  if (!userRes?.user) return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };

  return { user: userRes.user };
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const requester = await getRequester(req);
  if ("error" in requester) return requester.error;

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required." }, { status: 503 });
  }

  if (!isAdminUser(requester.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = await getId(ctx);
  if (userId === requester.user.id) {
    return NextResponse.json({ error: "You cannot manage your own user from this screen." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const action = body?.action;
  if (action !== "block" && action !== "unblock") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { data: existing, error: existingError } = await adminClient.auth.admin.getUserById(userId);
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  if (!existing.user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const nextAppMetadata = mergeBlockedMetadata(existing.user.app_metadata, action === "block");
  const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: nextAppMetadata,
    ban_duration: action === "block" ? getBlockDuration() : "none",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data.user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ user: mapManagedUser(data.user, requester.user.id) });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const requester = await getRequester(req);
  if ("error" in requester) return requester.error;

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is required." }, { status: 503 });
  }

  if (!isAdminUser(requester.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = await getId(ctx);
  if (userId === requester.user.id) {
    return NextResponse.json({ error: "You cannot delete your own user from this screen." }, { status: 400 });
  }

  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
