# 환경변수 네이밍 컨벤션 통일 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 환경변수 네이밍을 `__DEV__`, `__VER__` 패턴으로 통일하고, `CONSOLA_LEVEL`을 `consola.level` API로 대체

**Architecture:**

- `SD_VERSION` → `__VER__` (언더스코어 패턴 통일)
- `CONSOLA_LEVEL` 환경변수 제거 → `consola.level` API 직접 사용
- 외부 표준 환경변수(`NO_COLOR`, `TIMING`, `ANDROID_HOME` 등)는 유지

**Tech Stack:** TypeScript, consola

---

## Task 1: CONSOLA_LEVEL → consola.level 대체

**Files:**

- Modify: `packages/cli/src/commands/lint.ts:190`
- Modify: `packages/cli/src/commands/typecheck.ts:364`
- Modify: `packages/cli/src/commands/build.ts:414`

**Step 1: lint.ts 수정**

`packages/cli/src/commands/lint.ts` 상단에 import 확인:

```typescript
import { consola, LogLevels } from "consola";
```

라인 190 수정:

```typescript
// 변경 전
renderer: process.env["CONSOLA_LEVEL"] === "debug" ? "verbose" : "default",

// 변경 후
renderer: consola.level >= LogLevels.debug ? "verbose" : "default",
```

**Step 2: typecheck.ts 수정**

`packages/cli/src/commands/typecheck.ts` 상단에 import 확인:

```typescript
import { consola, LogLevels } from "consola";
```

라인 364 수정:

```typescript
// 변경 전
renderer: process.env["CONSOLA_LEVEL"] === "debug" ? "verbose" : "default",

// 변경 후
renderer: consola.level >= LogLevels.debug ? "verbose" : "default",
```

**Step 3: build.ts 수정**

`packages/cli/src/commands/build.ts` 상단에 import 확인:

```typescript
import { consola, LogLevels } from "consola";
```

라인 414 수정:

```typescript
// 변경 전
renderer: process.env["CONSOLA_LEVEL"] === "debug" ? "verbose" : "default",

// 변경 후
renderer: consola.level >= LogLevels.debug ? "verbose" : "default",
```

**Step 4: 타입체크 실행**

Run: `pnpm typecheck packages/cli`
Expected: 성공

**Step 5: Commit**

```bash
git add packages/cli/src/commands/lint.ts packages/cli/src/commands/typecheck.ts packages/cli/src/commands/build.ts
git commit -m "refactor(cli): replace CONSOLA_LEVEL env with consola.level API"
```

---

## Task 2: SD_VERSION → **VER** 변경 (소스 코드)

**Files:**

- Modify: `packages/service-server/src/service-server.ts:62`
- Modify: `packages/solid-demo-server/src/services/health-service.ts:14`
- Modify: `packages/capacitor-plugin-auto-update/src/web/ApkInstallerWeb.ts:27`

**Step 1: service-server.ts 수정**

`packages/service-server/src/service-server.ts:62` 수정:

```typescript
// 변경 전
logger.debug(`서버 시작... ${process.env["SD_VERSION"] ?? ""}`);

// 변경 후
logger.debug(`서버 시작... ${process.env["__VER__"] ?? ""}`);
```

**Step 2: health-service.ts 수정**

`packages/solid-demo-server/src/services/health-service.ts:14` 수정:

```typescript
// 변경 전
version: process.env["SD_VERSION"],

// 변경 후
version: process.env["__VER__"],
```

**Step 3: ApkInstallerWeb.ts 수정**

`packages/capacitor-plugin-auto-update/src/web/ApkInstallerWeb.ts:27` 수정:

```typescript
// 변경 전
versionName: (import.meta as unknown as { env?: Record<string, string> }).env?.["SD_VERSION"] ?? "0.0.0",

// 변경 후
versionName: (import.meta as unknown as { env?: Record<string, string> }).env?.["__VER__"] ?? "0.0.0",
```

**Step 4: 타입체크 실행**

Run: `pnpm typecheck packages/service-server packages/solid-demo-server packages/capacitor-plugin-auto-update`
Expected: 성공

**Step 5: Commit**

```bash
git add packages/service-server/src/service-server.ts packages/solid-demo-server/src/services/health-service.ts packages/capacitor-plugin-auto-update/src/web/ApkInstallerWeb.ts
git commit -m "refactor: rename SD_VERSION to __VER__ in source code"
```

---

## Task 3: SD_VERSION → **VER** 변경 (CLI 내부)

**Files:**

- Modify: `packages/cli/src/commands/publish.ts:61`
- Modify: `packages/cli/src/sd-config.types.ts:24,46`

**Step 1: publish.ts 수정**

`packages/cli/src/commands/publish.ts:61` 수정:

```typescript
// 변경 전
if (envName === "SD_VERSION") {
  return version;
}

// 변경 후
if (envName === "__VER__") {
  return version;
}
```

**Step 2: sd-config.types.ts 주석 수정**

`packages/cli/src/sd-config.types.ts:24` 수정:

```typescript
// 변경 전
/** 배포 대상 경로 (환경변수 치환 지원: %SD_VERSION%, %SD_PROJECT_PATH%) */

// 변경 후
/** 배포 대상 경로 (환경변수 치환 지원: %__VER__%, %SD_PROJECT_PATH%) */
```

`packages/cli/src/sd-config.types.ts:46` 수정:

