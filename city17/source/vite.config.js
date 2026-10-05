import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
// Build = un seul index.html autonome, à poser à la racine du repo GitHub (GitHub Pages).
export default defineConfig({ base: "./", plugins: [viteSingleFile()], build: { outDir: "dist" } });
