import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    tsconfigPaths({
      root: __dirname,
      projects: ["./tsconfig.json"],
    }),
  ],
  define: {
    "process.env.DEV": JSON.stringify("true"),
    "process.env.VER": JSON.stringify("1.0.0-test"),
  },
  test: {
    globals: true,
    environment: "node",
    coverage: {
      reportsDirectory: "./.coverage",
    },
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          include: ["packages/*/tests/**/*.spec.{ts,tsx,js}"],
          testTimeout: 30000,
        },
      },
    ],
  },
});
