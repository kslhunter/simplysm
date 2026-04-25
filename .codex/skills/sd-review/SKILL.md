---
name: sd-review
description: 정적 분석이 잡지 못하는 관점(로직 버그, 일관성, 성능, 설계)으로 코드를 분석하여 리포트를 생성하는 스킬. "코드 리뷰해줘", "문제점 찾아줘", "코드 분석해줘" 등을 요청할 때 사용한다.
---

# sd-review: 코드 리뷰


## Step 1: 코드 리뷰

`$sd-inner-review` 스킬을 호출한다.

## Step 2: 문서 기록

분석 결과를 문서에 기록한다.

### 출력 경로

산출물 경로: `.tasks/{timestamp}_review-{topic}/review.md`

- `{yyMMddHHmmss}` — 실제 현재 시각을 `yyMMddHHmmss` 형식으로 기재
- `{topic}` — 에러/이슈의 핵심을 나타내는 간결한 키워드 (예: `null-ref`, `race-condition`, `async-init`)

### review.md 형식

```markdown
# 코드 리뷰: {topic}

## {id} [{severity}] {한 줄 요약}

- **위치:** {파일경로}:{라인번호}

{왜 문제인지 — 의도와 실제 동작의 차이를 자연어로 서술}

**개선 방향:** {개선 방향}

---
```

- `{id}`: `{카테고리약자}-{순번}` (예: LOGIC-001, CONSIST-002)
- `{severity}`: Critical | Medium | Low
- 이슈 간 `---` 구분선으로 분리

## Step 3: 완료 후 행동

1. 대화에 출력파일(`review.md`) 파일 경로를 표시한다.
2. `$sd-dev` 스킬을 호출하여 수정 개발을 시작한다.
