# Eval: sd-tdd

## 행동 Eval

### 시나리오 1: 기본 Double Loop TDD 흐름
- 입력: "/sd-tdd .tasks/test-project/1.1-계산기-더하기.md"
- 사전 조건:
  - `.tasks/test-project/wbs.md` — Feature Breakdown에 `1.1-계산기-더하기`가 `[ ]`로 표시
  - `.tasks/test-project/1.1-계산기-더하기.md` — 요구명세(Gherkin 2개 Scenario) + 구현계획(1 Slice, 2 Scenarios 매핑) 포함
  - `package.json` — `"test": "node --test"` 스크립트 포함 (설치 불필요)
  - `src/calculator.js` — 빈 Calculator 클래스 (기존 코드)
- 체크리스트:
  - [ ] Feature 문서를 Read 도구로 읽었다
  - [ ] 코드베이스 탐색을 시도했다 (Glob, Grep, 또는 Agent 도구 중 1회 이상 사용)
  - [ ] Slice 목록과 Scenario 매핑을 출력에 포함했다
  - [ ] Acceptance Test 파일을 생성했다 (Write 또는 Edit 도구 사용)
  - [ ] Unit Test 파일을 생성했다 (Write 또는 Edit 도구 사용)
  - [ ] 테스트 파일 작성이 구현 코드 작성보다 먼저 발생했다 (도구 호출 순서 기준)
  - [ ] 구현 코드를 생성/수정했다 (Write 또는 Edit 도구 사용)
  - [ ] 테스트 실행을 시도했다 (Bash 도구로 test 명령 실행)
  - [ ] wbs.md에서 해당 Feature의 체크박스를 `[x]`로 갱신했다 (Edit 도구 사용)

### 시나리오 2: 구현계획 누락 시 이전 단계 안내
- 입력: "/sd-tdd .tasks/test-project/1.2-계산기-빼기.md"
- 사전 조건:
  - `.tasks/test-project/1.2-계산기-빼기.md` — `## 요구명세`(Gherkin)만 있고 `## 구현계획` 없음
- 체크리스트:
  - [ ] Feature 문서를 Read 도구로 읽었다
  - [ ] 구현계획(`## 구현계획`)이 누락되었음을 출력에서 언급했다
  - [ ] `/sd-plan` 실행을 안내하는 메시지를 출력했다
  - [ ] 구현계획 없이 TDD를 진행하지 않았다 (src/ 하위에 새 코드를 Write/Edit하지 않음)

## 안티패턴 Eval

- [ ] Feature 문서를 Read하지 않고 코드를 작성한다
- [ ] 코드베이스 탐색 없이 바로 코드를 작성한다 (Glob/Grep/Agent 도구 호출 이력 없음)
- [ ] Acceptance Test 없이 바로 Unit Test를 작성한다 (도구 호출 순서 기준)
- [ ] 테스트 파일 작성 전에 구현 코드를 먼저 작성한다 (도구 호출 순서 기준)
- [ ] 구현계획이 없는 Feature 문서에 대해 TDD를 진행한다 (코드 작성)
