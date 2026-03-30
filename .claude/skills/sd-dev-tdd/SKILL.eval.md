# Eval: sd-dev-tdd

## 행동 Eval

### 시나리오 1: 기본 Double Loop TDD 흐름
- 입력: "/sd-dev-tdd .tasks/test-project/1.1-calculator.md"
- 사전 조건:
  - `.tasks/test-project/wbs.md` — Feature Breakdown에 `1.1-calculator`가 `[ ]`로 표시
  - `.tasks/test-project/1.1-calculator.md` — 요구명세(Gherkin 4개 Scenario: 덧셈, 뺄셈, 곱셈, 연산 이력) + 구현계획(2 Slices: 사칙연산, 연산 이력) 포함. add/subtract/multiply에 이력 기록 로직이 3회 중복되어 Rule of Three 발동으로 Outer Loop Refactor에서 프로덕션 코드 정리(Extract Method)가 필요한 구조
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
  - [ ] Outer Loop Refactor에서 프로덕션 코드 점검이 수행되고 결과가 출력에 기록되었다
  - [ ] Outer Loop Refactor에서 테스트 코드 점검이 수행되고 결과가 출력에 기록되었다
  - [ ] 최종 테스트 코드에 동작(behavior)이 아닌 구현 세부사항(상태)만 검증하는 테스트가 남아있지 않다
  - [ ] 테스트가 대상 코드를 실제로 import하여 호출/실행하는 방식으로 작성되었다 (소스 파일을 문자열로 읽어 텍스트 매칭하는 방식이 아님)
  - [ ] 테스트 파일명에 Slice/Scenario 번호가 사용되지 않았다 (예: `3.1-xxx.spec.ts` 없음)
  - [ ] Acceptance Test 파일이 `.acc.spec.{ts,js}` (프로젝트 언어에 맞는) 확장자를 사용한다
  - [ ] wbs.md에서 해당 Feature의 체크박스가 `[x]`로 갱신되었다

### 시나리오 2: 구현���획 누락 시 이전 단계 안내
- 입력: "/sd-dev-tdd .tasks/test-project/1.2-calculator-subtract.md"
- 사전 조건:
  - `.tasks/test-project/1.2-calculator-subtract.md` — `## 요구명세`(Gherkin)만 있고 `## 구현계획` 없음
- 체크리스트:
  - [ ] Feature 문서를 읽고 누락된 전제 조건 섹션을 출력에서 명시했다
  - [ ] 구현계획(`## 구현계획`)이 누락되었음을 출력에서 언급했다
  - [ ] `/sd-dev-plan` 실행을 안내하는 메시지를 출력했다
  - [ ] 구현계획 없이 TDD를 진행하지 않았다 (src/ 하위에 새 코드가 생성되지 않음)

### 시나리오 3: TDD 중 구현계획 누락 발견 시 역방향 피드백
- 입력: "/sd-dev-tdd .tasks/test-project/1.3-calculator-reset.md"
- 사전 조건:
  - `.tasks/test-project/wbs.md` — Feature Breakdown에 `1.3-calculator-reset`이 `[ ]`로 표시
  - `.tasks/test-project/1.3-calculator-reset.md` — 요구명세에 `reset()` 호출 Scenario 2개가 있으나, 구현계획에 `reset()` 메서드가 누락됨. 구현계획은 `getHistory()`만 언급
  - `package.json` — `"test": "node --test"` 스크립트 포함
  - `src/calculator.js` — `add()`, `getHistory()`가 이미 구현된 Calculator 클래스
- 체크리스트:
  - [ ] 구현계획에 `reset()` 메서드가 누락되었음을 출력에서 언급했다
  - [ ] Feature 문서의 `## 구현계획` 섹션이 수정되어 `reset()` 관련 내용이 추가되었다
  - [ ] 변경 내용과 사유를 출력에서 사용자에게 알렸다
  - [ ] TDD가 정상 진행되어 `reset()` 기능이 구현되었다
  - [ ] 테스트가 통과했다

