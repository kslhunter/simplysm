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
    `designed` 를 YYYY-MM-DD 로 갱신 후 다음 Task 진입.

## 안티패턴

- 미해결 잔존 상태에서 완결 처리.
