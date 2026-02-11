# 환경변수 통일 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 모든 코드에서 `process.env`를 통일하여 사용하고, Vite에서 polyfill하여 neutral 패키지가 양쪽 환경에서 동작하도록 함

**Architecture:**

- library 빌드: 치환 없음 (그대로 `process.env` 유지)
- server 빌드: `bundle: true`로 변경 + `define`으로 특정 키 상수 치환
- client 빌드 (Vite): `define`으로 `process.env`를 객체로 치환

**Tech Stack:** esbuild, Vite, TypeScript

---

## Task 1: SdConfig 타입에 env 필드 추가

**Files:**

- Modify: `packages/cli/src/sd-config.types.ts:159-164`

**Step 1: SdServerPackageConfig에 env 필드 추가**

`packages/cli/src/sd-config.types.ts:159-164` 수정:

```typescript
/**
 * 서버 패키지 설정 (Fastify 서버)
 */
export interface SdServerPackageConfig {
  /** 빌드 타겟 */
  target: "server";
  /** 빌드 시 치환할 환경변수 (process.env.KEY를 상수로 치환) */
  env?: Record<string, string>;
  /** publish 설정 */
  publish?: SdPublishConfig;
}
```

**Step 2: SdClientPackageConfig에 env 필드 추가**

`packages/cli/src/sd-config.types.ts:141-154` 수정:

```typescript
/**
 * 클라이언트 패키지 설정 (Vite 개발 서버)
 */
export interface SdClientPackageConfig {
  /** 빌드 타겟 */
  target: "client";
  /**
   * 서버 설정
   * - string: 연결할 서버 패키지명 (예: "solid-demo-server")
   * - number: Vite 직접 포트 사용 (하위 호환성)
   */
  server: string | number;
  /** 빌드 시 치환할 환경변수 (process.env를 객체로 치환) */
  env?: Record<string, string>;
  /** publish 설정 */
  publish?: SdPublishConfig;
  /** Capacitor 설정 */
  capacitor?: SdCapacitorConfig;
}
```

**Step 3: 타입체크 실행**

Run: `pnpm typecheck packages/cli`
Expected: 성공 (타입 추가만 했으므로 기존 코드에 영향 없음)

**Step 4: Commit**

```bash
git add packages/cli/src/sd-config.types.ts
git commit -m "feat(cli): add env field to SdServerPackageConfig and SdClientPackageConfig"
```

---

## Task 2: server-build.worker.ts 수정 (bundle: true + define)

**Files:**

- Modify: `packages/cli/src/workers/server-build.worker.ts`

**Step 1: ServerBuildWatchInfo 타입에 env 필드 추가**

`packages/cli/src/workers/server-build.worker.ts:12-16` 수정:

```typescript
/**
 * Server Build Watch 시작 정보
 */
export interface ServerBuildWatchInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  /** 빌드 시 치환할 환경변수 */
  env?: Record<string, string>;
}
```

**Step 2: esbuild 설정에 bundle: true 및 define 추가**

`startWatch` 함수 (`packages/cli/src/workers/server-build.worker.ts:112-147`)에서 esbuild.context 설정 수정.

`const mainJsPath` 선언 후, `esbuildContext = await esbuild.context` 전에 추가:

```typescript
// define 옵션 생성: process.env.KEY를 상수로 치환
const define: Record<string, string> = {};
if (info.env != null) {
  for (const [key, value] of Object.entries(info.env)) {
    define[`process.env["${key}"]`] = JSON.stringify(value);
  }
}
```

esbuild.context 옵션 수정:

```typescript
esbuildContext = await esbuild.context({
  entryPoints,
  outdir: path.join(info.pkgDir, "dist"),
  format: "esm",
  sourcemap: true,
  platform: "node",
  target: "node20",
  bundle: true, // false에서 true로 변경
  packages: "external", // node_modules는 번들에서 제외
  define, // 환경변수 치환
  tsconfigRaw: { compilerOptions: compilerOptions as esbuild.TsconfigRaw["compilerOptions"] },
  plugins: [
    // ... 기존 플러그인 유지
  ],
});
```

**Step 3: 타입체크 실행**

Run: `pnpm typecheck packages/cli`
Expected: 성공

**Step 4: Commit**

```bash
git add packages/cli/src/workers/server-build.worker.ts
git commit -m "feat(cli): enable bundle mode and add env define for server build"
```

