---
name: sd-dev
description: 요구명세 → 구현계획 → TDD 개발 → 체크 → 리뷰를 순차 실행하는 통합 개발 오케스트레이터. "전체 프로세스 시작", "스펙부터 개발까지", "Feature 개발", "처음부터 끝까지" 등을 요청할 때 사용한다.
---

# sd-dev: 통합 개발 프로세스

sd-wbs → sd-plan → sd-tdd → sd-check → sd-review를 순차 진행하는 오케스트레이터. 각 단계는 해당 스킬의 SKILL.md를 읽고 따른다.

## 공통 규칙

### 단계 전환

각 단계 완료 시 즉시 다음 단계로 진행한다. 사용자에게 진행 여부를 묻지 않는다.

| 전환                       | 조건                     | 동작                                                                   |
| -------------------------- | ------------------------ | ---------------------------------------------------------------------- |
| sd-plan → sd-tdd           | 요구명세 + 구현계획 완성 | 즉시 sd-tdd 시작                                                       |
| sd-tdd → sd-check          | TDD 완료                 | Feature 문서 재확인 → `wbs.md` 갱신 후, 범위 결정 → 즉시 sd-check 시작 |
| sd-check → sd-review       | 모든 패키지 check 통과   | 즉시 sd-review 시작                                                    |
| sd-review 완료 (이슈 없음) | 이슈 0건                 | 완료                                                                   |
| sd-review 완료 (이슈 있음) | 이슈 적용 완료           | sd-check 재실행 → 통과 시 완료                                         |

## Step 1: 입력 분기

### Case 1: 인자 없음

`.claude/skills/sd-wbs/SKILL.md`를 읽고 수행한다. 완료 후:

- Feature가 **1개**면 바로 sd-plan → sd-tdd → sd-check → sd-review 진행
- Feature가 **여러 개**면 `/sd-dev {wbs경로} {첫 Feature 번호(1.1)}` 안내 후 종료

### Case 2: wbs 경로만

사용자의 대화 맥락에 추가 요청이 있는지 확인한다:

- **추가 요청 있음** → `.claude/skills/sd-wbs/SKILL.md`를 읽고 wbs 업데이트 수행 → `/sd-dev {wbs경로} {Feature번호}` 안내 후 종료
- **추가 요청 없음** → `/sd-dev {wbs경로} {Feature번호}` 안내 후 종료

### Case 3: wbs + Feature 번호

처음부터 진행: sd-plan → sd-tdd → sd-check → sd-review

### Case 4: Feature 문서 경로

sd-tdd부터 재개: sd-tdd → sd-check → sd-review

구현계획의 Slice 체크박스(`[x]`/`[ ]`)를 확인하여 세부 진행 상태를 복원한다. 예를 들어 Slice 2까지 `[x]`이면 Slice 3부터 재개한다.

## Step 2: sd-plan

`.claude/skills/sd-plan/SKILL.md`를 읽고 따른다.

## Step 3: sd-tdd

`.claude/skills/sd-tdd/SKILL.md`를 읽고 따른다.

## Step 4: sd-check

`.claude/skills/sd-check/SKILL.md`를 읽고 변경 패키지및 의존패키지에 대해 실행한다.

## Step 5: sd-review

`.claude/skills/sd-review/SKILL.md`를 읽고 따르되, 아래 지침을 더 우선한다.

- 여러 패키지를 하나의 리포트로 통합한다. **단, 리포트 파일(review.md)을 생성하지 않고 발견된 이슈를 바로 코드에 적용한다.**
- 분석 절차와 체크리스트는 `.claude/skills/sd-review/SKILL.md`를 그대로 따르되, 리포트 생성을 생략하고 이슈를 직접 수정한다.

이슈 적용 후 sd-check를 재실행하여 수정이 기존 코드를 깨뜨리지 않았는지 검증한다. 2차 리뷰는 수행하지 않는다.

## Step 6: 완료

모든 단계 완료 후, 실행 결과를 대화에 출력한다.

- review단계의 미수정 건들은 반드시 미수정 이유와 함께 개별 출력한다.
