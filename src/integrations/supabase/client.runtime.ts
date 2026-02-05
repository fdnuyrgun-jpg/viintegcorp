import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Runtime-safe Supabase client.
 *
 * In some preview environments `import.meta.env.VITE_SUPABASE_URL` is unexpectedly undefined,
 * which causes `createClient()` to throw `supabaseUrl is required` and blanks the app.
 *
 * We keep the normal env-first behavior but provide a fallback to ensure the preview stays functional.
 */

const FALLBACK_SUPABASE_URL = "https://eultaheyksdazfmszteb.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bHRhaGV5a3NkYXpmbXN6dGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwODA2NzUsImV4cCI6MjA4NTY1NjY3NX0.x5y4jv_HG0_KeON2q224lEiZ84jVj-2Zqq3exD9y5_I";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  // legacy/alternate naming
  (import.meta.env as unknown as Record<string, string | undefined>).SUPABASE_URL ||
  FALLBACK_SUPABASE_URL;

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  // legacy/alternate naming
  (import.meta.env as unknown as Record<string, string | undefined>).SUPABASE_PUBLISHABLE_KEY ||
  (import.meta.env as unknown as Record<string, string | undefined>).SUPABASE_ANON_KEY ||
  FALLBACK_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
