# Eval: sd-dev

## 행동 Eval

### 시나리오 1: Feature 문서 없음 → Phase 1 (sd-spec) 시작
- 입력: "/sd-dev .tasks/test-project/1.1-task-create-edit.md"
- 사전 조건:
  - `.tasks/test-project/wbs.md` 존재 — Feature Breakdown에 `- [ ] 1.1 업무 생성/편집` 포함
  - `.tasks/test-project/1.1-task-create-edit.md` 파일은 존재하지 않음
- 체크리스트:
  - [ ] 출력이 Feature 문서의 존재 여부 확인 결과를 포함한다
  - [ ] 상태 탐지 결과를 출력에 포함했다 ("Feature 문서 없음" 또는 "Phase 1" 언급)
  - [ ] 출력이 sd-spec 프로세스에 기반한 진행을 포함한다
  - [ ] sd-spec 프로세스를 시작했다 (Metacognitive Preamble 또는 Example Mapping 시도)

### 시나리오 2: 요구명세만 있는 Feature 문서 → Phase 2 (sd-plan) 시작
- 입력: "/sd-dev .tasks/test-project/1.1-task-create-edit.md"
- 사전 조건:
  - `.tasks/test-project/1.1-task-create-edit.md` — `## 요구명세` 섹션(Gherkin Scenarios) 포함, `## 구현계획` 없음
- 체크리스트:
  - [ ] 출력이 Feature 문서의 내용에 기반한 분석을 포함한다
  - [ ] 상태 탐지 결과를 출력에 포함했다 ("요구명세만 있음" 또는 "Phase 2" 언급)
  - [ ] 출력이 sd-plan 프로세스에 기반한 진행을 포함한다
  - [ ] sd-plan 프로세스를 시작했다 (코드베이스 탐색 또는 Metacognitive Preamble 시도)

### 시나리오 3: 요구명세 + 구현계획 있는 Feature 문서 → Phase 3 (sd-tdd) 시작
- 입력: "/sd-dev .tasks/test-project/1.1-task-create-edit.md"
- 사전 조건:
  - `.tasks/test-project/1.1-task-create-edit.md` — `## 요구명세`(Gherkin)와 `## 구현계획`(Tech Design Doc + Vertical Slices) 모두 포함
- 체크리스트:
  - [ ] 출력이 Feature 문서의 내용에 기반한 분석을 포함한다
  - [ ] 상태 탐지 결과를 출력에 포함했다 ("요구명세 + 구현계획 있음" 또는 "Phase 3" 언급)
  - [ ] 출력이 sd-tdd 프로세스에 기반한 진행을 포함한다
  - [ ] sd-tdd 프로세스를 시작했다 (Slice 목록 표시 또는 코드베이스 탐색 시도)

### 시나리오 4: 대화 맥락에 Feature 논의가 있는 상태에서 인자 없이 실행
- 입력: "로그인 기능을 구현해야 해. 이메일/비밀번호 기반 로그인이고 소셜 로그인(Google, Kakao)도 필요해. 비밀번호 찾기도 있어야 하고.\n\n/sd-dev"
- 사전 조건:
  - `.tasks/` 디렉토리만 존재 (wbs.md 없음, Feature 문서 없음)
- 체크리스트:
  - [ ] 대화 맥락에서 Feature 정보(로그인 관련 키워드: 이메일, 비밀번호, 소셜 로그인 중 2개 이상)를 추출했다
  - [ ] Feature가 무엇인지 다시 물어보지 않았다 ("어떤 기능을 만드시겠습니까?" 류의 질문 텍스트가 없다)
  - [ ] 상태 탐지 결과를 출력에 포함했다 ("Feature 문서 없음" 또는 "Phase 1" 언급)
  - [ ] 출력이 sd-spec 프로세스에 기반한 진행을 포함한다
  - [ ] sd-spec 프로세스를 시작했다 (Metacognitive Preamble 또는 Example Mapping 시도)

### 시나리오 5: 구현계획 체크박스로 세부 상태 복원
- 입력: "/sd-dev .tasks/test-project/1.1-task-create-edit.md"
- 사전 조건:
  - `.tasks/test-project/1.1-task-create-edit.md` — `## 요구명세` + `## 구현계획` (Slice 3개, Slice 1~2는 `[x]`, Slice 3은 `[ ]`) 포함
  - `src/models/task.ts` — Slice 1에서 생성된 Task 모델 파일 (간단한 interface + 생성 함수)
  - `src/api/tasks.ts` — Slice 1에서 생성된 API 라우트 파일 (POST /api/tasks 핸들러)
  - `src/api/tasks.test.ts` — Slice 1의 테스트 파일
- 체크리스트:
  - [ ] 출력이 Feature 문서의 내용에 기반한 분석을 포함한다
  - [ ] 상태 탐지 결과에 구현계획 체크박스 기반 세부 상태를 포함했다 ("Slice 1~2 완료" 또는 체크박스 상태 언급)
  - [ ] 출력이 sd-tdd 프로세스에 기반한 진행을 포함한다
  - [ ] Slice 3부터 재개하려는 시도를 했다 (Slice 1~2를 다시 시작하지 않음)

## 안티패턴 Eval

- [ ] 출력이 Feature 문서의 내용을 반영하지 않은 Phase 결정을 포함한다
- [ ] 상태 탐지 결과를 출력하지 않고 바로 Phase에 진입한다
- [ ] 해당 Phase의 하위 스킬 프로세스와 무관한 방식으로 진행한다
- [ ] Feature 문서 경로가 입력에 명시되었는데 사용자에게 경로를 다시 물어본다
- [ ] Phase 전환 시 사용자에게 진행 여부를 물어본다
