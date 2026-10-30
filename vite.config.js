import { defineConfig } from "vite";
// base relativa: sirve igual en GitHub Pages (/Pekatenis3D/) y dentro de la APK.
export default defineConfig({
  base: "./",
  build: { target: ["es2020", "chrome87"], cssTarget: ["chrome87"], chunkSizeWarningLimit: 1500 },
});
