# Eval: sd-plan

## 행동 Eval

### 시나리오 1: Feature 경로 지정 시 구현계획 작성
- 입력: "/sd-plan .tasks/test-project/1.1-task-create-edit.md"
- 사전 조건:
  - `.tasks/test-project/1.1-task-create-edit.md` — 요구명세(Gherkin) 포함, 구현계획 없음
- 체크리스트:
  - [ ] 출력이 Feature 문서의 내용에 기반한 분석을 포함한다
  - [ ] 코드베이스 탐색 결과가 출력에 반영되어 있다
  - [ ] Metacognitive Preamble (VERIFIED/INFERRED/ASSUMED 분류)을 출력에 포함했다
  - [ ] INFERRED 항목에 레벨(High/Medium/Low)이 표기되어 있다
  - [ ] INFERRED Medium 또는 Low 항목이 있으면, ASSUMED로 격상되어 Open Question으로 전환되었다 (해당 항목이 없으면 PASS)
  - [ ] 구현계획에 Tech Design Doc 5개 섹션(배경, 목표, 비목표, 설계, 대안 검토)이 모두 있다
  - [ ] Vertical Slices가 1개 이상 있다
  - [ ] 각 Slice에 Gherkin Scenario 제목이 매핑되어 있다 ("Scenarios:" 하위에 "Scenario:" 항목)
  - [ ] Slice 간 의존 관계가 있으면 "의존:" 필드가 명시되어 있다
  - [ ] Feature 문서에 `## 구현계획` 섹션이 추가되었다

### 시나리오 2: ASSUMED 항목 → Open Question 처리
- 입력: "/sd-plan .tasks/test-project/1.3-task-assignee.md"
- 사전 조건:
  - `.tasks/test-project/1.3-task-assignee.md` — 요구명세에 기술 선택이 모호한 Gherkin 포함
- 체크리스트:
  - [ ] ASSUMED 항목을 1개 이상 식별하여 출력에 포함했다
  - [ ] ASSUMED 항목에 대해 선택지와 장단점/트레이드오프를 제시했다
  - [ ] 질문 텍스트가 출력에 포함되었다
  - [ ] 질문 후 (자동 선택한) 답변을 구현계획에 반영했다

### 시나리오 3: Open Question 해소로 요구명세 변경 시 역방향 피드백
- 입력: "/sd-plan .tasks/test-project/1.4-data-export.md"
- 사전 조건:
  - `.tasks/test-project/1.4-data-export.md` — 요구명세에 "GraphQL Query로 CSV 데이터를 내보낸다"는 전제의 Gherkin Scenario 포함. 구현계획 없음
  - `.tasks/test-project/wbs.md` — Feature 1.4 data-export가 `[ ]`로 표시, 범위 힌트에 "CSV 내보내기"만 기재
  - 코드베이스에 REST(Express) 기반 API만 존재 (GraphQL 없음) — ASSUMED로 기술 선택 Open Question이 발생하도록 유도
- 체크리스트:
  - [ ] REST vs GraphQL (또는 유사 기술 선택)에 대한 Open Question이 출력에 포함되었다
  - [ ] Open Question 해소(자동 선택) 후, 선택 결과에 따라 요구명세의 Gherkin이 수정되었다
  - [ ] Feature 문서의 `## 요구명세` 섹션이 변경된 기술 선택을 반영한다
  - [ ] 변경 내용을 출력에서 사용자에게 알렸다

## 안티패턴 Eval

- [ ] 출력이 Feature 문서의 내용을 반영하지 않은 구현계획을 포함한다
- [ ] 코드베이스 구조가 구현계획에 반영되지 않았다
- [ ] Metacognitive Preamble (VERIFIED/INFERRED/ASSUMED) 없이 바로 구현계획을 작성한다
- [ ] Vertical Slices 없이 Tech Design Doc만 작성한다
- [ ] Slice에 Gherkin Scenario 매핑("Scenarios:" 섹션)이 없다
- [ ] Metacognitive Preamble 분류 확인을 사용자에게 묻는다 (보여주기만 하고 즉시 진행해야 한다)
- [ ] ASSUMED 항목에 대해 질문 텍스트(선택지와 장단점 포함)를 출력하지 않고 결정한다
- [ ] Open Question 해소에서 사용자 선택이 요구명세에 영향을 줌에도, `## 요구명세` 섹션을 수정하지 않는다
- [ ] Feature 범위를 변경했음에도 wbs.md를 수정하지 않는다
