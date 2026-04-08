import { createClient, type User } from "@supabase/supabase-js";
import type { ManagedUser } from "@/lib/types";

const DEFAULT_BLOCK_DURATION = "876000h";

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function getSupabaseAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRoleKey || !url) return null;

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getAdminEmails() {
  return new Set(
    String(process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminUser(user: Pick<User, "email" | "app_metadata">) {
  const email = user.email?.trim().toLowerCase() ?? "";
  const adminEmails = getAdminEmails();
  if (email && adminEmails.has(email)) return true;

  const appMetadata = asRecord(user.app_metadata);
  const role = typeof appMetadata.role === "string" ? appMetadata.role.toLowerCase() : "";
  if (role === "admin") return true;

  const roles = Array.isArray(appMetadata.roles) ? appMetadata.roles : [];
  return roles.some((value) => typeof value === "string" && value.toLowerCase() === "admin");
}

export function getBlockDuration() {
  return process.env.ADMIN_BLOCK_DURATION?.trim() || DEFAULT_BLOCK_DURATION;
}

export function mergeBlockedMetadata(appMetadata: unknown, blocked: boolean) {
  const current = asRecord(appMetadata);
  const habitTrack = asRecord(current.habittrack);

  return {
    ...current,
    habittrack: {
      ...habitTrack,
      blocked,
    },
  };
}

function extractName(user: Pick<User, "user_metadata">) {
  const metadata = asRecord(user.user_metadata);
  const candidates = [metadata.full_name, metadata.name, metadata.display_name];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

export function mapManagedUser(rawUser: User & { banned_until?: string | null }, currentUserId?: string): ManagedUser {
  const appMetadata = asRecord(rawUser.app_metadata);
  const habitTrack = asRecord(appMetadata.habittrack);
  const metadataBlocked = habitTrack.blocked === true;
  const blockedUntil = typeof rawUser.banned_until === "string" ? rawUser.banned_until : null;
  const blockedByDate = blockedUntil ? new Date(blockedUntil).getTime() > Date.now() : false;

  return {
    id: rawUser.id,
    email: rawUser.email ?? null,
    name: extractName(rawUser),
    last_sign_in_at: rawUser.last_sign_in_at ?? null,
    created_at: rawUser.created_at,
    blocked_until: blockedUntil,
    is_blocked: metadataBlocked || blockedByDate,
    is_current_user: rawUser.id === currentUserId,
  };
}
