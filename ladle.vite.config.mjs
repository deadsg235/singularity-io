import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  root: process.cwd(),
  css: {
    postcss: resolve(process.cwd(), "postcss.config.mjs"),
  },
  resolve: {
    alias: {
      "@": resolve(process.cwd(), "src"),
      "next/image": resolve(process.cwd(), "src/toolnote-stories/stubs/NextImage.tsx"),
    },
  },
});
