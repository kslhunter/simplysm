# 디버그: pnpm dev에서 TypeScript 파일 변경 시 브라우저 미반영

## 출처

- **origin:** `direct` — 사용자 직접 입력

## 문제 증상

- **유형:** 동작 이상
- **증상:** 기대: `pnpm dev` 중 `.ts` 파일 변경 시 브라우저 자동 반영 / 실제: 변경해도 화면에 전혀 적용 안 됨
- **위치:** `packages/sd-cli/src/workers/client.worker.ts:257-278` (sd-build-start 플러그인의 변경 감지 로직)
- **재현 절차:** `pnpm dev` 실행 → 소비 프로젝트의 `routes.ts` 등 TypeScript 파일 수정 → 브라우저에 변경 미반영

## 근본 원인

Angular `@angular/build`의 `createCompilerPlugin`에서 TypeScript 파일(.ts)과 JavaScript 파일(.js)의 load 처리가 다르다:

- **TS 파일** (compiler-plugin.js:332): `typeScriptFileCache`를 직접 참조. `createCachedLoad` 미사용 → `loadResultCache`에 등록 안 됨
- **JS 파일** (compiler-plugin.js:400): `createCachedLoad(loadResultCache, ...)` 사용 → `loadResultCache`에 등록됨

sd-cli의 `sd-build-start` 플러그인(client.worker.ts:260)은 `loadResultCache.watchFiles`만 순회하며 파일 변경을 감지한다. `loadResultCache.watchFiles`는 `#fileDependencies.keys()`(load-result-cache.js:69)로, JS 파일만 포함한다.

따라서 TypeScript 파일 변경 시:
1. `changedFiles`가 비어있음
2. `sourceFileCache.invalidate()` 미호출
3. `sourceFileCache.modifiedFiles.size === 0`
4. Angular 컴파일러의 `compilation.update()` 스킵 (compiler-plugin.js:134)
5. `typeScriptFileCache` 갱신 안 됨 → esbuild `onLoad`에서 이전 JS 반환 → 번들 변경 없음

## 해결 방안

- **방안:** `typeScriptFileCache.keys()` 추가 감시
- **설명:** `sd-build-start` 플러그인의 `onStart`/`onEnd`에서 `loadResultCache.watchFiles`에 더해 `sourceFileCache.typeScriptFileCache.keys()`도 mtime 감시 대상에 포함. TypeScript 파일 변경 시 `sourceFileCache.invalidate()`에 포함되어 Angular 컴파일러가 증분 재컴파일을 수행하게 됨.
- **선택 사유:** 최소 변경으로 근본 원인을 정확히 해결. Angular 컴파일러의 `BuilderProgram`이 의존 파일 재컴파일을 자동 처리하므로, sd-cli에서는 직접 변경된 파일만 감지하면 충분.
