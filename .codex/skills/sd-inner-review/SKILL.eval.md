# Eval: sd-inner-review

## 행동 Eval

### 시나리오 1: 검증 후 남은 이슈를 명확화 스킬에 위임

- 입력: "$sd-inner-review packages/demo/src"
- 체크리스트:
  - [ ] `.codex/skills/sd-inner-review/SKILL.md` 파일에 `## Step 5: 남은 이슈 명확화` 섹션이 포함되어 있다.
  - [ ] `.codex/skills/sd-inner-review/SKILL.md` 파일의 Step 5에 Step 4를 통과한 이슈를 최종 이슈로 확정하기 전에 `$sd-inner-clarify`에 전달한다는 문장이 포함되어 있다.
  - [ ] `.codex/skills/sd-inner-review/SKILL.md` 파일의 Step 5에 명확성 분류, 근거 탐색, 재분류 보고, 사용자 질문 여부는 `$sd-inner-clarify`의 기준을 따른다는 문장이 포함되어 있다.
  - [ ] `.codex/skills/sd-inner-review/SKILL.md` 파일의 Step 5에 `Step 4에서 확인한 검증 근거와 남은 불확실성`을 전달한다고 명시되어 있다.
  - [ ] `.codex/skills/sd-inner-review/SKILL.md` 파일의 Step 6 설명이 Step 5에서 유지된 이슈만 최종 정리 대상으로 삼는다고 명시한다.

## 안티패턴 Eval

- [ ] `.codex/skills/sd-inner-review/SKILL.md` 파일이 불확실한 이슈를 사용자 선택 없이 확정 이슈로 섞어 보고하라고 지시하지 않는다.
- [ ] `.codex/skills/sd-inner-review/SKILL.md` 파일에 `$sd-inner-clarify`의 `VERIFIED`, `INFERRED`, `ASSUMED` 분류 기준이 복제되어 있지 않다.
- [ ] `.codex/skills/sd-inner-review/SKILL.md` 파일이 명확화되지 않은 이슈를 보류 이슈로 보고하라고 지시하지 않는다.
