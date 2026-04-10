---
name: sd-dev
description: 요구명세 → 구현계획 → TDD 개발 → 체크 → 리뷰를 순차 실행하는 통합 개발 오케스트레이터. "전체 프로세스 시작", "스펙부터 개발까지", "Feature 개발", "처음부터 끝까지" 등을 요청할 때 사용한다.
---

# sd-dev: 통합 개발 프로세스

sd-wbs → sd-plan → sd-tdd → sd-check → sd-review를 순차 진행하는 오케스트레이터. 각 단계는 해당 스킬의 SKILL.md를 읽고 따른다.

## 공통 규칙

### 단계 전환

sd-tdd 이후 단계(Step 4~6)는 완료 시 즉시 다음 단계로 진행한다. 사용자에게 진행 여부를 묻지 않는다.
sd-wbs, sd-plan(Step 2~3)은 문서 작성 후 **종료**하여 사용자가 새 세션에서 검토 후 재개할 수 있도록 한다.

## Step 1: 입력 분기

인자에 따라 시작 Step을 결정한다.

| 입력 | 시작 Step |
| --- | --- |
| 인자 없음 | → Step 2 (sd-wbs) |
| wbs 경로만 (추가 요청 있음) | → Step 2 (sd-wbs 업데이트) |
| wbs 경로만 (추가 요청 없음) | → `/sd-dev {wbs경로} {Feature번호}` 안내 후 **종료** |
| wbs + Feature 번호 | → Step 3 (sd-plan) |
| Feature 문서 경로 | → Step 4 (sd-tdd). Slice 체크박스(`[x]`/`[ ]`)를 확인하여 진행 상태를 복원한다 |

## Step 2: sd-wbs

`.claude/skills/sd-wbs/SKILL.md`를 읽고 수행한다. 완료 후:

- **Feature 1개** → 즉시 Step 3 진행
- **Feature 2개 이상** → `/sd-dev {wbs경로} {첫 Feature 번호}` 안내만 하고 **종료**

## Step 3: sd-plan

`.claude/skills/sd-plan/SKILL.md`를 읽고 수행한다. 완료 후:

- **Slice 1개** → 즉시 Step 4 진행
- **Slice 2개 이상** → `/sd-dev {feature.md경로}` 안내만 하고 **종료**

## Step 4: sd-tdd

`.claude/skills/sd-tdd/SKILL.md`를 읽고 따른다.

## Step 5: sd-check

`.claude/skills/sd-check/SKILL.md`를 읽고 변경 패키지및 의존패키지에 대해 실행한다.
- 문제 발생시 `.claude/references/sd-debug.md`를 읽고 ACH 지침에 따라 근본 원인을 분석한다.
- **수정은 근본 원인이 명확히 특정된 경우에만** 수행한다. 원인 불명 시 사용자에게 보고한다.
- sd-check의 에스컬레이션 규칙을 따른다.

## Step 6: sd-review

`.claude/skills/sd-review/SKILL.md`를 읽고 지침에 따라 wbs/feature문서를 잘 구현하고 있는지 검토한다.

아래 지침을 우선으로 따른다:

- 여러 패키지를 하나의 리포트로 통합한다. **단, 리포트 파일(review.md)을 생성하지 않고 발견된 이슈를 바로 코드에 적용한다.**
- 분석 절차와 체크리스트는 `.claude/skills/sd-review/SKILL.md`를 그대로 따르되, 리포트 생성을 생략하고 이슈를 직접 수정한다.

이슈 적용 후 sd-check를 재실행하여 수정이 기존 코드를 깨뜨리지 않았는지 검증한다. 2차 리뷰는 수행하지 않는다.

## Step 7: 완료

모든 단계 완료 후, 실행 결과를 대화에 출력한다.

- review단계의 미수정 건들은 반드시 미수정 이유와 함께 개별 출력한다.

### 최종 리뷰 안내

wbs.md를 **다시 읽어서** Feature 체크박스를 확인하여 모든 Feature가 완료(`[x]`)되었으면, `/sd-review`를 사용한 최종 심층 리뷰를 안내한다.

예: `/sd-review {wbs디렉토리경로}가 잘 구현되었는지 최종 심층 리뷰`
