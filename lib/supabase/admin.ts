import { createClient } from "@supabase/supabase-js";

/*
 * NUR SERVERSEITIG VERWENDEN (API-Routen, Webhooks) - der Service-Role-
 * Key umgeht sämtliche Row-Level-Security-Policies. Landet dieser Key
 * jemals im Client-Bundle, kann jeder Besucher der Seite damit auf die
 * komplette Datenbank zugreifen, ohne jede Einschränkung.
 */

export function createAdminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
