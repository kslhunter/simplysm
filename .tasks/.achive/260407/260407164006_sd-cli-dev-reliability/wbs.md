# WBS: sd-cli dev 명령 안정성/일관성 개선

## 프로젝트 개요

- **배경:** sd-cli dev 명령에 대한 코드 리뷰에서 리소스 누수, 타이머 미정리, 네이밍 불일치 등 7건의 이슈가 발견됨
- **환경:** `packages/sd-cli/src/` — DevWatchOrchestrator, 빌드 엔진, 워커 파이프라인
- **전제조건:** 기존 테스트 통과 상태 유지
- **기술적 제약:** 없음
- **참조 자료:**
  - `.tasks/260407163812_review-sd-cli-dev-command/review.md` — 리뷰 이슈 상세

## Impact Mapping

- **Goal:** dev 모드 실행 시 리소스 누수/예기치 않은 동작 0건
  - **Actor:** sd-cli dev 사용 개발자
    - **Impact:** 서버 재시작·종료 시 안정적으로 동작하여 디버깅 시간 절감
      - **Deliverable:** 리뷰 이슈 7건 수정

## Feature Breakdown

### Epic 1. dev 명령 안정성 개선

#### [x] Feature 1.1 sd-cli dev 리뷰 이슈 수정

**의존성:** 없음

**범위:**

- esbuild 컨텍스트 생성 실패 시 disposed 참조 방지 (LOGIC-001)
- shutdown()에서 타이머 정리 추가 (DESIGN-001)
- initialize() 실패 시 replaceDepWatcher 해제 (DESIGN-002)
- RebuildManager workerKey 네이밍 패턴 통일 (CONSIST-001)
- ViteEngine/BaseEngine 이벤트 핸들링 코드 중복 축소 (DESIGN-003)
- ResultCollector.toMap() 반환 타입을 ReadonlyMap으로 변경 (DESIGN-004)
- 독립 클라이언트 감지 시 serverClientsMap 순회 최적화 (PERF-001)

**경계:**

- 기능 추가 없음 — 기존 동작의 안정성/일관성 개선만 수행
- dev 명령 이외의 build/watch/check 명령은 수정 대상 아님

**근거:**

- `.tasks/260407163812_review-sd-cli-dev-command/review.md`의 이슈 7건

## 제외 사항

- 없음
