import { defineConfig } from "vitest/config";
import { type LogErrorOptions, type Plugin } from "vite";
import { playwright } from "@vitest/browser-playwright";
import { sdAngularPlugin } from "@simplysm/sd-cli";

process.env["DEV"] = "true";
process.env["VER"] = "1.0.0-test";

// 소스맵 경고 억제:
// - "Failed to load source map": typescript 등 제3자 패키지가 sourceMappingURL 주석만 남기고 .map 을 배포 안 함.
// - "points to missing source files": 변환 체인 sourcesContent 부재 등으로 원본을 못 찾는 vite/vitest 노이즈.
// 둘 다 기능·테스트 결과 무영향이며 우리 코드로 원천 수정 불가. 이 두 패턴만 버리고 나머지 경고는 그대로 통과시킨다.
// vitest 가 자체 로거를 주입해 root customLogger 를 덮으므로, configResolved 시점의 실제 config.logger 를 직접 감싼다.
const sourcemapNoise = /points to missing source files|Failed to load source map/;
function suppressSourcemapWarnings(): Plugin {
  return {
    name: "suppress-sourcemap-warnings",
    configResolved(config): void {
      const logger = config.logger;
      const origWarn = logger.warn.bind(logger);
      const origWarnOnce = logger.warnOnce.bind(logger);
      logger.warn = (msg: string, opts?: LogErrorOptions): void => {
        if (sourcemapNoise.test(msg)) return;
        origWarn(msg, opts);
      };
      logger.warnOnce = (msg: string, opts?: LogErrorOptions): void => {
        if (sourcemapNoise.test(msg)) return;
        origWarnOnce(msg, opts);
      };
    },
  };
}

export default defineConfig({
  plugins: [suppressSourcemapWarnings()],
  resolve: { tsconfigPaths: true },
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
        plugins: [sdAngularPlugin({ pkg: "angular" })],
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
      // Plugin tests (에이전트 확장 - rules 주입 구조 등)
      {
        extends: true,
        test: {
          name: "plugins",
          environment: "node",
          include: ["plugins/*/tests/**/*.spec.ts"],
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
      // Integration tests - esbuild define env injection
      {
        extends: true,
        test: {
          name: "sd-cli-client",
          environment: "node",
          include: ["tests/sd-cli-client/**/*.spec.ts"],
        },
      },
      // Integration tests - SSG (빌드 타임 프리렌더)
      {
        extends: true,
        test: {
          name: "ssg",
          environment: "node",
          include: ["tests/ssg/**/*.spec.ts"],
          testTimeout: 120000,
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
      // Integration tests - service-server Let's Encrypt (requires Docker: pebble + challtestsrv)
      {
        extends: true,
        test: {
          name: "service-server-acme",
          environment: "node",
          include: ["tests/service-server-acme/**/*.spec.ts"],
          globalSetup: "./tests/service-server-acme/vitest.setup.ts",
          fileParallelism: false,
          testTimeout: 120000,
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
