# WBS: sd-cli 리팩토링 리뷰 이슈 수정

## 프로젝트 개요

- **배경:** sd-cli 리팩토링(`.tasks/260411131750_sd-cli-refactor`)의 최종 리뷰(`.tasks/260411144018_review-sd-cli-refactor/review.md`)에서 Medium 3건, Low 5건의 이슈가 발견됨. 코드 구현은 양호하나, 문서와 코멘트가 리팩토링 결과를 반영하지 못하고 있음.
- **환경:** `@simplysm/sd-cli` 패키지. TypeScript ESM, Node.js 20.
- **전제조건:** sd-cli 리팩토링이 완료된 상태.
- **기술적 제약:** 코드 동작 변경 없이 문서/코멘트/dead code만 수정.
- **참조 자료:**
  - `.tasks/260411144018_review-sd-cli-refactor/review.md` -- 리뷰 리포트 (이슈 상세)
  - `.tasks/260411131750_sd-cli-refactor/wbs.md` -- 원본 리팩토링 WBS

## Impact Mapping

- **Goal:** LLM 기반 개발 시 CLAUDE.md와 코멘트가 실제 코드 구조와 일치하여, 잘못된 코드 생성을 방지한다
  - **Actor:** sd-cli 유지보수 개발자 (LLM 보조)
    - **Impact:** 코드 구조에 대한 정확한 참조를 얻어 올바른 위치에 코드를 작성한다
      - **Deliverable:** CLAUDE.md 아키텍처/패턴/테스트 섹션 업데이트
      - **Deliverable:** 삭제된 DevWatchOrchestrator 참조 stale 코멘트 정리
      - **Deliverable:** dead code 파라미터 제거

## Feature Breakdown

### Epic 1. 문서/코멘트 동기화

#### [x] Feature 1.1 리뷰 이슈 일괄 수정

**의존성:** 없음

**범위:**

- CONSIST-001: CLAUDE.md의 Architecture, Key Patterns, Testing 섹션을 리팩토링 결과에 맞게 업데이트 (orchestrators 4파일, engines createTypecheckEngine, utils 4파일, capacitor 2파일 반영)
- CONSIST-002: src 3파일, tests 1파일의 stale DevWatchOrchestrator 코멘트 업데이트
- DESIGN-001: orchestrator-utils.ts의 `packagesForValidation` dead code 파라미터 제거

**경계:**

- Low severity 이슈(CONSIST-003,004, DESIGN-002~005)는 이 Feature에서 수정하지 않음 (당장 오동작하지 않고, 의도된 설계이거나 과거 기록)

**근거:**

- `.tasks/260411144018_review-sd-cli-refactor/review.md` -- CONSIST-001, CONSIST-002, DESIGN-001

## 제외 사항

- CONSIST-003 (BuildOrchestrator vs BaseOrchestrator 초기화 패턴 불일치): 의도된 설계 (BuildOrchestrator는 BaseOrchestrator를 상속하지 않음)
- CONSIST-004 (verify.md 내 stale 참조): 과거 검증 기록이므로 수정 불필요
- DESIGN-002 (engine-watch-events 타입 unknown): 코드베이스 관례에 부합
- DESIGN-003 (EsbuildClientEngine waitForInitialBuild 미사용): 의도된 설계, 주석 보강은 선택적
- DESIGN-004 (createTypecheckEngine config 필드 손실): 실제 영향 없음
- DESIGN-005 (glob 패턴 정규식 불일치): 단순 패턴에서는 동일 동작, 현실적 문제 없음
