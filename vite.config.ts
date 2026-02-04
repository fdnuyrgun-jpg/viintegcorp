import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";
import { componentTagger } from "lovable-tagger";

// Эмуляция __dirname для ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  // Load all env vars (not only VITE_) so we can bridge SUPABASE_* -> VITE_SUPABASE_*
  const env = loadEnv(mode, process.cwd(), "");

  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  // Prefer explicit publishable key, fallback to anon key if that's what exists in Cloud
  const supabaseKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;

  return {
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false, // Отключает раздражающий оверлей с ошибками на весь экран
    },
  },
  // Ensure frontend always receives VITE_SUPABASE_* even if only SUPABASE_* are present
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabaseKey),
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
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