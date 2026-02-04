const requiredEnvVars = ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"] as const;

export function validateEnv(): void {
  if (!import.meta.env.PROD) return;

  const missing = requiredEnvVars.filter((key) => !import.meta.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Set them in your hosting provider's environment settings."
    );
  }
}
