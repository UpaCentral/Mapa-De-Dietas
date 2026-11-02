import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === "true" ? "/Mapa-De-Dietas/" : "/",
  build: {
    sourcemap: false,
    target: "es2022",
  },
});
