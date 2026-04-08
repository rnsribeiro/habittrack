import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient, isAdminUser, mapManagedUser } from "@/src/lib/supabase/admin";

function getToken(req: NextRequest) {
  const header = req.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

function supaFromToken(token: string) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const supa = supaFromToken(token);
  const { data: userRes } = await supa.auth.getUser();
  if (!userRes?.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  const isAdmin = isAdminUser(userRes.user);

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return NextResponse.json({
      enabled: false,
      canManage: false,
      isAdmin,
      reason: "missing_service_role",
      users: [],
    });
  }

  if (!isAdmin) {
    return NextResponse.json({
      enabled: true,
      canManage: false,
      isAdmin: false,
      reason: "not_admin",
      users: [],
    });
  }

  const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = (data.users ?? []).map((user) => mapManagedUser(user, userRes.user.id));
  return NextResponse.json({
    enabled: true,
    canManage: true,
    isAdmin: true,
    users,
  });
}
