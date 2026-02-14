# CLI Watch Scope 확장 설계서

## 배경

현재 `@simplysm/cli`의 `pnpm watch`/`pnpm dev` 명령에서 파일 변경 감지 범위가 제한적이다.
esbuild와 Vite는 기본적으로 `node_modules` 안의 파일 변경을 감지하지 않거나 캐싱으로 무시한다.

이 CLI를 사용하는 외부 프로젝트(예: `@myapp/*` 모노레포)에서,
워크스페이스 내부 패키지나 npm으로 설치한 `@simplysm/*` 패키지의 파일이 변경되었을 때
자동으로 리빌드가 트리거되어야 한다.

## 목표

dev/watch 모드에서 다음 범위의 파일 변경을 감지하여 리빌드한다:

1. **패키지 파일**: 현재 빌드 대상 패키지의 src/ 파일 (기존 동작 유지)
2. **내 scope 패키지**: 프로젝트 루트 `package.json`의 name에서 추출한 scope (예: `@myapp/*`)
3. **@simplysm 패키지**: `node_modules/@simplysm/*` 패키지의 dist/ 파일

## scope 결정 방식

- 프로젝트 루트 `package.json`의 `name` 필드에서 scope를 자동 추출한다.
  - 예: `name: "@myapp/root"` → scope: `@myapp`
  - scope가 없는 경우 (예: `name: "simplysm"`) → 자기 scope 없음
- `@simplysm`은 항상 포함 (하드코딩)
- 최종 watchScopes: `["@myapp", "@simplysm"]` (중복 제거)

## 수정 대상 빌더

| 빌더                              | 수정 여부  | 이유                                                                |
| --------------------------------- | ---------- | ------------------------------------------------------------------- |
| Library (esbuild, bundle:false)   | **불필요** | 개별 파일 트랜스파일만, 외부 의존성 resolve 안 함                   |
| DTS (TypeScript watch)            | **불필요** | `ts.createWatchProgram()`이 import chain의 `.d.ts` 변경을 이미 감지 |
| **Server (esbuild, bundle:true)** | **필요**   | esbuild watch가 node_modules 캐싱으로 변경 무시 가능                |
| **Client (Vite)**                 | **필요**   | Vite가 node_modules를 기본 제외                                     |

## 구현 방안

### 1. scope 추출 유틸리티

- `packages/cli/src/utils/package-utils.ts`에 scope 추출 함수 추가
- 루트 `package.json`의 `name`에서 scope 추출
- `@simplysm`을 항상 포함하여 watchScopes 배열 반환

### 2. Server (esbuild, bundle:true)

esbuild 플러그인에서 `onResolve` 콜백으로 scope 패키지를 감지하고,
해당 패키지의 파일들을 `watchFiles`에 추가하여 변경 감지 대상에 포함시킨다.

- `packages/cli/src/utils/esbuild-config.ts`의 `createServerEsbuildOptions()`에 watchScopes 옵션 추가
- 또는 `packages/cli/src/workers/server.worker.ts`에서 플러그인 추가

### 3. Client (Vite)

Vite의 `optimizeDeps.exclude`에 scope 패키지를 추가하여 pre-bundling에서 제외하고,
`server.watch.ignored` 패턴을 조정하여 scope 패키지의 변경을 감지한다.

- `packages/cli/src/utils/vite-config.ts`의 `createViteConfig()`에 watchScopes 옵션 추가

### 4. 데이터 흐름

```
sd.config.ts 로드 시
  → 루트 package.json에서 scope 추출
  → watchScopes 배열 생성 (자기 scope + @simplysm)
  → Worker에 전달 (WatchInfo에 watchScopes 필드 추가)
  → 각 빌더가 watchScopes를 사용하여 감지 범위 확장
```

## 관련 파일

- `packages/cli/src/utils/package-utils.ts`: scope 추출 유틸리티 추가
- `packages/cli/src/utils/esbuild-config.ts`: Server esbuild 옵션에 watch 플러그인
- `packages/cli/src/utils/vite-config.ts`: Vite optimizeDeps/server.watch 설정
- `packages/cli/src/workers/server.worker.ts`: watchScopes 전달
- `packages/cli/src/workers/client.worker.ts`: watchScopes 전달
- `packages/cli/src/commands/dev.ts`: watchScopes 생성 및 전달
- `packages/cli/src/orchestrators/WatchOrchestrator.ts`: (watch 명령은 Library/DTS만이므로 변경 불필요)

## 검증 방법

1. 외부 프로젝트에서 `pnpm dev` 실행
2. `node_modules/@simplysm/*/dist/` 파일을 수동 변경
3. Server/Client가 자동으로 리빌드되는지 확인
4. 워크스페이스 내부 `@myapp/*` 패키지 파일 변경 시 리빌드 확인
