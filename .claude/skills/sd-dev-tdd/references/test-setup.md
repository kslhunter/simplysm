# 테스트 환경 세팅 가이드

프로젝트에 기존 테스트(`*.spec.ts`)와 테스트 설정(`vitest.config.ts`)이 모두 없을 때 이 문서를 참고하여 테스트 환경을 구성한다.

## 테스트 디렉토리

각 패키지의 `src/`와 동일 레벨에 `tests/` 디렉토리를 생성한다. 하위 디렉토리는 소스 구조를 미러링한다.

```
packages/{pkg}/
├── src/
└── tests/
    ├── vitest.setup.ts          ← Angular 패키지만
    ├── {category}/              ← services/, utils/, components/ 등
    │   ├── {대상}.spec.ts
    │   ├── {대상}.unit.spec.ts
    │   └── {대상}.acc.spec.ts

```

## vitest.config.ts

프로젝트 루트에 생성한다. 공통 뼈대에 패키지 유형별 항목을 `projects` 배열에 추가하는 구조다.

### 공통 뼈대

```typescript
import {defineConfig} from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsconfigPaths(),
  ],
  define: {
    "import.meta.env.DEV": JSON.stringify("true"),
    "import.meta.env.VER": JSON.stringify("1.0.0-test"),
  },
  test: {
    testTimeout: 30000,
    env: {
      DEV: "true",
      VER: "1.0.0-test",
    },
    coverage: {
      provider: "v8",
      reportsDirectory: "./.coverage",
    },
    projects: [
      // 패키지 유형별 항목을 여기에 추가
    ],
  },
});
```

Angular 프로젝트 항목이 1개라도 있으면 상단에 import를 추가한다:

```typescript
import {playwright} from "@vitest/browser-playwright";
import {angularVitestPlugin} from "@simplysm/sd-cli";
import path from "node:path";
```

### 패키지 유형별 항목

프로젝트에 해당하는 유형의 항목을 `projects` 배열에 추가한다. 패키지가 여러 개면 각각 항목을 추가한다.

#### Angular 패키지 (브라우저 테스트)

```typescript
{
extends:
  true,
    plugins
:
  [
    angularVitestPlugin({
      tsconfig: path.resolve(import.meta.dirname, "packages/{pkg}/tsconfig.json"),
    }),
  ],
    test
:
  {
    name: "{pkg}",
      setupFiles
  :
    ["packages/{pkg}/tests/vitest.setup.ts"],
      include
  :
    ["packages/{pkg}/tests/**/*.spec.{ts,js,mjs,cjs}"],
      browser
  :
    {
      provider: playwright(),
        enabled
    :
      true,
        headless
    :
      true,
        screenshotFailures
    :
      false,
        instances
    :
      [{browser: "chromium", viewport: {width: 1920, height: 1080}}],
    }
  ,
  }
,
}
,
```

#### Node.js 패키지 (서버, 라이브러리 등)

```typescript
{
extends:
  true,
    test
:
  {
    name: "{pkg}",
      environment
  :
    "node",
      include
  :
    ["packages/{pkg}/tests/**/*.spec.{ts,js,mjs,cjs}"],
  }
,
}
,
```

## vitest.setup.ts (Angular 패키지 전용)

Angular 패키지의 `tests/vitest.setup.ts`에 생성한다.

```typescript
// 프로젝트 글로벌 스타일이 있으면 import (없으면 생략)
// import "../src/styles/_variables.scss";
// import "../src/styles/_global.scss";

import {getTestBed} from "@angular/core/testing";
import {BrowserTestingModule, platformBrowserTesting} from "@angular/platform-browser/testing";
import {beforeEach} from "vitest";

const testBed = getTestBed();
testBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

beforeEach(() => {
  testBed.resetTestingModule();
});
```

네이티브 플러그인 등 브라우저 환경에서 사용 불가능한 의존성은 setup 파일에 글로벌 mock을 추가한다:

```typescript
import {vi} from "vitest";

vi.mock("@capacitor/toast", () => ({
  Toast: {show: vi.fn().mockResolvedValue(undefined)},
}));
```

## devDependencies

테스트 실행에 필요한 의존성이다. 프로젝트의 루트 `package.json`에 추가한다. 프로젝트에 해당 유형의 패키지가 없으면 해당 의존성은 불필요하다.

| 패키지                          | 용도                               | 필요 조건             |
|------------------------------|----------------------------------|-------------------|
| `vitest`                     | 테스트 러너                           | 항상                |
| `vite-tsconfig-paths`        | tsconfig paths 별칭 지원 (vite@^7 용) | 항상                |
| `@vitest/coverage-v8`        | 커버리지 리포팅                         | 항상                |
| `@vitest/browser-playwright` | 브라우저 테스트 프로바이더                   | Angular 패키지가 있을 때 |
| `@simplysm/sd-cli`           | `angularVitestPlugin` 제공         | Angular 패키지가 있을 때 |
