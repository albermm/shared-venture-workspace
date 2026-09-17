import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    const missing = [
      !url && "SUPABASE_URL",
      !key && "SUPABASE_SERVICE_ROLE_KEY",
    ].filter(Boolean);
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }

  client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return client;
}
