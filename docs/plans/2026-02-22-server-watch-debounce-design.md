# Server Watch Debounce Design

## Problem

`sd-cli dev` 실행 시 server.worker.ts는 `esbuildContext.watch()`(esbuild 네이티브 감시)를 사용한다.
esbuild watch에는 debounce 옵션이 없어서, 여러 의존 패키지(library)가 순차적으로 rebuild 완료될 때마다
server rebuild가 즉시 트리거된다.

예: core-common, orm-common, service-common 동시 수정 시 server가 3회 rebuild/restart됨.

## Solution

library.worker.ts와 동일한 패턴으로 전환: `FsWatcher` + `esbuildContext.rebuild()` 수동 호출.
300ms debounce로 변경사항을 모아서 한 번만 rebuild한다.

## Changes

### 1. `server.worker.ts` — ServerWatchInfo 타입

```ts
export interface ServerWatchInfo {
  // ...existing fields
  watchScopes?: string[];  // 추가
}
```

### 2. `server.worker.ts` — startWatch 함수

- `esbuildContext.watch()` 제거
- `FsWatcher` 추가:
  - 서버 자체 소스: `src/**/*.{ts,tsx}`
  - scope 패키지 dist: `node_modules/{scope}/*/dist` (vite-config.ts의 scopeWatcher와 동일 방식)
- `onChange({ delay: 300 })` 핸들러에서 `esbuildContext.rebuild()` 호출
- add/unlink 이벤트 시 context 재생성 (entry point 변경 가능성)
- cleanup에 FsWatcher close 추가

### 3. `DevOrchestrator.ts` — startWatch 호출

```ts
serverBuild.worker.startWatch({
  name,
  cwd: this._cwd,
  pkgDir,
  watchScopes: this._watchScopes,  // 추가
  env: { ...this._baseEnv, ...config.env },
  configs: config.configs,
  externals: config.externals,
})
```

## Files

| File | Change |
|------|--------|
| `packages/sd-cli/src/workers/server.worker.ts` | FsWatcher 방식으로 전환 |
| `packages/sd-cli/src/orchestrators/DevOrchestrator.ts` | watchScopes 전달 |
