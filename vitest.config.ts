import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { playwright } from "@vitest/browser-playwright";

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
    // Define projects array here
    projects: [
      // Node environment tests (node + common packages)
      {
        extends: true,
        test: {
          name: "node",
          include: ["packages/*/tests/**/*.spec.{ts,tsx,js}"],
          exclude: [
            // Exclude browser-only packages
            "packages/core-browser/tests/**/*.spec.{ts,tsx,js}",
            // solid package is tested in a separate project
            "packages/solid/tests/**/*.spec.{ts,tsx,js}",
          ],
          testTimeout: 30000,
        },
      },
      // Playwright environment tests (browser + common packages)
      {
        extends: true,
        test: {
          name: "browser",
          include: ["packages/*/tests/**/*.spec.{ts,tsx,js}"],
          exclude: [
            // Exclude node-only packages
            "packages/sd-cli/tests/**/*.spec.{ts,tsx,js}",
            "packages/sd-claude/tests/**/*.spec.{ts,tsx,js}",
            "packages/core-node/tests/**/*.spec.{ts,tsx,js}",
            "packages/lint/tests/**/*.spec.{ts,tsx,js}",
            "packages/orm-node/tests/**/*.spec.{ts,tsx,js}",
            "packages/service-server/tests/**/*.spec.{ts,tsx,js}",
            "packages/storage/tests/**/*.spec.{ts,tsx,js}",
            // solid package is tested in a separate project
            "packages/solid/tests/**/*.spec.{ts,tsx,js}",
          ],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium", viewport: { width: 1920, height: 1080 } }],
            screenshotFailures: false,
          },
        },
      },
      // SolidJS tests (solid package only)
      {
        extends: true,
        plugins: [(await import("vite-plugin-solid")).default() as never],
        test: {
          name: "solid",
          include: ["packages/solid/tests/**/*.spec.{ts,tsx,js}"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium", viewport: { width: 1920, height: 1080 } }],
            screenshotFailures: false,
          },
        },
      },
      // Integration tests - ORM (requires Docker DB)
      {
        extends: true,
        test: {
          name: "orm",
          include: ["tests/orm/**/*.spec.ts"],
          globalSetup: "./tests/orm/vitest.setup.ts",
          fileParallelism: false,
        },
      },
      // Integration tests - Service (requires server + browser tests)
      {
        extends: true,
        test: {
          name: "service",
          include: ["tests/service/**/*.spec.ts"],
          globalSetup: "./tests/service/vitest.setup.ts",
          fileParallelism: true,
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium", viewport: { width: 1920, height: 1080 } }],
            screenshotFailures: false,
          },
        },
      },
    ],
  },
});
