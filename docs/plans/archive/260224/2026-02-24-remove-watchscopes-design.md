# watchScopes 제거 및 dependency 기반 watch path 전환

## 날짜: 2026-02-24

## 문제

`watchScopes`는 근본적으로 잘못된 추상화:

1. **scope prefix로 의존성을 대체**: 루트 패키지명에서 `@simplysm-opus` 추출 → `node_modules/@simplysm-opus/*` 전체 watch. 실제 의존성과 무관
2. **workspace와 replaceDeps를 구분 안 함**: `["@simplysm-opus", "@simplysm"]` 같은 flat list로 성격이 다른 두 개념을 동일 처리
3. **모든 사용처에서 과도한 감시**: scope 하위 전체 패키지를 대상으로 하여 불필요한 리소스 소비
4. **중복 watch**: workspace 패키지는 `packages/*/src/`로 이미 감시 중인데 `node_modules/*/dist/`도 감시

### 영향받는 사용처

| 위치 | 문제 |
|------|------|
| `server.worker.ts` | workspace dist watch 중복 + scope 전체 감시 |
| `sdScopeWatchPlugin` (Vite) | workspace dist watch 불필요 + scope 전체 exclude/watch |
| `sdTailwindConfigDepsPlugin` (Vite) | scope 전체 탐색 |
| `DevOrchestrator` | 잘못된 개념을 생성/전파 |

### 핵심 구분

| | Workspace 패키지 | ReplaceDeps 패키지 |
|---|---|---|
| 예시 | `@simplysm-opus/b` | `@simplysm/solid` |
| 위치 | `packages/b/src/` | `node_modules/@simplysm/solid/dist/` |
| resolve 방식 | tsconfig path alias → source | node_modules → dist |
| watch 대상 | `packages/*/src/**/*` | `node_modules/*/dist/**/*.js` |

## 설계

### 1. 통합 유틸 함수 (`package-utils.ts`)

```typescript
interface DepsResult {
  workspaceDeps: string[];   // 디렉토리명 ["b", "core"]
  replaceDeps: string[];     // 전체 패키지명 ["@simplysm/solid", "@simplysm/core-common"]
}

function collectDeps(
  pkgDir: string,
  cwd: string,
  replaceDepsConfig?: Record<string, string>,
): DepsResult
```

**재귀 탐색 로직:**
1. `pkgDir/package.json`의 `dependencies` 읽기
2. 각 의존성에 대해:
   - workspace 패키지 → `workspaceDeps`에 추가, `cwd/packages/<name>/package.json`으로 재귀
   - replaceDeps 패턴 매칭 → `replaceDeps`에 추가, `cwd/node_modules/<pkg>/package.json`으로 재귀
   - 둘 다 아님 → skip
3. visited `Set`으로 중복/순환 방지

**판별 기준:**
- workspace: 루트 `package.json`의 scope + `cwd/packages/<name>` 존재 여부
- replaceDeps: `@scope/*` glob → `startsWith`, 정확한 `@scope/name` → exact match

### 2. server.worker.ts 변경

`startWatch`의 watch path 조립 전면 교체:

```typescript
const { workspaceDeps, replaceDeps } = collectDeps(
  info.pkgDir, info.cwd, info.replaceDeps
);

const watchPaths: string[] = [];

// 서버 패키지 자신 + workspace 의존 패키지 소스
const watchDirs = [
  info.pkgDir,
  ...workspaceDeps.map(d => path.join(info.cwd, "packages", d))
];
for (const dir of watchDirs) {
  watchPaths.push(path.join(dir, "src", "**", "*"));
  watchPaths.push(path.join(dir, "*.{ts,js,css}"));
}

// replaceDeps 의존 패키지 dist
for (const pkg of replaceDeps) {
  watchPaths.push(path.join(info.cwd, "node_modules", pkg, "dist", "**", "*.js"));
  watchPaths.push(path.join(info.pkgDir, "node_modules", pkg, "dist", "**", "*.js"));
}
```

**인터페이스 변경:**
- `ServerWatchInfo`에서 `watchScopes` 제거
- `replaceDeps?: Record<string, string>` 추가

### 3. Vite 플러그인 변경

**`sdScopeWatchPlugin`:**
- `scopes: string[]` → `replaceDeps: string[]` (resolve된 패키지명 배열)
- workspace 패키지 처리 전부 제거
- optimizeDeps exclude: replaceDeps 패키지만
- dist watch: replaceDeps 패키지만

**`sdTailwindConfigDepsPlugin`:**
- `scopes: string[]` → 실제 의존 패키지 목록으로 교체

**`ViteConfigOptions`:**
- `watchScopes?: string[]` 제거
- `replaceDeps?: string[]` 추가

### 4. client.worker.ts 변경

- `collectDeps` 호출하여 `replaceDeps` 결과를 Vite config에 전달
- `watchScopes` 전달 제거

### 5. DevOrchestrator 변경

- `_watchScopes` 멤버 변수 제거
- `getWatchScopes` 호출 제거
- server/client worker에 `watchScopes` 대신 `sd.config.ts`의 `replaceDeps` 설정 전달

### 6. 제거 대상

| 대상 | 파일 |
|------|------|
| `getWatchScopes` 함수 | `package-utils.ts` |
| `getWatchScopes` 테스트 | `package-utils.spec.ts` |
| `ServerWatchInfo.watchScopes` | `server.worker.ts` |
| client 쪽 `watchScopes` 필드 | `client.worker.ts` |
| `ViteConfigOptions.watchScopes` | `vite-config.ts` |
| `_watchScopes` 계산/전파 | `DevOrchestrator.ts` |
