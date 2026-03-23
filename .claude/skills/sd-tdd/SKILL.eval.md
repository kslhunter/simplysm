# Eval: sd-tdd

## 행동 Eval

### 시나리오 1: 기본 Double Loop TDD 흐름
- 입력: "/sd-tdd .tasks/test-project/1.1-calculator-add.md"
- 사전 조건:
  - `.tasks/test-project/wbs.md` — Feature Breakdown에 `1.1-calculator-add`가 `[ ]`로 표시
  - `.tasks/test-project/1.1-calculator-add.md` — 요구명세(Gherkin 3개 Scenario: 덧셈, 뺄셈, 연산 이력) + 구현계획(2 Slices: 덧셈+뺄셈, 연산 이력) 포함. add와 subtract에 이력 기록 로직이 중복되어 Outer Loop Refactor에서 프로덕션 코드 정리가 필요한 구조
  - `package.json` — `"test": "node --test"` 스크립트 포함 (설치 불필요)
  - `src/calculator.js` — 빈 Calculator 클래스 (기존 코드)
- 체크리스트:
  - [ ] 출력이 Feature 문서의 내용에 기반한 분석을 포함한다
  - [ ] 코드베이스 탐색 결과가 출력에 반영되어 있다
  - [ ] Slice 목록과 Scenario 매핑을 출력에 포함했다
  - [ ] Acceptance Test 파일이 생성되었다
  - [ ] Unit Test 파일이 생성되었다
  - [ ] 출력의 TDD 루프 추적에서 테스트 작성이 구현 코드 작성보다 먼저 기술되어 있다
  - [ ] 구현 코드가 생성/수정되었다
  - [ ] 테스트가 실행되었다
  - [ ] Acceptance Test 통과 후 Outer Loop Refactor가 수행되었다
  - [ ] Outer Loop Refactor에서 프로덕션 코드 정리(중복 통합, 네이밍 개선 등)가 수행되었다
  - [ ] Outer Loop Refactor에서 테스트 코드 정리(scaffolding test 제거, 중복 Unit Test 삭제, 공통 setup 추출 등)가 수행되었다
  - [ ] 최종 테스트 코드에 동작(behavior)이 아닌 구현 세부사항(상태)만 검증하는 테스트가 남아있지 않다
  - [ ] wbs.md에서 해당 Feature의 체크박스가 `[x]`로 갱신되었다

### 시나리오 2: 구현계획 누락 시 이전 단계 안내
- 입력: "/sd-tdd .tasks/test-project/1.2-calculator-subtract.md"
- 사전 조건:
  - `.tasks/test-project/1.2-calculator-subtract.md` — `## 요구명세`(Gherkin)만 있고 `## 구현계획` 없음
- 체크리스트:
  - [ ] Feature 문서를 읽고 누락된 전제 조건 섹션을 출력에서 명시했다
  - [ ] 구현계획(`## 구현계획`)이 누락되었음을 출력에서 언급했다
  - [ ] `/sd-plan` 실행을 안내하는 메시지를 출력했다
  - [ ] 구현계획 없이 TDD를 진행하지 않았다 (src/ 하위에 새 코드가 생성되지 않음)

## 안티패턴 Eval

- [ ] 출력이 Feature 문서의 내용을 반영하지 않은 코드를 포함한다
- [ ] 코드베이스 구조가 반영되지 않은 코드를 작성한다
- [ ] Acceptance Test 없이 바로 Unit Test를 작성한다
- [ ] 테스트 파일 작성 전에 구현 코드를 먼저 작성한다
- [ ] 구현계획이 없는 Feature 문서에 대해 TDD를 진행한다 (코드 작성)
- [ ] Outer Loop Refactor를 건너뛰고 바로 다음 Scenario로 진행한다
- [ ] Outer Loop Refactor에서 프로덕션 코드만 정리하고 테스트 코드를 정리하지 않는다
- [ ] 동작(behavior)이 아닌 구현 세부사항(상태)만 검증하는 테스트가 최종 결과에 남아있다
