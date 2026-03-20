# Eval: sd-plan

## 행동 Eval

### 시나리오 1: Feature 경로 지정 시 구현계획 작성
- 입력: "/sd-plan .tasks/test-project/1.1-task-create-edit.md"
- 사전 조건:
  - `.tasks/test-project/1.1-task-create-edit.md` — 요구명세(Gherkin) 포함, 구현계획 없음
- 체크리스트:
  - [ ] Feature 문서를 Read 도구로 읽었다
  - [ ] 코드베이스 탐색을 시도했다 (Glob, Grep, 또는 Agent 도구 중 1회 이상 사용)
  - [ ] Metacognitive Preamble (VERIFIED/INFERRED/ASSUMED 분류)을 출력에 포함했다
  - [ ] INFERRED 항목에 레벨(High/Medium/Low)이 표기되어 있다
  - [ ] INFERRED Medium 또는 Low 항목이 있으면, ASSUMED로 격상되어 Open Question으로 전환되었다 (해당 항목이 없으면 PASS)
  - [ ] 구현계획에 Tech Design Doc 5개 섹션(배경, 목표, 비목표, 설계, 대안 검토)이 모두 있다
  - [ ] Vertical Slices가 1개 이상 있다
  - [ ] 각 Slice에 Gherkin Scenario 제목이 매핑되어 있다 ("Scenarios:" 하위에 "Scenario:" 항목)
  - [ ] Slice 간 의존 관계가 있으면 "의존:" 필드가 명시되어 있다
  - [ ] Feature 문서에 `## 구현계획` 섹션을 추가했다 (Edit 또는 Write 도구 사용)

### 시나리오 2: ASSUMED 항목 → Open Question 처리
- 입력: "/sd-plan .tasks/test-project/1.3-task-assignee.md"
- 사전 조건:
  - `.tasks/test-project/1.3-task-assignee.md` — 요구명세에 기술 선택이 모호한 Gherkin 포함
- 체크리스트:
  - [ ] ASSUMED 항목을 1개 이상 식별하여 출력에 포함했다
  - [ ] ASSUMED 항목에 대해 선택지와 장단점/트레이드오프를 제시했다
  - [ ] 질문을 시도했다 (AskUserQuestion 호출 시도 또는 텍스트 출력)
  - [ ] 질문 후 (자동 선택한) 답변을 구현계획에 반영했다

## 안티패턴 Eval

- [ ] Feature 문서를 Read하지 않고 구현계획을 작성한다
- [ ] 코드베이스 탐색을 전혀 시도하지 않는다 (Glob/Grep/Agent 도구 호출 이력 없음)
- [ ] Metacognitive Preamble (VERIFIED/INFERRED/ASSUMED) 없이 바로 구현계획을 작성한다
- [ ] Vertical Slices 없이 Tech Design Doc만 작성한다
- [ ] Slice에 Gherkin Scenario 매핑("Scenarios:" 섹션)이 없다
- [ ] ASSUMED 항목에 대해 질문 텍스트(선택지와 장단점 포함)를 출력하지 않고 결정한다
