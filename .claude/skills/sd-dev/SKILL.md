---
name: sd-dev
description: 요구명세 → 구현계획 → TDD 개발 → 체크 → 리뷰를 순차 실행하는 통합 개발 오케스트레이터. "전체 프로세스 시작", "스펙부터 개발까지", "Feature 개발", "처음부터 끝까지" 등을 요청할 때 사용한다.
---

# sd-dev: 통합 개발 프로세스

sd-wbs → sd-plan → sd-tdd → sd-check → sd-review를 순차 진행하는 오케스트레이터.
**CRITICAL**: Step간 진행은 사용자 확인없이 즉시 다음 Step으로 진행한다.

## 공통 규칙

### subagent 실행 프로토콜

Step 4~6은 Agent 도구로 subagent를 생성하여 수행한다. 각 단계가 fresh context를 확보하여 컨텍스트 소진을 방지한다.

#### prompt 구성

1. `.claude/skills/sd-dev/subagent-preamble.md`를 Read한다
2. 그 내용 + Step별 작업 지시를 합쳐 Agent prompt를 구성한다

#### NEED_INPUT 처리 루프

subagent 반환값에 `---NEED_INPUT---`이 포함되면:

1. 상황과 선택지를 파악한다
2. AskUserQuestion으로 사용자에게 질문한다 (sd-options 규칙 준수)
3. SendMessage로 사용자 결정을 subagent에 전달한다
4. subagent 반환값을 다시 확인한다 (NEED_INPUT 반복 가능)

포함되지 않으면 해당 Step 완료.

## Step 1: 입력 분기

인자에 따라 시작 Step을 결정한다. (인자가 없는경우 대화에서 유추)

| 입력                             | 시작 Step                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------ |
| wbs 경로만 (추가 요청 없음)      | → `/sd-dev {wbs경로} {Feature번호}` 안내 후 **종료**                           |
| wbs 경로만 (추가 요청 있음)      | → Step 2 (sd-wbs 업데이트)                                                     |
| wbs + Feature 번호               | → Step 3 (sd-plan)                                                             |
| Feature 문서 경로                | → Step 4 (sd-tdd). Slice 체크박스(`[x]`/`[ ]`)를 확인하여 진행 상태를 복원한다 |
| 그 외 (자연어 요청, 참고자료 등) | → Step 2 (sd-wbs)                                                              |

## Step 2: sd-wbs

`/sd-wbs` 스킬을 즉시 수행한다. 완료 후:

- **Feature 2개 이상** → `/sd-dev {wbs경로} {첫 Feature 번호}` 안내만 하고 **종료**
- **단일 Feature** → 즉시 Step 3 진행

## Step 3: sd-plan

`/sd-plan` 스킬을 즉시 수행한다. 완료 후 사용자 확인 없이 즉시 Step 4로 진행한다.

## Step 4: sd-tdd (subagent)

Agent 도구로 subagent를 생성하여 sd-tdd를 수행한다. (subagent 실행 프로토콜 참조)

### prompt 구성

preamble + 아래 작업 지시:

    ## 작업
    `.claude/skills/sd-tdd/SKILL.md`를 Read하고 지침에 따라 TDD 개발을 수행하세요.
    - Feature 문서: {feature_doc_path}
    - WBS 문서: {wbs_path}

NEED_INPUT 처리 루프에 따라 사용자 입력을 중계한다.

## Step 5: sd-check (subagent)

수정된 소스코드(`src/`, `tests/`)가 하나도 없으면(예: 문서만 수정) 이 단계를 스킵한다.

Agent 도구로 subagent를 생성하여 변경 패키지에 대한 sd-check를 수행한다. (subagent 실행 프로토콜 참조)

### prompt 구성

preamble + 아래 작업 지시:

    ## 작업
    `.claude/skills/sd-check/SKILL.md`를 Read하고 지침에 따라 체크를 수행하세요.
    - 대상 패키지: {변경된 패키지 목록}

NEED_INPUT 처리 루프에 따라 사용자 입력을 중계한다.

## Step 6: sd-review (subagent)

Agent 도구로 subagent를 생성하여 코드 리뷰 + 수정을 수행한다. (subagent 실행 프로토콜 참조)

### prompt 구성

preamble + 아래 작업 지시:

    ## 작업
    1. `.claude/skills/sd-inner-review/SKILL.md`를 Read하고 지침에 따라 코드 리뷰를 수행하세요.
       - 요구사항 원천: {wbs_path}, {feature_doc_path}
    2. 발견된 **모든** 이슈를 직접 수정하세요.
    3. 수정 내역을 요약하여 보고하세요 (파일경로, 수정 내용).

NEED_INPUT 처리 루프에 따라 사용자 입력을 중계한다.

### 수정 후 재검증

subagent가 코드 수정을 보고하면, Step 5(sd-check)를 subagent로 재수행한다.

## Step 7: 완료 보고

모든 단계 완료 후, 아래 양식으로 실행 결과를 대화에 출력한다.

```
## 완료 보고

- **WBS**: {wbs 파일명}
- **Feature**: {번호} - {Feature 제목} ({Feature 파일명})

### 사용자 결정사항
- {결정 내용 요약}

### 리뷰 수정 건
- {수정 내용 한줄 요약}

### 리뷰 미수정 건
- {미수정 내용 한줄 요약} — 사유: {사유}

### 변경 파일
- {파일 경로 목록}

<!-- 아래 두 섹션 중 조건에 맞는 정확히 하나만 출력한다 -->

### 남은 Feature  <!-- 미완료(`[ ]`) Feature가 1개 이상일 때만 출력 -->
- {번호} {제목} (의존성: {있으면 명시})

### 최종 리뷰 안내  <!-- 모든 Feature가 완료(`[x]`)일 때만 출력 -->
`/sd-review {wbs디렉토리경로}/*.md 가 잘 구현되었는지, 문제는 없는지 최종 심층 리뷰`
```

완료 보고 출력 직전에 **반드시(MUST) wbs.md의 현재 상태를 다시 읽어** Feature 체크박스(`[x]`/`[ ]`)를 확인한 뒤, 위 두 섹션 중 조건에 맞는 정확히 하나만 출력한다.
- 다시 읽지 않으면 병렬 로 수행한 모든것이 적용되지 않은 상태로 표기되기 때문에 중복 수행 문제가 발생할 수 있다.

**NEVER:** 미완료(`[ ]`) Feature가 1개라도 남아 있으면 `/sd-review`를 어떤 형태로도(조건부·제안·예시 포함) 언급하지 않는다. "모든 Feature가 끝난 뒤 /sd-review를 권장" 같은 조건부 안내도 금지한다.
