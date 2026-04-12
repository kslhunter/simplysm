# shared-worker-lifecycle — LLM 검증

## 검증 항목

### Slice 1: setupWorkerLifecycle + library-build.worker.ts

- [x] 초기화 순서 유지: `shared-worker-lifecycle.ts:20-24` — setupWorkerConsola → consola.withTag → registerCleanupHandlers → createOnceGuard 순서가 기존 워커의 초기화 순서와 동일함
- [x] library-build.worker.ts cleanup 콜백 전달: 라인 55 — `setupWorkerLifecycle("library-build", cleanup)`. cleanup 함수(라인 47-53)는 기존과 동일
- [x] library-build.worker.ts import 정리: `consola` import 제거, `worker-utils` → `shared-worker-lifecycle`로 교체
- [x] guardStartWatch 사용 유지: 구조분해에서 획득, startWatch 내에서 호출 유지
- [x] 기존 테스트 mock 업데이트: `library-build-worker.spec.ts` mock 교체 완료

### Slice 2: ngtsc-build, server-build, client

- [x] ngtsc-build.worker.ts: `setupWorkerLifecycle("ngtsc-build", cleanup)` 적용, `consola`/`worker-utils` import 제거, `createOnceGuard("startWatch")` 제거. cleanup 콜백은 fsWatcher + _watchPipeline + lastSourceFilePaths 정리 유지
- [x] server-build.worker.ts: `setupWorkerLifecycle("server-build", cleanup)` 적용, `consola`/`worker-utils` import 제거, `setupWorkerConsola()` 호출 제거, `createOnceGuard("startWatch")` 제거. cleanup 콜백은 esbuildContext + publicWatcher + srcWatcher 3개 리소스 정리 유지
- [x] client.worker.ts: `const { logger } = setupWorkerLifecycle("client", async () => { await stopWatch(); })` — guardStartWatch 구조분해 생략 (D1 결정). `consola`/`worker-utils` import 제거, `setupWorkerConsola()` 호출 제거, 하단 `registerCleanupHandlers` 제거. stopWatch 함수를 cleanup 콜백으로 전달
- [x] server-build-worker.spec.ts: worker-utils mock → shared-worker-lifecycle mock 교체. resetGuard 메커니즘 유지 (guardCalled 변수 기반)
- [x] client-worker.spec.ts + client-worker.acc.spec.ts: consola mock + worker-utils mock → shared-worker-lifecycle mock 교체
- [x] ngtsc-build-worker.spec.ts: worker-utils mock 없었으므로 변경 불필요 (ngtsc-build-core 직접 테스트)
- [x] 전체 워커 테스트 72개 통과 확인
