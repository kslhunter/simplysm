# 디버그: createBrowserWorker 래퍼가 esbuild Worker 플러그인 패턴 인식을 우회하여 Worker 초기화 실패

## 출처

- **origin:** `direct` — 사용자 직접 입력
- **완료 시 참고:** 없음

## 문제 증상

- **유형:** 에러
- **증상:** `Error: Worker 초기화 실패` at `worker.onerror (client-protocol-wrapper.ts:78:25)`
- **위치:** `packages/service-client/src/protocol/client-protocol-wrapper.ts:49-52`
- **재현 절차:** Angular 소비앱에서 ORM 쿼리 실행 → 30KB 초과 응답 시 Worker 경로 진입 → Worker 파일이 번들에 포함되지 않아 404 → `worker.onerror` 발동

## 근본 원인

`client-protocol-wrapper.ts:49`에서 `createBrowserWorker(new URL("../workers/client-protocol.worker.js", import.meta.url))` 형태로 Worker를 생성하고 있으나, sd-cli의 esbuild Worker 플러그인(`esbuild-worker-plugin.ts:61-106`)은 `new Worker(new URL(...))` / `new SharedWorker(new URL(...))` 패턴만 AST에서 탐지한다. `createBrowserWorker()`는 `CallExpression`이므로 `NewExpression` 매칭에 걸리지 않아 Worker 파일이 별도 번들로 분리되지 않고, 브라우저에서 Worker 스크립트 로드가 404로 실패한다.

이전 디버그(`260416232412`)에서 이미 올바르게 `new Worker()`로 수정했으나, 후속 sd-review 과정에서 `createBrowserWorker` 래퍼로 되돌려져 재발한 것이다.

## 해결 방안

- **방안:** createBrowserWorker 래퍼 제거 → 직접 `new Worker()` 사용 + 재발 방지 문서화
- **설명:**
  1. `client-protocol-wrapper.ts:49-52`에서 `createBrowserWorker()` → `new Worker()` 직접 사용
  2. 해당 코드에 esbuild Worker 플러그인 인식을 위해 `new Worker()` 직접 사용이 필수라는 주석 추가
  3. `.claude/references/sd-simplysm14/service-client/` 참조 문서에 이 제약을 문서화하여 리뷰 시 재발 방지
- **선택 사유:** 사용자 선택. 이전에도 올바르게 수정했으나 리뷰에서 래퍼로 되돌려져 재발했으므로, 주석과 참조 문서로 재발 방지 필요
