import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@airdelta/engine": path.resolve(__dirname, "packages/engine/src/index.ts"),
      "@airdelta/schemas": path.resolve(__dirname, "packages/schemas/src/index.ts"),
      "@airdelta/i18n": path.resolve(__dirname, "packages/i18n/src/index.ts"),
      "@airdelta/fix-library": path.resolve(__dirname, "packages/fix-library/src/index.ts"),
      "@airdelta/air-adapters": path.resolve(__dirname, "packages/air-adapters/src/index.ts")
    }
  },
  test: {
    globals: true,
    environment: "node",
    include: [
      "**/*.test.ts"
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.astro/**"
    ]
  }
});
