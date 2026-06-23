import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, existsSync } from "fs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-manifest",
      writeBundle: () => {
        const src = resolve(__dirname, "public", "manifest.json");
        const dest = resolve(__dirname, "dist", "manifest.json");
        if (existsSync(src)) {
          copyFileSync(src, dest);
          console.log("Copied manifest.json to dist/");
        }
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        content: resolve(__dirname, "src/content.ts"),
      },
      output: {
        entryFileNames: "assets/[name].js",
      },
    },
  },
});
