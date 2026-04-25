# 테스트 환경 세팅 가이드

프로젝트에 기존 테스트(`*.spec.ts`)와 테스트 설정(`vitest.config.ts`)이 모두 없을 때 참고한다.

## 디렉토리 구조

```
packages/{pkg}/
├── src/
└── tests/
    ├── vitest.setup.ts          ← Angular 패키지만
    └── {category}/
        ├── {대상}.spec.ts
        ├── {대상}.unit.spec.ts
        └── {대상}.acc.spec.ts
```

## vitest.config.ts (프로젝트 루트)

```typescript
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
// Angular 패키지가 있을 때만:
// import { playwright } from "@vitest/browser-playwright";
// import { angularVitestPlugin } from "@simplysm/sd-cli";
// import path from "node:path";

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
    coverage: { provider: "v8", reportsDirectory: "./.coverage" },
    projects: [
      // --- Node.js 패키지 ---
      {
        extends: true,
        test: {
          name: "{pkg}",
          environment: "node",
          include: ["packages/{pkg}/tests/**/*.spec.{ts,js,mjs,cjs}"],
        },
      },
      // --- Angular 패키지(Angular 패키지가 있을 때만) ---
      {
        extends: true,
        plugins: [
          angularVitestPlugin({
            tsconfig: path.resolve(import.meta.dirname, "packages/{pkg}/tsconfig.json"),
          }),
        ],
        test: {
          name: "{pkg}",
          setupFiles: ["packages/{pkg}/tests/vitest.setup.ts"],
          include: ["packages/{pkg}/tests/**/*.spec.{ts,js,mjs,cjs}"],
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
```

## vitest.setup.ts (Angular 패키지 전용)

```typescript
// 프로젝트 글로벌 스타일이 있으면 import
// import "../src/styles/_variables.scss";
// import "../src/styles/_global.scss";

import { getTestBed } from "@angular/core/testing";
import { BrowserTestingModule, platformBrowserTesting } from "@angular/platform-browser/testing";
import { beforeEach, vi } from "vitest";

// 네이티브 플러그인 등 브라우저 환경에서 사용 불가능한 의존성 mock
// vi.mock("@capacitor/toast", () => ({
//   Toast: { show: vi.fn().mockResolvedValue(undefined) },
// }));

const testBed = getTestBed();
testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

beforeEach(() => {
  testBed.resetTestingModule();
});
```

## devDependencies

| 패키지                       | 필요 조건                |
| ---------------------------- | ------------------------ |
| `vitest`                     | 항상                     |
| `vite-tsconfig-paths`        | 항상                     |
| `@vitest/coverage-v8`        | 항상                     |
| `@vitest/browser-playwright` | Angular 패키지가 있을 때 |
| `@simplysm/sd-cli`           | Angular 패키지가 있을 때 |
