# WBS: regex-to-parser 2차 후속 리뷰 잔여 주석 정리 (DOC-002 + LOGIC-004)

## 프로젝트 개요

- **배경:** `.tasks/260417150703_review-final-followup-regex-to-parser/review.md`의 최종 심층 리뷰에서 Critical/Medium 잔여 이슈는 없으나 LOW 2건이 남음. 사용자가 B안(두 건 모두 수정)을 선택함. 두 건 모두 **주석 텍스트 수정만** 포함하며 코드 동작·시그니처·테스트는 변경하지 않는다.
- **환경:** simplysm 모노레포. 영향 패키지: `sd-cli`. TypeScript ESM.
- **전제조건:**
  - 2차 후속 Feature 1.1, 1.2가 모두 `[x]` 완료 상태(`.tasks/260417143009_review-followup-regex-to-parser/wbs.md`).
  - 최신 테스트 통과 확인됨: worker-plugin spec 59건 + ts-no-unused-protected-readonly spec 19건 = 78건 전부 통과.
- **기술적 제약:**
  - 주석만 변경하므로 공개 API·시그니처·동작에 영향 없음.
  - 기존 78건 테스트가 그대로 통과해야 함 (주석 변경으로 인한 회귀는 원칙적으로 없음).
- **참조 자료:**
  - `.tasks/260417150703_review-final-followup-regex-to-parser/review.md` — 최종 심층 리뷰, DOC-002 및 LOGIC-004 원문과 개선 방향 예시
  - `.tasks/260417143009_review-followup-regex-to-parser/1.1-worker-plugin-contract-and-filter.md` — 2차 후속 Feature 1.1 설계 (D2의 원래 의미 확인 근거)
  - `packages/sd-cli/src/esbuild/esbuild-worker-plugin.ts` — 수정 대상 (218행 JSDoc, 228-231행 사전 필터 주석)
  - `packages/sd-cli/src/esbuild/esbuild-angular-compiler-plugin.ts` — 수정 대상 (548행 인라인 주석)

## Impact Mapping

- **Goal:** 프로덕션 코드 주석이 외부 설계 문서의 로컬 결정 번호를 참조하지 않도록 정리하여, 이후 코드를 읽는 개발자가 문서-코드 간 참조 부패로 혼선을 겪지 않게 한다 (측정: 코드 주석 내 `(D숫자)` 형태 참조 건수 0).
  - **Actor:** 이후 이 파일을 읽거나 수정할 개발자
    - **Impact:** 주석을 읽고 바로 의도를 파악한다 — 다른 문서를 찾아가 결정 번호를 역추적할 필요가 없다
      - **Deliverable 1:** `esbuild-worker-plugin.ts:218` JSDoc의 `(D2)` 참조 제거 및 문구 자연화
      - **Deliverable 2:** `esbuild-angular-compiler-plugin.ts:548` 인라인 주석의 `(D2)` 참조 제거
      - **Deliverable 3:** `esbuild-worker-plugin.ts:228-231` 사전 필터 주석에 "주석 삽입 패턴(`new /* c */ Worker`)은 의도된 트레이드오프로 탈락됨" 1줄 추가

## Feature Breakdown

### Epic 1. 리뷰 후속 주석 정리

#### [x] Feature 1.1 DOC-002 + LOGIC-004 주석 수정

**의존성:** 없음

**범위:**

- `packages/sd-cli/src/esbuild/esbuild-worker-plugin.ts:216-218`의 JSDoc 3번째 줄 교체
  - 현행: `Angular 플러그인 등 외부에서 직접 호출할 수 있도록 export한다 (D2).`
  - 변경: `Angular 컴파일러 플러그인 등 외부에서 직접 호출한다.`
- `packages/sd-cli/src/esbuild/esbuild-angular-compiler-plugin.ts:548`의 인라인 주석 교체
  - 현행: `// Worker 패턴 처리 (D2)`
  - 변경: `// Worker 패턴 처리`
