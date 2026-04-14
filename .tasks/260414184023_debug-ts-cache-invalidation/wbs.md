# WBS: dev 모드 TypeScript 파일 변경 감지 버그 수정

## 프로젝트 개요

- **배경:** `pnpm dev` 실행 중 `.ts` 파일을 변경해도 브라우저에 반영되지 않는 버그. `sd-build-start` esbuild 플러그인이 `loadResultCache.watchFiles`만 감시하는데, Angular `createCompilerPlugin`이 TypeScript 파일을 `loadResultCache`에 등록하지 않아 발생.
- **환경:** simplysm 모노레포, sd-cli 패키지
- **전제조건:** 없음
- **기술적 제약:** `@angular/build`의 `SourceFileCache` API 사용 (`typeScriptFileCache` public 속성)
- **참조 자료:**
  - `.tasks/260414184023_debug-ts-cache-invalidation/debug.md` — 근본 원인 분석 결과
  - `packages/sd-cli/src/workers/client.worker.ts:253-296` — 수정 대상 코드
  - `node_modules/@angular/build/src/tools/esbuild/angular/compiler-plugin.js:332-399` — Angular TS onLoad (createCachedLoad 미사용 확인)
  - `node_modules/@angular/build/src/tools/esbuild/load-result-cache.js:69-73` — watchFiles가 JS 파일만 포함하는 근거

## Impact Mapping

- **Goal:** dev 모드에서 모든 소스 파일 변경이 브라우저에 자동 반영됨
  - **Actor:** simplysm 기반 앱 개발자
    - **Impact:** `.ts` 파일 수정 후 수동 새로고침 없이 즉시 결과를 확인한다
      - **Deliverable:** `sd-build-start` 플러그인의 mtime 감시 대상에 TypeScript 파일 포함

## Feature Breakdown

### Epic 1. 캐시 무효화 수정

#### [x] Feature 1.1 sd-build-start 플러그인 TypeScript 파일 감시 추가

**의존성:** 없음

**범위:**

- `onStart`에서 `loadResultCache.watchFiles` + `typeScriptFileCache.keys()`를 합쳐 mtime 비교 수행
- `onEnd`에서 `prevMtimes` 갱신 시에도 동일하게 두 소스를 합쳐 기록

**경계:**

- Angular `createCompilerPlugin` 내부 동작은 변경하지 않음 (외부 패키지)
- HMR 메시지 디스패치 로직은 이 Feature에서 다루지 않음

**근거:**

- debug.md: `loadResultCache.watchFiles`에 TS 파일 미포함이 근본 원인
- `SourceFileCache.typeScriptFileCache`는 public 속성으로 접근 가능 (source-file-cache.js:52)
- `typeScriptFileCache` 키는 `path.normalize()` 적용된 OS-native 경로 (compiler-plugin.js:289)

## 제외 사항

- Angular `createCompilerPlugin` 내부 수정 — 외부 패키지이므로 범위 외
