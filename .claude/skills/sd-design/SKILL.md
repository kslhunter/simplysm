---
name: sd-design
description: task.md 를 코드베이스에 매핑해 design.md 작성. Use when "개발 설계" 요청 시
---

# sd-design

Engineering Design Doc (Current State → Solution → Detailed Design → Testing → Rollout) + Story 별 specifying.

## 산출물

```
.story-maps/{yyMMddHHmmss}_{slug}/TASK-XXX-slug/
  task.md         ← 입력 (sd-usm + sd-refinement 산출)
  design.md       ← 본 단계 산출물
```

템플릿: [design](references/design-md-template.md).

## Engineering Design Doc 외 (sd-design 확장)

- **Story 별 specifying loop**:
  - Open Question 한 번에 하나씩 → 사용자 답변 → 결정 전환 → design.md 즉시 갱신.
  - 한 Task 의 Open Question 0 도달 시:
    ```
    loop:
      design.md 전체 재검토 (정합성 / 누락 / 모호 / 미해결)
      if 신규 Open Question: continue
      break
    ```
    task.md AC 100% design 결정 매핑 검증 → 누락·변경 발견 시 사용자 질문 후 task.md / design.md 갱신.
    `designed` 를 YYYY-MM-DD 로 갱신 후 다음 Task 진입.

## 운용

- **선행 Read**: 같은 Story Map 의 `story-map.md` + 형제 `TASK-XXX-*/task.md`. 본 Task 의 Frame 내 위치와 형제 기결정 AC 영향을 파악한 뒤 진행.
- **UI Story 진입 순서**: `## 화면` 먼저 작성 → 사용자 확정 → 이후 `## Current State` 부터 진행. 화면이 흔들리면 Current State/Solution/Testing 모두 영향(cascading) 이므로 선확정.
- **결정 근거**: sd-base-rules.md "결정 근거" 적용. 근거 없는 항목은 design.md 에 Open Question 인라인.
- **역소급**: design 작성 중 task.md / story-map.md 의 도메인 의미 (용어 / 정책 / 상태 catalog 등) 가 추가·변경되면 task.md / story-map.md 도 즉시 갱신. 시스템 내부 구현 결정 (Data Model / Sync 로직 등) 은 design.md 에서 종결.
- **명시 결정 추종**: task.md / story-map.md 명시 결정 변경 / 의무 항목 누락 발생 시 즉시 중단 → 사용자 질문 → 답변 수신 → task.md / story-map.md 갱신 → 재개. self-justification (단순화 / 등가 / 성능 / 편의) 금지.

## 안티패턴

- 미해결 잔존 상태에서 완결 처리.
