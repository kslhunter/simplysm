# 디버그: watch 모드 sd-cli 빌드 워커 OOM 크래시

## 출처

- **origin:** `direct` — 사용자 직접 입력
- **완료 시 참고:** 해당 없음

## 문제 증상

- **유형:** 에러
- **증상:** `Worker terminated due to reaching memory limit: JS heap out of memory`
- **위치:** `packages/sd-cli/src/workers/library-build.worker.ts` — sd-cli (node) 빌드 워커
- **재현 절차:**
  1. `pnpm watch` 실행
  2. sd-cli 또는 의존 패키지 소스 파일 수정 (리빌드 3회 발생)
  3. 3번째 리빌드에서 워커 OOM 크래시

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|            | E1: dev 모드 메모리 미설정 | E2: Worker resourceLimits 없음 | E3: execArgv 미전달 | E4: sd-cli 의존성 무거움 | E5: BuilderProgram 유지 | E6: 매번 새 Program 생성 | E7: 3회째 OOM |
|---|---|---|---|---|---|---|---|
| H1: 워커 V8 힙 제한 부족 | C(code) | C(code) | C(code) | C(code) | C(code) | C(code) | C(code) |
| H2: BuilderProgram 체인 메모리 누수 | N | N | N | C(code) | C(code) | C(code) | C(infer) |

### 결과: 확정 — H1

개발 모드에서 워커 스레드에 메모리 제한이 설정되지 않아 V8 기본 힙 제한(~2-4GB)을 사용하고 있으며, sd-cli의 TypeScript 컴파일은 28개 타입 헤비 의존성(Angular, Vite, TypeScript, esbuild 등)으로 인해 이 제한을 초과한다.

상세 흐름:
1. `pnpm watch` → `tsx packages/sd-cli/src/sd-cli.ts watch` (dev 모드, `--max-old-space-size` 없음)
2. `BaseEngine._createWorker()`에서 `Worker.create()` 호출 시 `resourceLimits` 미설정
3. 워커 V8 인스턴스가 기본 힙 제한(~2-4GB) 사용
4. sd-cli 빌드: 71개 소스 + Angular/Vite/TypeScript/esbuild 타입 선언 로드 → 1회 ~1-2GB
5. `lastBuilderProgram`에 이전 프로그램 SourceFile AST 유지 → 기준 메모리 증가
6. 3번째 리빌드 시 기준 메모리 + 새 컴파일 → V8 힙 한도 초과

## 해결 방안

### 방안 A: BaseEngine에서 워커 resourceLimits 설정

- **설명:** `BaseEngine._createWorker()`에서 `resourceLimits: { maxOldGenerationSizeMb: 4096 }` 전달
- **장점:** 워커 전용 명시적 메모리 설정, 단일 파일 수정
- **반론:** 모든 빌드 워커에 일괄 적용 (가벼운 패키지에도). 단, 허용 상한이므로 실제 사용량과 무관
- **점수:** 근본해결 9/10, 변경리스크 9/10, 일관성 9/10 → **평균 9.0/10**

## 선택 결과

**방안 A** (평균 9.0/10)

`BaseEngine._createWorker()`에서 Worker 생성 시 `resourceLimits: { maxOldGenerationSizeMb: 4096 }` 추가.
