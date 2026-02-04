import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";

// Эмуляция __dirname для ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false, // Отключает раздражающий оверлей с ошибками на весь экран
    },
  },
  plugins: [react()],
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
});