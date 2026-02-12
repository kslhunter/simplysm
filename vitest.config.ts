import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { playwright } from "@vitest/browser-playwright";
import tailwindcss from "tailwindcss";

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
    // 여기에 projects 배열로 정의
    projects: [
      // Node 환경 테스트 (node + common 패키지)
      {
        extends: true,
        test: {
          name: "node",
          include: ["packages/*/tests/**/*.spec.{ts,tsx,js}"],
          exclude: [
            // browser 전용 패키지 제외
            "packages/core-browser/tests/**/*.spec.{ts,tsx,js}",
            // solid 패키지는 별도 프로젝트에서 테스트
            "packages/solid/tests/**/*.spec.{ts,tsx,js}",
          ],
          testTimeout: 30000,
        },
      },
      // Playwright 환경 테스트 (browser + common 패키지)
      {
        extends: true,
        test: {
          name: "browser",
          include: ["packages/*/tests/**/*.spec.{ts,tsx,js}"],
          exclude: [
            // node 전용 패키지 제외
            "packages/sd-cli/tests/**/*.spec.{ts,tsx,js}",
            "packages/core-node/tests/**/*.spec.{ts,tsx,js}",
            "packages/eslint-plugin/tests/**/*.spec.{ts,tsx,js}",
            "packages/orm-node/tests/**/*.spec.{ts,tsx,js}",
            "packages/service-server/tests/**/*.spec.{ts,tsx,js}",
            "packages/storage/tests/**/*.spec.{ts,tsx,js}",
            // solid 패키지는 별도 프로젝트에서 테스트
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
      // SolidJS 테스트 (solid 패키지 전용)
      {
        extends: true,
        plugins: [
          tsconfigPaths({ projects: ["tsconfig.json"] }),
          (await import("vite-plugin-solid")).default() as never,
        ],
        css: {
          postcss: {
            plugins: [tailwindcss({ config: "./packages/solid/tailwind.config.ts" })],
          },
        },
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
      // 통합 테스트 - ORM (Docker DB 필요)
      {
        extends: true,
        test: {
          name: "orm",
          include: ["tests/orm/**/*.spec.ts"],
          globalSetup: "./tests/orm/vitest.setup.ts",
          fileParallelism: false,
        },
      },
      // 통합 테스트 - Service (서버 필요 + 브라우저 테스트)
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
