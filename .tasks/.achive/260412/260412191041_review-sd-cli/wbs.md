# WBS: sd-cli 코드 리뷰 이슈 수정

## 프로젝트 개요

- **배경:** sd-cli 패키지에 대한 코드 리뷰(review.md)에서 8개 이슈(Medium 3, Low 5)가 발견됨. 에러 처리 누락, 일관성 문제, dead code 등을 수정하여 코드 품질을 개선한다.
- **환경:** simplysm 모노레포 내 `packages/sd-cli` 패키지. TypeScript ESM 프로젝트.
- **전제조건:** 없음
- **기술적 제약:** 기존 동작을 변경하지 않는 방어적 수정만 수행
- **참조 자료:**
  - `.tasks/260412191041_review-sd-cli/review.md` — 코드 리뷰 상세 이슈 목록 및 수정 제안

## Impact Mapping

- **Goal:** sd-cli의 에러 가시성 개선 및 유지보수 부담 감소
  - **Actor:** sd-cli 개발자/유지보수자
    - **Impact:** watch 모드 실패 시 원인을 빠르게 파악한다
      - **Deliverable:** startWatch 에러 보고 개선 (DESIGN-001, DESIGN-002)
    - **Impact:** HMR 변경 감지 누락 없이 개발한다
      - **Deliverable:** HMR 변경 감지 정확도 개선 (DESIGN-003)
    - **Impact:** 코드를 읽을 때 의도를 빠르게 파악한다
      - **Deliverable:** 일관성/dead code 정리 (CONSIST-001, CONSIST-002, DESIGN-004, DESIGN-005, LOGIC-001)

## Feature Breakdown

### Epic 1. sd-cli 코드 리뷰 이슈 수정

#### [x] Feature 1.1 코드 리뷰 이슈 일괄 수정

**의존성:** 없음

**범위:**

- DESIGN-001: BaseEngine.startWatch()의 `_callStartWatch().catch()` 블록에 에러 로깅 및 ResultCollector 보고 추가 (`packages/sd-cli/src/engines/BaseEngine.ts:185-187`)
- DESIGN-002: EsbuildClientEngine.startWatch() 초기 빌드 실패 시 에러 로깅 패턴을 DESIGN-001과 동일하게 정비 (`packages/sd-cli/src/engines/EsbuildClientEngine.ts:135-138`)
- DESIGN-003: hmr-service.ts의 변경 감지를 파일 크기(bytes) 비교에서 내용 기반 비교(hash)로 전환 (`packages/sd-cli/src/dev-server/hmr-service.ts:52-61, 94-96`)
- CONSIST-001: TypecheckOrchestrator에서 매직 넘버(0, 1) 대신 ts.DiagnosticCategory enum 사용 (`packages/sd-cli/src/orchestrators/TypecheckOrchestrator.ts:265-266`)
- CONSIST-002: WatchOrchestrator.shutdown()의 배열 정리 패턴 통일 (`packages/sd-cli/src/orchestrators/WatchOrchestrator.ts:180-182`)
- DESIGN-004: engine-factory.ts의 `resolvedReplaceDeps` dead parameter 제거 (`packages/sd-cli/src/engines/engine-factory.ts:27`)
- DESIGN-005: storage-publisher.ts의 SSH 연결 error 이벤트에 conn.end() 추가 (`packages/sd-cli/src/commands/publish/storage-publisher.ts:141`)
- LOGIC-001: electron.ts의 esbuild context dispose를 await로 변경 (`packages/sd-cli/src/electron/electron.ts:169`)

**경계:**

- 기존 동작(성공 경로)은 변경하지 않음
- 새로운 기능 추가 없음, 기존 이슈에 대한 방어적 수정만 수행

**근거:**

- `.tasks/260412191041_review-sd-cli/review.md` 코드 리뷰 결과

## 제외 사항

- 없음