```typescript
// 변경 전
/** 스크립트 인자 (환경변수 치환 지원: %SD_VERSION%, %SD_PROJECT_PATH%) */

// 변경 후
/** 스크립트 인자 (환경변수 치환 지원: %__VER__%, %SD_PROJECT_PATH%) */
```

**Step 3: 타입체크 실행**

Run: `pnpm typecheck packages/cli`
Expected: 성공

**Step 4: Commit**

```bash
git add packages/cli/src/commands/publish.ts packages/cli/src/sd-config.types.ts
git commit -m "refactor(cli): rename SD_VERSION to __VER__ in publish command and types"
```

---

## Task 4: 테스트 파일 업데이트

**Files:**

- Modify: `packages/cli/tests/env-define.spec.ts`

**Step 1: env-define.spec.ts 수정**

`packages/cli/tests/env-define.spec.ts` 전체 수정:

```typescript
import { describe, it, expect } from "vitest";

describe("env define", () => {
  describe("server build define", () => {
    it("should create define object from env config", () => {
      const env = { __VER__: "1.0.0", __DEV__: "true" };
      const define: Record<string, string> = {};

      for (const [key, value] of Object.entries(env)) {
        define[`process.env["${key}"]`] = JSON.stringify(value);
      }

      expect(define).toEqual({
        'process.env["__VER__"]': '"1.0.0"',
        'process.env["__DEV__"]': '"true"',
      });
    });
  });

  describe("client build define", () => {
    it("should create define object with process.env as object", () => {
      const env = { __VER__: "1.0.0", __DEV__: "true" };
      const envDefine: Record<string, string> = {};
      envDefine["process.env"] = JSON.stringify(env);

      expect(envDefine).toEqual({
        "process.env": '{"__VER__":"1.0.0","__DEV__":"true"}',
      });
    });
  });
});
```

**Step 2: 테스트 실행**

Run: `pnpm vitest packages/cli/tests/env-define.spec.ts --project=node --run`
Expected: 통과

**Step 3: Commit**

```bash
git add packages/cli/tests/env-define.spec.ts
git commit -m "test(cli): update env-define tests with __VER__ naming"
```

---

## Task 5: 기존 설계 문서 업데이트

**Files:**

- Modify: `docs/plans/2026-02-04-env-unification-design.md`

**Step 1: 설계 문서에 네이밍 컨벤션 섹션 추가**

`docs/plans/2026-02-04-env-unification-design.md` 끝에 추가:

```markdown
## 환경변수 네이밍 컨벤션

### 프로젝트 전용 환경변수

- `__DEV__`: 개발 모드 플래그 ("true" | "false")
- `__VER__`: 앱 버전 정보 (예: "1.0.0")

### 외부 표준 환경변수 (변경 금지)

- `NO_COLOR`: CLI 색상 출력 비활성화 (https://no-color.org/)
- `TIMING`: ESLint 규칙별 실행 시간 출력
- `ANDROID_HOME`, `ANDROID_SDK_ROOT`: Android SDK 경로
- `HOME`, `LOCALAPPDATA`: 시스템 경로

### CONSOLA_LEVEL 제거

- 환경변수 대신 `consola.level` API 직접 사용
- `--debug` CLI 옵션으로 `consola.level = LogLevels.debug` 설정
```

**Step 2: Commit**

```bash
git add docs/plans/2026-02-04-env-unification-design.md
git commit -m "docs: add environment variable naming convention"
```

---

## Task 6: 전체 검증

**Step 1: 린트 실행**

Run: `pnpm lint packages/cli packages/service-server packages/solid-demo-server packages/capacitor-plugin-auto-update`
Expected: 성공

**Step 2: 타입체크 실행**

Run: `pnpm typecheck`
Expected: 성공

**Step 3: 테스트 실행**

Run: `pnpm vitest --project=node --run`
Expected: 모든 테스트 통과

**Step 4: 최종 Commit (필요시)**

```bash
git add .
git commit -m "refactor: complete environment variable naming convention unification"
```

---

## 요약

| Task | 설명                   | 변경 사항                                        |
| ---- | ---------------------- | ------------------------------------------------ |
| 1    | CONSOLA_LEVEL 제거     | `process.env["CONSOLA_LEVEL"]` → `consola.level` |
| 2    | SD_VERSION 변경 (소스) | `SD_VERSION` → `__VER__`                         |
| 3    | SD_VERSION 변경 (CLI)  | publish.ts, sd-config.types.ts                   |
| 4    | 테스트 업데이트        | env-define.spec.ts                               |
| 5    | 문서 업데이트          | 네이밍 컨벤션 섹션 추가                          |
| 6    | 전체 검증              | lint, typecheck, test                            |

## 환경변수 최종 상태

| 변경 전         | 변경 후        | 비고                     |
| --------------- | -------------- | ------------------------ |
| `SD_VERSION`    | `__VER__`      | 프로젝트 전용            |
| `__DEV__`       | `__DEV__`      | 유지                     |
| `CONSOLA_LEVEL` | (제거)         | `consola.level` API 사용 |
| `NO_COLOR`      | `NO_COLOR`     | 외부 표준 유지           |
| `TIMING`        | `TIMING`       | ESLint 표준 유지         |
| `ANDROID_HOME`  | `ANDROID_HOME` | 시스템 표준 유지         |
