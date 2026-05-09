---
name: sd-refinement
description: Story Map 의 Open Question 을 AC 로 전환 (Story Refinement). Use when Story Map 의  specifying 요청 시
---

# sd-refinement

대상 Story Map (Frame) 의 Open Question → 사용자 답변 → AC 전환.

## 산출물

`.story-maps/{yyMMddHHmmss}_{slug}/TASK-XXX-slug/task.md` 갱신 — AC 채우고 specified 표기.

## 워크플로

1. **Task 순차 처리** (Walking Skeleton 시간순):
   - Open Question 한 번에 하나씩 → 사용자 답변 → AC 전환 → task.md 즉시 갱신.
   - 한 Task 의 Open Question 0 도달 시:
     ```
     loop:
       task.md 전체 재검토 (정합성 / 누락 / 모호 / 미해결)
       if 신규 Open Question: continue
       break
     ```
     `specified` 를 YYYY-MM-DD 로 갱신 후 다음 Task 진입.
   - 모든 Task specified 시 종료.

## 운용

- **선행**: Requirement Source 자료 전체 Read 후 진행. 인용 라인 범위만 보고 진행 금지.
- **Story 형식**: 발췌 (sd-usm 에서 박힌 그대로) + AC + Open Question 인라인.
- **Requirement Source 부정확성** (STT 오타 / 화자 추정 / 모호 발화 / 도메인 용어 다의성): [.claude/references/requirement-source-handling.md](../../references/requirement-source-handling.md).

## 안티패턴

- 미해결 잔존 상태에서 완결 처리.
