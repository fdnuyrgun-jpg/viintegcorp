import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Runtime-safe Supabase client.
 *
 * Uses the configured Vite env vars. Ensure you supply your own Supabase project
 * credentials via VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
 */

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  // legacy/alternate naming
  (import.meta.env as unknown as Record<string, string | undefined>).SUPABASE_URL;

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  // legacy/alternate naming
  (import.meta.env as unknown as Record<string, string | undefined>).SUPABASE_PUBLISHABLE_KEY ||
  (import.meta.env as unknown as Record<string, string | undefined>).SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    "Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY."
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
