import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";
import tsconfigPaths from "vite-tsconfig-paths";
import { sdAngularPlugin } from "./packages/sd-cli/src/angular/vite-angular-plugin";

process.env["DEV"] = "true";
process.env["VER"] = "1.0.0-test";

export default defineConfig({
  plugins: [tsconfigPaths()],
  define: {
    "import.meta.env.DEV": JSON.stringify("true"),
    "import.meta.env.VER": JSON.stringify("1.0.0-test"),
  },
  test: {
    testTimeout: 30000,
    coverage: {
      provider: "v8",
      reportsDirectory: "./.coverage",
    },
    projects: [
      // Node environment tests (node + common packages)
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["packages/*/tests/**/*.spec.{ts,js,mjs,cjs}"],
          exclude: [
            "packages/core-browser/tests/**/*.spec.{ts,js,mjs,cjs}",
            "packages/angular/tests/**/*.spec.{ts,js,mjs,cjs}",
          ],
        },
      },
      // Playwright environment tests (browser + common packages)
      {
        extends: true,
        test: {
          name: "browser",
          include: ["packages/*/tests/**/*.spec.{ts,js,mjs,cjs}"],
          exclude: [
            "packages/sd-cli/tests/**/*.spec.{ts,js,mjs,cjs}",
            "packages/sd-claude/tests/**/*.spec.{ts,js,mjs,cjs}",
            "packages/core-node/tests/**/*.spec.{ts,js,mjs,cjs}",
            "packages/lint/tests/**/*.spec.{ts,js,mjs,cjs}",
            "packages/orm-node/tests/**/*.spec.{ts,js,mjs,cjs}",
            "packages/service-server/tests/**/*.spec.{ts,js,mjs,cjs}",
            "packages/storage/tests/**/*.spec.{ts,js,mjs,cjs}",
            "packages/angular/tests/**/*.spec.{ts,js,mjs,cjs}",
          ],
          browser: {
            provider: playwright(),
            enabled: true,
            headless: true,
            screenshotFailures: false,
            instances: [{ browser: "chromium", viewport: { width: 1920, height: 1080 } }],
          },
        },
      },
      // Angular tests (TestBed + Playwright)
      {
        extends: true,
        plugins: [
          sdAngularPlugin({ pkg: "angular" }),
        ],
        test: {
          name: "angular",
          include: ["packages/angular/tests/**/*.spec.{ts,js,mjs,cjs}"],
          setupFiles: ["./packages/angular/tests/vitest.setup.ts"],
          browser: {
            provider: playwright(),
            enabled: true,
            headless: true,
            screenshotFailures: false,
            instances: [{ browser: "chromium", viewport: { width: 1920, height: 1080 } }],
          },
        },
      },
      // Integration tests - Vite CSS HMR (side-effect CSS + PostCSS)
      {
        extends: true,
        test: {
          name: "vite-css-hmr",
          environment: "node",
          include: ["tests/vite-css-hmr/**/*.spec.ts"],
        },
      },
      // Integration tests - esbuild banner env injection
      {
        extends: true,
        test: {
          name: "sd-cli-server",
          environment: "node",
          include: ["tests/sd-cli-server/**/*.spec.ts"],
        },
      },
      // Integration tests - Vite define env injection
      {
        extends: true,
        test: {
          name: "sd-cli-client",
          environment: "node",
          include: ["tests/sd-cli-client/**/*.spec.ts"],
        },
      },
      // Integration tests - ORM (requires Docker DB)
      {
        extends: true,
        test: {
          name: "orm",
          environment: "node",
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
            provider: playwright(),
            enabled: true,
            headless: true,
            screenshotFailures: false,
            instances: [{ browser: "chromium", viewport: { width: 1920, height: 1080 } }],
          },
        },
      },
    ],
  },
});
