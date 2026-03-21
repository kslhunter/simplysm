---
name: sd-dev
description: |
  sd-spec → sd-plan → sd-tdd 3단계를 순차 실행하는 통합 개발 프로세스 오케스트레이터.
  /sd-dev를 입력하거나, "전체 프로세스 시작", "스펙부터 개발까지", "Feature 개발",
  "처음부터 끝까지", "요구명세부터 TDD까지" 등을 요청할 때 사용한다.
  Feature 하나를 선택하여 요구명세 → 구현계획 → TDD 개발을 끊김 없이 진행한다.
  개별 단계만 실행할 때는 sd-spec/sd-plan/sd-tdd를 각각 사용하고,
  전체 흐름을 한번에 진행할 때 이 스킬을 사용한다.
---

# sd-dev: 통합 개발 프로세스

sd-spec → sd-plan → sd-tdd를 순차 진행하는 오케스트레이터. 각 Phase에서 해당 스킬의 SKILL.md를 Read 도구로 읽고 그대로 따른다.

## Phase 0: 상태 탐지

Feature 정보를 다음 우선순위로 결정한다:

1. **인자 지정:** 사용자가 인자로 경로(Feature 문서 또는 wbs.md)를 지정했으면 그것을 사용한다
2. **대화 맥락 — 경로:** 대화에서 Feature 문서 경로를 알 수 있으면 그것을 사용한다
3. **대화 맥락 — Feature 설명:** 대화에서 Feature에 대한 논의(기능 설명, 요구사항 등)가 있으면 Phase 1(sd-spec)을 시작하되, 해당 논의 내용을 sd-spec의 seed로 전달한다. Feature가 무엇인지 다시 물어보지 않는다
4. **위 모두 없으면:** AskUserQuestion으로 사용자에게 물어본다 (`.claude/rules/sd-option-scoring.md`의 규칙을 따른다)

경로가 결정된 경우, Feature 문서를 읽어 현재 상태를 파악하고, 탐지 결과를 사용자에게 보여준 뒤 바로 다음 Phase로 진행한다.

### Feature 문서 기반 Phase 탐지

| 상태 | 시작 Phase | 읽을 SKILL.md |
|------|-----------|---------------|
| Feature 문서 없음 | Phase 1 (sd-spec) | `.claude/skills/sd-spec/SKILL.md` |
| `## 요구명세`만 있음 | Phase 2 (sd-plan) | `.claude/skills/sd-plan/SKILL.md` |
| `## 요구명세` + `## 구현계획` 있음 | Phase 3 (sd-tdd) | `.claude/skills/sd-tdd/SKILL.md` |

### 구현계획 체크박스 기반 세부 상태 복원

Phase 3(sd-tdd)에서 `## 구현계획`의 Slice 체크박스(`[x]`/`[ ]`)를 확인하여 세부 진행 상태를 복원한다. 예를 들어 Slice 2까지 `[x]`이면 Slice 3부터 재개한다.

## Phase 전환

각 Phase 완료 시 즉시 다음 Phase로 진행한다. 사용자에게 진행 여부를 묻지 않는다.

| 전환 | 조건 | 동작 |
|------|------|------|
| Phase 1 → 2 | `## 요구명세` 완성 (Gherkin 포함) | 즉시 Phase 2 시작 |
| Phase 2 → 3 | `## 구현계획` 완성 | 즉시 Phase 3 시작 |
| Phase 3 완료 | 모든 Slice 완료 | `wbs.md`가 있으면 해당 Feature를 `[x]`로 갱신 |

Phase 전환과 Slice 완료는 Feature 문서의 `## 구현계획` 체크박스로 추적한다. 별도의 progress 파일은 사용하지 않는다.
