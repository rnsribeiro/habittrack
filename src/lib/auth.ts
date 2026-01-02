import { supabase } from "@/src/lib/supabase/client";

export async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
