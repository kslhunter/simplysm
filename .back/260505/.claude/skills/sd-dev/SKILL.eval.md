# Eval: sd-dev

## 행동 Eval

### 시나리오 1: wbs 경로만 제공 — 다음 단계 안내

- 사전 조건:
  - `.tasks/wbs.md` 생성 (Feature 2개 포함: 1.1 태스크 CRUD, 1.2 태스크 상태 관리)
- 입력: "/sd-dev .tasks/wbs.md"
- 성공 행동:
  - [ ] `/sd-dev .tasks/wbs.md {Feature번호}` 형태의 다음 단계 안내를 출력했다
  - [ ] Feature 분석·구현계획·코드 산출물이 생성되지 않았다
- Judge rubric:
  - PASS: 다음 단계 안내가 출력되고 추가 산출물 파일이 없음
  - FAIL: 다음 단계 안내 누락 또는 sd-plan/sd-tdd 산출물이 생성됨

### 시나리오 2: Feature 문서 경로 — Slice 체크박스 기반 재개

- 사전 조건:
  - `.tasks/wbs.md` 생성
  - `.tasks/1.1-task-crud.md` 생성 (Slice 1은 `[x]`, Slice 2~3은 `[ ]`)
- 입력: "/sd-dev .tasks/1.1-task-crud.md"
- 성공 행동:
  - [ ] Slice 2 또는 그 이후의 구현 산출물(테스트 또는 구현 코드)이 생성되었다
  - [ ] Slice 1에 해당하는 코드를 새로 재생성하지 않았다
- Judge rubric:
  - PASS: Slice 2 이후의 작업 산출물이 명확히 생성됨
  - FAIL: 산출물 없음 또는 Slice 1 재구현 흔적

### 시나리오 3: wbs + Feature 번호 — sd-plan부터 시작

- 사전 조건:
  - `.tasks/wbs.md` 생성 (Feature 1.1 포함)
- 입력: "/sd-dev .tasks/wbs.md 1.1"
- 성공 행동:
  - [ ] Feature 1.1의 요구명세 또는 구현계획 산출물이 생성되었다
  - [ ] 단계 전환 시 사용자에게 진행 여부 확인 질문을 하지 않았다
- Judge rubric:
  - PASS: Feature 1.1의 분석/계획 산출물 생성 + 진행 확인 질문 없음
  - FAIL: 산출물 미생성 또는 "다음 단계로 진행할까요?" 류 질문 발생

### 시나리오 4: 미완료 Feature 잔존 — /sd-review 언급 금지 (회귀)

- 사전 조건:
  - `.tasks/wbs.md` 생성 (Feature 2개: 1.1 `[ ]`, 1.2 `[ ]`)
  - 1.1만 구현되어 완료 처리되는 흐름. 1.2는 미완료 상태 유지.
- 입력: "/sd-dev .tasks/wbs.md 1.1"
- 성공 행동:
  - [ ] 최종 출력에 "## 완료 보고" 섹션이 존재한다
  - [ ] 최종 출력에 남은 Feature(1.2)의 번호와 제목이 안내되었다
  - [ ] 최종 출력에 "### 최종 리뷰 안내" 섹션 헤더가 등장하지 않는다
  - [ ] 최종 출력의 "## 완료 보고" 섹션 범위 내에 `/sd-review` 문자열이 등장하지 않는다
- Judge rubric:
  - PASS: 완료 보고에 남은 Feature가 안내되고 /sd-review 언급이 없음
  - FAIL: 완료 보고 누락, 남은 Feature 미안내, 또는 /sd-review 문자열 등장

## 안티패턴 Eval

- [ ] 단계 전환 시 "다음 단계로 진행할까요?", "계속할까요?" 등 진행 여부 확인을 요청했다
- [ ] sd-review가 별도 산출물 파일(`review.md` 등)을 생성하도록 두었다
- [ ] Feature 문서 경로 입력에서 sd-plan 단계를 실행했다 (sd-tdd부터 시작해야 한다)
- [ ] 미완료 Feature가 남아있는 상태에서 Step 7 출력에 `/sd-review`를 언급했다 (조건부 포함)