### 시나리오 4: 하드웨어 의존 Scenario에서 검증 항목별 분류
- 입력: "/sd-dev-tdd .tasks/test-project/1.4-usb-file-transfer.md"
- 사전 조건:
  - `.tasks/test-project/wbs.md` — Feature Breakdown에 `1.4-usb-file-transfer`가 `[ ]`로 표시
  - `.tasks/test-project/1.4-usb-file-transfer.md` — 요구명세에 "USB 디바이스 연결 시 파일 목록을 표시한다" Scenario 포함. 구현계획에 Slice 1개: USB 파일 전송 (`parseFileList` 순수 함수 + USB 연결 감지 콜백 등록 + 파일 목록 UI 표시). `parseFileList`는 순수 함수로 자동 테스트 가능, USB 연결 감지 콜백 등록은 코드 확인으로 LLM 검증 가능, 실제 USB 연결은 하드웨어 의존
  - `package.json` — `"test": "node --test"` 스크립트 포함
  - `src/usb-transfer.js` — 빈 UsbTransfer 클래스 (기존 코드)
- 체크리스트:
  - [ ] Scenario의 검증 항목을 항목 단위로 분해했다
  - [ ] 자동화 테스트 가능한 항목(`parseFileList` 등)에 대해 `.spec.ts` 파일이 생성되고 TDD가 수행되었다
  - [ ] LLM이 직접 검증할 수 있는 항목에 대해 `.verify.md` 파일이 생성되었다
  - [ ] `.verify.md`의 각 항목에 대해 LLM이 실제 검증을 수행하고 결과가 `[x]` 또는 `[!]`로 기록되었다
  - [ ] 하드웨어 의존 항목만 `.spec.md`에 남아있다
  - [ ] 구현 코드가 작성되었다
  - [ ] 테스트 파일명에 Slice/Scenario 번호가 사용되지 않았다

## 안티패턴 Eval

- [ ] 출력이 Feature 문서의 내용을 반영하지 않은 코드를 포함한다
- [ ] 코드베이스 구조가 반영되지 않은 코드를 작성한다
- [ ] Acceptance Test 없이 바로 Unit Test를 작성한다
- [ ] 테스트 파일 작성 전에 구현 코드를 먼저 작성한다
- [ ] 구현계획이 없는 Feature 문서에 대해 TDD를 진행한다 (코드 작성)
- [ ] Outer Loop Refactor를 건너뛰고 바로 다음 Scenario로 진행한다
- [ ] Outer Loop Refactor에서 프로덕션 코드만 정리하고 테스트 코드를 정리하지 않는다
- [ ] 동작(behavior)이 아닌 구현 세부사항(상태)만 검증하는 테스트가 최종 결과에 남아있다
- [ ] 소스 코드를 readFileSync/fs로 읽어 문자열 포함 여부(toContain/toMatch)만 확인하는 테스트가 존재한다 — 이는 테스트가 아니라 grep이다
- [ ] 로직 테스트가 가능한 코드(순수 함수, 분기 로직, 상태 변경)에 대해 실제 호출·실행 없이 소스 텍스트 매칭으로 검증한다
- [ ] Angular 코드에서 TestBed 설정이 필요한 테스트를 TestBed 없이 텍스트 매칭으로 대체한다
- [ ] TDD 중 요구명세·구현계획에 누락·오류를 발견했음에도, Feature 문서의 해당 섹션을 수정하지 않는다
- [ ] Feature 범위를 변경했음에도 wbs.md를 수정하지 않는다
- [ ] 구현 중 새로운 설계 결정이 발생했음에도 Feature 문서의 `### 설계 결정`에 기록하지 않는다
- [ ] 다른 Feature에 영향을 주는 결정이 발생했음에도 wbs.md의 `### Feature 간 설계 결정`에 기록하지 않는다
- [ ] Scenario 전체를 하나의 검증 유형으로 일괄 분류한다 (항목별 분해 없이)
- [ ] `.verify.md`를 작성했으나 LLM이 실제 검증을 수행하지 않았다 (체크리스트가 `[ ]`로 남아있음)
- [ ] LLM이 코드 읽기·명령 실행으로 검증 가능한 항목을 `.spec.md`에 포함시켰다
- [ ] 테스트 파일명에 Slice/Scenario 번호를 사용했다 (예: `3.1-bootstrap.spec.ts`)
