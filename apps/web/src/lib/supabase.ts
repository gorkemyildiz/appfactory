import { createSupabaseClient } from "@app-factory/database";
// Optional infrastructure. The Sprint 1 repository always uses local mock data.
export function getSupabaseClient() {
  return createSupabaseClient({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
