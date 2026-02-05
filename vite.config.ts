import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";

// Эмуляция __dirname для ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Vite only exposes variables prefixed with VITE_ to the client.
  // Bridge server-provided Supabase envs when present to avoid injecting `undefined`.
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY;

  const defineEnv: Record<string, string> = {};
  if (supabaseUrl) {
    defineEnv["import.meta.env.VITE_SUPABASE_URL"] = JSON.stringify(supabaseUrl);
  }
  if (supabaseKey) {
    defineEnv["import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY"] = JSON.stringify(supabaseKey);
  }

  return {
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false, // Отключает раздражающий оверлей с ошибками на весь экран
    },
  },
  plugins: [
    react(),
  ].filter(Boolean),
  define: defineEnv,
  resolve: {
    alias: {
      // Route all app imports to the runtime-safe Supabase client implementation.
      "@/integrations/supabase/client": path.resolve(
        __dirname,
        "./src/integrations/supabase/client.runtime.ts"
      ),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: {
          // Выделяем основные зависимости в отдельные файлы для кэширования
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "supabase-vendor": ["@supabase/supabase-js"],
          "editor-vendor": [
            "@tiptap/react", 
            "@tiptap/starter-kit",
            "@tiptap/extension-link",
            "@tiptap/extension-image"
          ],
          "ui-vendor": ["framer-motion", "lucide-react"],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Немного подняли лимит, так как чанки все равно разделены
  },
  };
});