- `packages/sd-cli/src/esbuild/esbuild-worker-plugin.ts:228-231`의 사전 필터 주석에 트레이드오프 1줄 추가
  - 기존 주석 뒤에 삽입: `// new 과 Worker/SharedWorker 사이에 주석이 낀 호출(예: new /* c */ Worker)은 의도된 트레이드오프로 탈락한다. 실발생 가능성이 희박하고 정확성 보증은 findWorkerPatterns(AST)가 담당한다.`
- 기존 78건 테스트 전부 통과 확인 (회귀 없음)

**경계:**

- `transformWorkerPatterns`/`findWorkerPatterns`의 시그니처·동작·정규식 본문을 변경하지 않는다
- LOGIC-004의 대안 (b) 정규식을 주석 허용 형태로 확장 — 비채택(복잡화 비용 초과)
- LOGIC-004의 대안 (c) 사전 필터 제거 — 비채택(원래 설계 의도 위반)
- 신규 테스트를 추가하지 않는다 — 주석만 변경되므로 테스트로 실증할 동작 차이가 없다
- 다른 파일의 주석은 손대지 않는다 (수정 범위는 상기 3곳으로 한정)

**근거:**

- review.md DOC-002 [Low]: `(D2)` 참조가 1차 후속 Feature 1.1의 로컬 결정을 가리키는데, 2차 후속 Feature 1.1의 D2는 "사전 필터 강화"로 의미가 완전히 달라 이미 부패 상태. 새 독자는 현재 문서에서 D2를 찾으면 설명과 맞지 않아 혼선을 겪는다
- review.md LOGIC-004 [Low]: 2차 후속에서 도입한 정규식 `/\b(new\s+Worker|...)\b/`가 `new /* c */ Worker` 같은 주석 삽입 호출을 탈락시킨다. 실발생 희박하지만 "1차 수정 이전 대비 사전 필터에서 놓치는 케이스가 새로 생긴" 사실은 코드 주석에 남겨둘 가치가 있다
- 사용자 결정: 2024-04-17 대화에서 B안(DOC-002 + LOGIC-004 모두) 선택
- 실증: `grep "(D2)" packages/sd-cli/src/esbuild`로 2건 매치 확인됨 (`esbuild-worker-plugin.ts:218`, `esbuild-angular-compiler-plugin.ts:548`)

## 의존성 매트릭스

| Feature | 의존 대상 | 필요 산출물 |
|---------|----------|-----------|
| 1.1     | 없음      | -         |

**검증 결과:**

- 누락 검증: Feature 1.1 내 세 주석 수정은 모두 파일 내 로컬 변경이며 다른 Feature 산출물에 의존하지 않음
- 순환 검증: Feature가 1개뿐이므로 순환 없음
- 1단계 존재 확인: Feature 1.1이 의존성 없음 → 1단계에 배치

## 제외 사항

- **LOGIC-004 대안 (b) — 정규식을 주석 허용 형태로 확장**: 사유 — 복잡화 비용이 실이득(주석 삽입 호출 탐지)을 초과. 사용자 결정 B안은 "주석 1줄 추가"만 포함
- **LOGIC-004 대안 (c) — 사전 필터 제거**: 사유 — 1차 수정의 원래 설계 의도(사전 필터로 transformSync 오버헤드 차단)와 모순
- **다른 파일의 `(D숫자)` 참조 전수 점검/정리**: 사유 — 현재 review.md에서 발견된 것은 2곳뿐이며, 범위 확장은 사용자가 요청하지 않음. 필요 시 별도 WBS로 분리
- **신규 테스트 추가**: 사유 — 주석만 변경하므로 테스트로 실증할 동작 차이가 없다. 기존 78건 회귀 확인으로 충분
- **1차/2차 Feature 설계 문서의 결정 번호 재부여·정리**: 사유 — 완료된 과거 문서는 아카이브 성격. Goal은 "프로덕션 코드의 부패 제거"이며 설계 문서 자체 정리는 범위 외

## 수행 순서

### 1단계

- Feature 1.1: DOC-002 + LOGIC-004 주석 수정 (의존성 없음)
