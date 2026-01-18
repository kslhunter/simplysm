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
  test: {
    globals: true,
    environment: "node",
    coverage: {
      reportsDirectory: "./.coverage",
    },
    // 여기에 projects 배열로 정의
    projects: [
      // 패키지 단위 테스트 (Node 환경)
      {
        extends: true,
        test: {
          name: "packages",
          include: ["packages/*/tests/**/*.spec.ts"],
          exclude: ["packages/excel/tests/**/*.spec.ts"],
          testTimeout: 30000,
        },
      },
      // Excel 패키지 테스트 (브라우저 환경)
      {
        extends: true,
        test: {
          name: "excel",
          include: ["packages/excel/tests/**/*.spec.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
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
            instances: [{ browser: "chromium" }],
            screenshotFailures: false,
          },
        },
      },
    ],
  },
});
