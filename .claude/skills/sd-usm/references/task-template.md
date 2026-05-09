# task.md 템플릿

`.story-maps/{yyMMddHHmmss}_{slug}/TASK-XXX-slug/task.md`

## 템플릿

```markdown
# TASK-001-입고지시서수정

## 메타
- Activity: A1. <Activity 이름>
- specified: <pending | YYYY-MM-DD>  ← sd-usm 산출 시 pending, sd-refinement 통과 시 YYYY-MM-DD

## 요약
<Connextra 한 줄: "[Persona] 가 [Outcome] 을 위해 [본 Task 행동] 한다">

## Stories
- [ ] Story 1: <Connextra 한 줄: "[Persona] 가 [목적] 을 위해 [행동] 한다">
  > [YYYY-MM-DD, 초안] "원문 발췌"
  > 출처: <파일경로>:L<범위> 또는 채팅 paste + 일자

  - **AC**: <합의된 인수 조건> (YYYY-MM-DD)
    - 근거: 사용자 답변 (YYYY-MM-DD) / <코드경로>:L<범위> / <URL> / <표준명>
  - [ ] **Open Question**: <확인 필요 사항>

- [ ] Story 2: ...
```

## Story Connextra 적용 규칙

- 형식: `[Persona] 가 [목적] 을 위해 [행동] 한다`
- Persona 단일·메타 명시 시 생략 가능
- **목적 = 달성 가치**. 행동 반복 금지 (잘못된 예: "A 업로드를 위해 A 파일을 업로드한다"). 본 Task 의 Outcome 또는 후속 Task 의 입력 사용 이유에서 도출.
