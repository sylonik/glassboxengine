import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat();

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...compat.extends("eslint:recommended"),
  {
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "warn",
    },
  },
  {
    ignores: ["node_modules/", "dist/", ".next/", ".turbo/"],
  },
];
