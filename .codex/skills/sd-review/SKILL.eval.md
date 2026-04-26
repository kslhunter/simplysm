# Eval: sd-review

## 행동 Eval

### 시나리오 1: 검증 후 남은 이슈를 명확화하고 sd-dev로 전달

- 입력: "$sd-review packages/demo/src"
- 체크리스트:
  - [ ] `.codex/skills/sd-review/SKILL.md` 파일에 `## Step 5: 남은 이슈 명확화` 섹션이 포함되어 있다.
  - [ ] `.codex/skills/sd-review/SKILL.md` 파일의 Step 5에 Step 4를 통과한 이슈를 최종 이슈로 확정하기 전에 `$sd-inner-clarify`에 전달한다는 문장이 포함되어 있다.
  - [ ] `.codex/skills/sd-review/SKILL.md` 파일의 Step 7에 확정 이슈가 있으면 `$sd-dev` 스킬을 즉시 호출한다고 명시되어 있다.
  - [ ] `.codex/skills/sd-review/SKILL.md` 파일의 Step 7에 `review.md` 등 파일 산출물을 만들지 않는다고 명시되어 있다.

### 시나리오 2: sd-dev 마지막 리뷰 단계가 sd-review로 위임 후 종료

- 입력: "$sd-dev docs/wbs.md 1"
- 체크리스트:
  - [ ] `.codex/skills/sd-dev/SKILL.md` 파일의 Step 6이 `$sd-review` 스킬을 호출한다고 명시한다.
  - [ ] `.codex/skills/sd-dev/SKILL.md` 파일의 Step 6이 현재 `$sd-dev` 실행은 `$sd-review` 호출 시점에 종료된다고 명시한다.
  - [ ] `.codex/skills/sd-dev/SKILL.md` 파일이 내부 리뷰 스킬을 직접 호출하라고 지시하지 않는다.
  - [ ] `.codex/skills/sd-dev/SKILL.md` 파일이 `$sd-review`가 전달한 확정 이슈 목록을 Step 3(sd-plan)으로 보낸다고 명시한다.
  - [ ] `.codex/skills/sd-dev/SKILL.md` 파일이 `$sd-review`가 전달한 확정 이슈 목록으로 시작한 경우 `$sd-wbs`를 수행하지 않는다고 명시한다.

## 안티패턴 Eval

- [ ] `.codex/skills/sd-review/SKILL.md` 파일이 리뷰 결과를 `.tasks/{timestamp}_review-{topic}/review.md`에 기록하라고 지시하지 않는다.
- [ ] `.codex/skills/sd-review/SKILL.md` 파일에 `$sd-inner-clarify`의 `VERIFIED`, `INFERRED`, `ASSUMED` 분류 기준이 복제되어 있지 않다.
- [ ] `.codex/skills/sd-review/SKILL.md` 파일이 명확화되지 않은 이슈를 `$sd-dev`에 전달하라고 지시하지 않는다.
