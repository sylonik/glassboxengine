import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs", "iife"],
  globalName: "GlassBoxTracker",
  dts: {
    compilerOptions: {
      composite: false,
      declarationMap: false,
      incremental: false,
      noEmit: false,
    },
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  target: "es2022",
  tsconfig: "./tsconfig.build.json",
});
