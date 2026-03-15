---
name: sd-plan-dev
description: 구현계획서를 기반으로 TDD 방식의 실제 구현을 수행. 사용자가 구현계획서 기반의 코드 구현을 요청할 때 사용
argument-hint: "<plan 파일 경로> [--worktree]"
---

# sd-plan-dev: 구현 실행

구현계획서(plan)를 기반으로 TDD 사이클(RED → GREEN → Refactor)을 실행하여 실제 구현을 수행한다.

## 1. 인자 파싱

`$ARGUMENTS`를 분석하여 plan과 옵션을 결정한다.

### 1-1. plan 파일 경로

`$ARGUMENTS`에 `.md`로 끝나는 경로가 포함된 경우:
- 해당 파일을 Read한다

### 1-2. 인자 없음

`$ARGUMENTS`가 비어있으면 (옵션 플래그 제외):
- 현재 대화 맥락에서 plan 내용을 파악한다
- 대화에도 plan이 없으면 다음을 출력하고 종료한다:
  > 구현계획서가 없습니다. 먼저 `/sd-plan`을 실행하여 계획을 수립하세요.

### 1-3. `--worktree` 옵션

`$ARGUMENTS`에 `--worktree`가 포함된 경우 worktree 모드를 활성화한다.
- 기본값: 비활성 (현행 동작)
- 활성 시: 2단계에서 worktree 격리 실행 전략을 적용한다

## 참조 문서 수정 (전 단계 공통)

2~5단계 진행 중 참조 plan 또는 spec 문서에 누락, 오류, 실제 코드와의 불일치를 발견하면 다음 프로세스를 따른다:

1. 발견된 이슈와 제안하는 수정 내용을 텍스트로 설명한다
2. AskUserQuestion으로 수정 승인을 요청한다
3. 승인 시: plan.md (또는 spec.md)를 Edit으로 최소 수정하고, 현재 단계를 계속한다
4. 거부 시: 현재 문서 내용 그대로 작업을 계속한다
5. 수정 범위가 과도하면: `/sd-plan` (또는 `/sd-spec`) 재실행을 안내하고 현재 구현을 중단한다

**최소 수정 원칙:**
- 발견된 이슈에 직접 관련된 부분만 수정한다
- 기존 문서의 구조와 다른 항목은 유지한다
- 한 번에 하나의 이슈만 처리한다 (여러 이슈 발견 시 순차 처리)

**worktree subagent 제약:**
- worktree subagent 내에서는 상위 문서(plan/spec)를 직접 수정하지 않는다
- subagent는 발견한 이슈를 반환 결과에 포함하고, 메인 에이전트가 이 섹션의 프로세스에 따라 수정을 처리한다

## 2. 작업 파악 및 실행 전략

plan에서 작업 목록을 파악하고 스케줄링을 결정한다.

1. plan의 `## 작업 의존성` 섹션을 확인한다 (없으면 모든 작업을 독립으로 간주)
2. 스케줄링을 결정한다:
   - 작업 1개: 단일 실행
   - 독립 작업 2개 이상: 병렬 실행
   - 의존 작업: 의존 순서대로 순차 실행
   - 혼합: 독립 작업끼리는 병렬, 의존 체인은 순차로 조합

### `--worktree` 미사용 시

결정된 스케줄링에 따라 실행한다:
- 단일 작업: 바로 3단계(TDD 사이클)로 진행
- 병렬 실행: Agent tool로 각 작업을 별도 subagent에 위임하여 동시에 TDD 사이클 수행
- 순차 실행: 선행 작업 완료 후 후행 작업 시작

### `--worktree` 사용 시

결정된 스케줄링에 따라 `isolation: "worktree"` Agent tool로 실행한다:
- 단일 작업: worktree subagent 1개 생성 → 완료 후 4단계(merge)
- 병렬 실행: 각 작업별 worktree subagent 병렬 생성 → 모든 subagent 완료 후 4단계에서 순차 merge
- 순차 실행: 첫 작업 worktree subagent 생성 → 완료 후 4단계에서 merge → 현재 branch(merge 완료된 상태)를 base로 다음 작업 worktree subagent 생성 → 반복

**worktree 불가 제약**: subagent 테스트(`_test.md` 기반)가 필요한 작업은 worktree subagent 안에서 Agent tool을 사용할 수 없으므로 worktree 적용 불가. 해당 작업은 worktree 없이 3단계로 직접 수행한다.

**혼합 케이스** (worktree 가능 + 불가 작업 공존): worktree 가능한 작업끼리 스케줄링에 따라 worktree subagent로 실행하고, worktree 불가 작업은 모든 worktree merge 완료 후 순차 단일 수행한다. 단, 의존성에 의해 순서가 정해진 경우 그 순서를 우선한다.

## 3. TDD 사이클 실행

2단계에서 결정한 스케줄링에 따라 **모든 작업**에 대해 아래 TDD 사이클을 수행한다.

### RED Phase: 실패하는 테스트 작성 및 실행