---

## Task 3: watch.worker.ts Vite 설정에 define 추가

**Files:**

- Modify: `packages/cli/src/workers/watch.worker.ts`

**Step 1: startViteWatch 함수에서 define 옵션 추가**

`packages/cli/src/workers/watch.worker.ts:190-232` 수정.

`const useStrictPort` 선언 후, `viteServer = await createServer` 전에 추가:

```typescript
// process.env를 객체로 치환
const envDefine: Record<string, string> = {};
if (config.env != null) {
  envDefine["process.env"] = JSON.stringify(config.env);
}
```

createServer 옵션에 `define: envDefine` 추가:

```typescript
viteServer = await createServer({
  root: pkgDir,
  base: `/${name}/`,
  plugins: [tsconfigPaths({ projects: [tsconfigPath] }), solidPlugin()],
  css: {
    postcss: {
      plugins: [tailwindcss({ config: path.join(pkgDir, "tailwind.config.ts") })],
    },
  },
  define: envDefine, // 추가
  esbuild: {
    tsconfigRaw: { compilerOptions: compilerOptions as esbuild.TsconfigRaw["compilerOptions"] },
  },
  server: {
    port: serverPort === 0 ? undefined : serverPort,
    strictPort: useStrictPort,
  },
});
```

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/cli`
Expected: 성공

**Step 3: Commit**

```bash
git add packages/cli/src/workers/watch.worker.ts
git commit -m "feat(cli): add process.env define for Vite client build"
```

---

## Task 4: dev.ts에서 env 전달

**Files:**

- Modify: `packages/cli/src/commands/dev.ts:493-512`

**Step 1: Server Build 워커 시작 시 env 전달**

`packages/cli/src/commands/dev.ts` 라인 493-512에서 `serverBuild.worker.startWatch` 호출 부분 수정:

현재 코드:

```typescript
serverBuild.worker.startWatch({
  name,
  cwd,
  pkgDir,
});
```

수정:

```typescript
const serverConfig = sdConfig.packages[name] as SdServerPackageConfig;
serverBuild.worker.startWatch({
  name,
  cwd,
  pkgDir,
  env: serverConfig.env,
});
```

**Step 2: 타입체크 실행**

Run: `pnpm typecheck packages/cli`
Expected: 성공

**Step 3: Commit**

```bash
git add packages/cli/src/commands/dev.ts
git commit -m "feat(cli): pass env config to server build worker in dev command"
```

---

## Task 5: 단위 테스트 추가

**Files:**

- Create: `packages/cli/tests/env-define.spec.ts`

**Step 1: 테스트 파일 작성**

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
git commit -m "test(cli): add unit tests for env define generation"
```

---

## Task 6: 통합 테스트 (수동)

**Step 1: sd.config.ts에 env 추가 확인**

루트의 `sd.config.ts`에서 solid-demo와 solid-demo-server에 env 추가:

```typescript
"solid-demo": {
  target: "client",
  server: "solid-demo-server",
  env: {
    __VER__: "1.0.0-test",
    __DEV__: "true",
  },
},
"solid-demo-server": {
  target: "server",
  env: {
    __VER__: "1.0.0-test",
    __DEV__: "true",
  },
},
```

**Step 2: CLI 빌드 후 dev 실행 테스트**

Run:

```bash
pnpm build cli
pnpm dev solid-demo solid-demo-server
```

**Step 3: 빌드된 파일에서 치환 확인**

- server: `packages/solid-demo-server/dist/main.js`에서 `process.env["__VER__"]`이 `"1.0.0-test"`로 치환되었는지 확인
- client: 브라우저 개발자 도구에서 `process.env`가 객체로 치환되었는지 확인

**Step 4: 전체 Commit**

```bash
git add .
git commit -m "feat(cli): complete env unification for process.env"
```

---

## 요약

| Task | 설명                                                |
| ---- | --------------------------------------------------- |
| 1    | SdConfig 타입에 env 필드 추가                       |
| 2    | server-build.worker.ts 수정 (bundle: true + define) |
| 3    | watch.worker.ts Vite 설정 수정                      |
| 4    | dev.ts에서 env 전달                                 |
| 5    | 단위 테스트 추가                                    |
| 6    | 통합 테스트 (수동)                                  |
