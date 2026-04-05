# Eval: sd-dev

## 행동 Eval

### 시나리오 1: wbs 경로만 제공 — 다음 단계 안내

- 입력: "/sd-dev .tasks/wbs.md"
- 사전 조건:
  - `.tasks/wbs.md` 생성 (Feature 2개 포함: 1.1 태스크 CRUD, 1.2 태스크 상태 관리)
- 체크리스트:
  - [ ] wbs.md 파일 내용을 읽었다
  - [ ] `/sd-dev` 명령에 Feature 번호를 포함하는 다음 단계 안내를 출력했다
  - [ ] sd-plan 이후 단계(요구명세 작성, 구현계획, TDD 등)로 진행하지 않았다

### 시나리오 2: Feature 문서 경로 — Slice 체크박스 기반 재개

- 입력: "/sd-dev .tasks/1.1-task-crud.md"
- 사전 조건:
  - `.tasks/wbs.md` 생성
  - `.tasks/1.1-task-crud.md` 생성 (Slice 1은 `[x]`, Slice 2~3은 `[ ]`)
- 체크리스트:
  - [ ] Feature 문서를 읽었다
  - [ ] Slice 체크박스 상태를 확인하여 완료된 Slice 1을 건너뛰었다
  - [ ] `.claude/skills/sd-tdd/SKILL.md`를 읽었다
  - [ ] Slice 2 또는 그 이후부터 구현을 시작했다

### 시나리오 3: wbs + Feature 번호 — sd-plan부터 시작

- 입력: "/sd-dev .tasks/wbs.md 1.1"
- 사전 조건:
  - `.tasks/wbs.md` 생성 (Feature 1.1 포함)
- 체크리스트:
  - [ ] `.claude/skills/sd-plan/SKILL.md`를 읽었다
  - [ ] wbs.md에서 Feature 1.1 정보를 확인했다
  - [ ] Feature 분석(범위 설정 또는 Rule/Example/Question 도출)을 수행했다
  - [ ] 단계 전환 시 사용자에게 진행 여부를 묻지 않고 자동으로 진행했다

## 안티패턴 Eval

- [ ] 단계 전환 시 "다음 단계로 진행할까요?", "계속할까요?" 등 진행 여부 확인을 요청했다
- [ ] sd-review 단계에서 review.md 파일을 별도 생성했다 (sd-dev에서는 이슈를 코드에 직접 적용해야 한다)
- [ ] Case 4(Feature 문서 경로) 입력에서 sd-plan 단계를 실행했다 (sd-tdd부터 시작해야 한다)
