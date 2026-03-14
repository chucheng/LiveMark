import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import path from "path";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf-8"));

export default defineConfig({
  plugins: [solid()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: "esnext",
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      output: {
        manualChunks: {
          katex: ["katex"],
          hljs: ["highlight.js"],
          prosemirror: [
            "prosemirror-commands",
            "prosemirror-gapcursor",
            "prosemirror-history",
            "prosemirror-inputrules",
            "prosemirror-keymap",
            "prosemirror-model",
            "prosemirror-schema-list",
            "prosemirror-state",
            "prosemirror-tables",
            "prosemirror-transform",
            "prosemirror-view",
          ],
        },
      },
    },
  },
});
