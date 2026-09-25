import { createClient } from "@supabase/supabase-js";
export function createSupabaseClient(config: {
  url?: string;
  publishableKey?: string;
}) {
  if (!config.url || !config.publishableKey) return null;
  return createClient(config.url, config.publishableKey);
}
