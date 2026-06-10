import { defineConfig, configDefaults } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      // Resolve the `~` alias used by apps/web (maps to the web app root)
      "~": path.resolve(__dirname, "apps/web"),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
  },
});
