# 코드 리뷰: worker-oom-fix 구현

## 요약

| 항목 | 내용 |
|------|------|
| 분석 대상 | `.tasks/260410144806_worker-oom-fix` (Feature 1.1) |
| 일시 | 2026-04-10 |
| 변경 파일 수 | 2개 (소스 1, 테스트 1) |
| 발견 이슈 | 0건 |

## 분석 범위

- `packages/sd-cli/src/engines/BaseEngine.ts:103-108` — `_createWorker()` 변경
- `packages/sd-cli/tests/engines/base-engine.spec.ts:65-81` — resourceLimits 테스트 추가
- `packages/core-node/src/worker/worker.ts` — Worker.create 옵션 전파 경로 확인
- `packages/service-server/src/protocol/protocol-wrapper.ts:35-40` — 기존 패턴 비교
- `packages/sd-cli/src/engines/ViteEngine.ts:195-198` — 제외 대상 확인

## 분석 결과

분석 결과 보고할 이슈가 없습니다.

### 검증 항목별 결과

#### 1. 구현 정확성

변경 내용은 `BaseEngine._createWorker()`에서 `Worker.create()` 호출 시 `{ resourceLimits: { maxOldGenerationSizeMb: 4096 } }` 옵션을 전달하는 단일 변경이다.

- **타입 호환성 확인:** `Worker.create()`의 두 번째 파라미터는 `Omit<WorkerRawOptions, "stdout" | "stderr">`이며, `WorkerRawOptions`는 Node.js `worker_threads.WorkerOptions`를 참조한다. `resourceLimits`는 이 타입에 포함된 유효한 프로퍼티다.
- **옵션 전파 확인:** `WorkerInternal` 생성자(`worker.ts:28`)에서 `{ stdout: true, stderr: true, ...opt, env: {...} }` 스프레드로 `resourceLimits`가 `WorkerRaw`(= `worker_threads.Worker`)에 정상 전달된다. dev 환경(`.ts`, line 41-54)과 프로덕션 환경(`.js`, line 59-68) 모두 동일하게 전파됨을 확인했다.
- **영향 범위:** `TscEngine`, `NgtscEngine`, `ServerEsbuildEngine`이 `BaseEngine`을 상속하며 `_createWorker()`를 오버라이드하지 않으므로 세 엔진 모두에 일괄 적용된다.

#### 2. 기존 패턴 일치

`protocol-wrapper.ts:38`에서 동일한 `resourceLimits: { maxOldGenerationSizeMb: 4096 }` 패턴을 사용 중이다. 값(4096)과 구조가 정확히 일치하여 코드베이스 일관성을 유지한다.

#### 3. 테스트 품질

`base-engine.spec.ts:65-81`의 테스트가 `TscEngine.run()`을 통해 `_createWorker()`를 트리거하고, 모킹된 `Worker.create`에 `resourceLimits`가 전달되었는지 `expect.objectContaining()`으로 검증한다. 테스트가 요구명세의 Scenario("워커 생성 시 resourceLimits 전달")를 정확히 커버한다.

#### 4. 범위 준수

WBS에서 명시적으로 제외한 항목:
- **ViteEngine:** `BaseEngine`을 상속하지 않으며, 자체 `_createWorker()`(`ViteEngine.ts:195-198`)에 `resourceLimits`가 없다. WBS 경계("ViteEngine은 BaseEngine을 상속하지 않으므로 이 Feature에서 다루지 않음")를 준수한다.
- **메인 프로세스 `--max-old-space-size`:** WBS 경계("현재 메인 프로세스 OOM은 보고되지 않음")를 준수하여 변경하지 않았다.

#### 5. 4가지 관점 분석

| 관점 | 결과 |
|------|------|
| 로직 버그 (LOGIC) | 해당 없음 — 옵션 추가만으로 기존 로직 변경 없음 |
| 일관성 (CONSIST) | 이슈 없음 — `protocol-wrapper.ts`와 동일 패턴 |
| 성능 (PERF) | 해당 없음 — `maxOldGenerationSizeMb`는 허용 상한이며 실제 할당량과 무관 |
| 설계 (DESIGN) | 이슈 없음 — 단일 책임(워커 생성 시 리소스 제한 설정)을 유지하며 추가 복잡도 없음 |
