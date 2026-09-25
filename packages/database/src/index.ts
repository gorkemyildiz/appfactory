import { createClient } from "@supabase/supabase-js";
export {
  ProjectSync,
  type ProjectRepository,
  type CloudRow,
  type PendingProject,
} from "./project-sync";
export function createSupabaseClient(config: {
  url?: string;
  publishableKey?: string;
}) {
  if (!config.url || !config.publishableKey) return null;
  return createClient(config.url, config.publishableKey);
}