plan의 RED Phase에 명시된 테스트 전략에 따라 분기한다:

**vitest 테스트인 경우:**
- plan의 테스트 시나리오에 따라 vitest 테스트 파일을 작성한다
- Bash로 `vitest run {테스트 파일}` 실행하여 실패를 확인한다

**subagent 테스트인 경우 (LLM용 문서, 테스트 환경 없는 코드 등):**
- plan의 테스트 시나리오에 따라 `_test.md` 파일을 작성한다
  - plan 파일 기반: plan 파일과 동일 디렉토리. plan이 `{R번호}_plan.md`이면 `{R번호}_test.md`, `plan.md`이면 `test.md`
  - 현재 대화 기반 (파일 경로 없음): plan에 참조 spec 경로가 있으면 해당 디렉토리에 저장. 없으면 `.tasks/` 하위에 새 디렉토리 생성
  - 형식: 테스트별 입력/기대출력 쌍
- Agent tool로 subagent를 생성하여 테스트를 실행하고 실패를 확인한다

**테스트 생략인 경우:**
- RED Phase를 건너뛰고 GREEN Phase로 바로 진행한다

### GREEN Phase: 최소 구현

plan의 GREEN Phase에 명시된 구현 계획에 따라 최소한의 구현을 수행한다 (YAGNI 원칙).
- 구현 후 테스트를 재실행하여 통과를 확인한다
- vitest: Bash로 재실행
- subagent 테스트: Agent tool로 재실행
- 테스트 생략인 경우: 구현만 수행

**구현 중 불확실한 부분 처리:**

구현 중 다음 상황이 발생하면 추측하여 구현하지 않고, AskUserQuestion으로 사용자에게 확인한다:
- plan에 명시되지 않은 구현 결정이 필요하고, 선택에 따라 구현 결과에 유의미한 차이가 발생하는 경우 (예: 데이터 구조 선택, API 설계, 에러 처리 전략)
- plan의 내용이 모호하여 합리적인 해석이 2가지 이상 존재하고, 각 해석이 서로 다른 구현으로 이어지는 경우

질문 시 구체적인 선택지를 나열하고 각각의 장단점을 설명한다.

> plan/spec 문서 자체에 오류·누락이 있는 경우는 이 지침이 아닌 "참조 문서 수정" 프로세스를 따른다.

**worktree subagent 내:** 불확실한 부분을 반환 결과에 포함하고, 메인 에이전트가 사용자에게 확인 후 해당 부분을 처리한다.

### Refactor Phase

`/simplify 완료 보고는 생략하고, 작업을 멈추지 않는다. 부모 프로세스를 계속 진행한다. 다음 파일만 리뷰: {수정한 파일 목록}` 하여 품질을 개선한다.
- 완료 후 테스트를 재실행하여 통과를 확인한다
- 리팩터링으로 테스트가 깨지면 수정 후 재확인한다

### Commit Phase

TDD 사이클(RED → GREEN → Refactor) 완료 후 1회 commit한다.
- 작업 하나 = commit 하나
- `--worktree` 사용 여부와 관계없이 동일하게 적용한다

### 다음 작업 전이

Commit 완료 후, 스케줄링에 따라 남은 작업이 있으면 해당 작업의 TDD 사이클(RED → GREEN → Refactor → Commit)을 반복한다. 모든 작업이 완료되면 5단계로 진행한다.

## 4. worktree merge (`--worktree` 활성 시)

worktree subagent 완료 후 반환된 branch를 순차적으로 merge한다.

**정상 흐름:**
1. `git merge {branch}` 실행
2. merge 완료 후 worktree를 정리한다
3. 성공 시 다음 branch merge (또는 5단계로 진행하여 자가검토 수행)

**conflict 발생 시:**
1. `git merge --abort` 실행하여 working directory를 깨끗한 상태로 복원
2. conflict 발생한 worktree 경로와 branch명을 출력
3. AskUserQuestion으로 "직접 merge하세요" 안내 + "완료" 옵션 제시
4. 사용자가 "완료" 선택 시 worktree를 정리하고 다음 branch merge 계속

## 5. 자가검토

모든 작업의 TDD 사이클이 완료되면 plan 원문과 실제 구현 결과를 대조한다.

1. plan 원문을 다시 읽는다
2. 각 작업별로 다음을 대조한다:
   - RED Phase의 테스트 시나리오가 모두 작성·실행되었는지
   - GREEN Phase의 구현 항목이 모두 구현되었는지
3. 누락 항목이 있으면 (최대 2회 반복):
   - 누락 항목에 대해 3단계 TDD 사이클(RED → GREEN → Refactor → Commit)을 수행한다
   - 1번으로 돌아가 다시 대조한다
4. 2회 반복 후에도 누락이 남아있으면 남은 항목을 사용자에게 보고한다
5. 모든 항목이 충족되면 6단계로 진행한다

## 6. 완료 안내

모든 작업의 TDD 사이클과 자가검토가 완료되면 다음을 출력한다:
- 전체 작업의 구현 결과 요약 (작업별 상태)
