---
name: sd-dev-spec
description: Feature의 요구명세를 작성하는 스킬. "요구명세 작성", "spec 만들어줘", "요구사항 정의" 등을 요청할 때 사용한다.
---

# sd-dev-spec: 요구명세 (2단계)

Feature의 범위 힌트를 Example Mapping으로 구조화하고, Question 루프로 모호함을 제거한 뒤, Gherkin Scenario로 변환하여 Feature 문서를 생성한다.

## 프로세스 흐름

아래 다이어그램이 전체 프로세스의 흐름이다. 각 노드의 상세 설명은 이후 섹션에서 기술한다.

```mermaid
flowchart TD
    S1[Step 1: 입력 확인] --> SG{Step 1.5: 크기 판단}
    SG -->|적정| S2[Step 2: Metacognitive Preamble]
    SG -->|프로젝트 수준| WBS[/sd-wbs 먼저 제안]
    SG -->|Feature 과대| SPLIT[Feature 분리 제안]
    WBS -->|수락| END1[종료 → /sd-wbs 안내]
    WBS -->|거부| S2
    SPLIT -->|수락 + wbs.md 수정| S1
    SPLIT -->|거부| S2
    S2 --> S3[Step 3: Example Mapping 초안]
    S3 --> S4{Question 남아있음?}
    S4 -->|Yes| S5[Step 4: Question 루프]
    S5 --> S4
    S4 -->|No| S6[Step 5: Gherkin 생성]
    S6 --> S7[Step 6: Feature 문서 생성]
    S7 --> S8[Step 7: 역방향 피드백]
```

## Step 1. 입력 확인

Feature 정보를 다음 우선순위로 결정한다:

1. **인자 지정:** 사용자가 인자로 경로(wbs.md 또는 Feature 문서)를 지정했으면 그것을 사용한다
2. **인자에 자연어 설명:** 사용자가 인자로 Feature 설명을 지정했으면 (예: `/sd-dev-spec 로그인 기능`) 그것을 seed로 사용한다
3. **대화 맥락:** 대화에서 Feature에 대한 논의(기능 설명, 요구사항, 동작 등)가 있으면 그것을 seed로 사용한다. 이미 충분한 정보가 대화에 있으므로 Feature가 무엇인지 다시 물어보지 않는다
4. **위 모두 없으면:** AskUserQuestion으로 사용자에게 물어본다

### 경로/wbs.md가 지정된 경우

1. Feature Breakdown에서 미완료(`[ ]`) Feature 목록을 사용자에게 보여준다
2. 사용자가 Feature를 선택하면, 해당 Feature의 불릿 항목(범위 힌트)을 seed로 사용한다
3. wbs.md에 `## 참조 자료` 섹션이 있으면 해당 내용을 읽고 Metacognitive Preamble과 Example Mapping의 추가 seed로 활용한다. 참조 자료에 파일 경로가 기록되어 있으면 해당 파일을 Read 도구로 읽는다
4. **CRITICAL: 범위 힌트는 불완전한 seed이며 전체 목록이 아니다.** 범위 힌트에 나열된 항목만으로 범위를 한정하지 않는다. 반드시 참조 자료에 기록된 파일 경로나 코드베이스의 관련 모듈을 탐색하여, 범위 힌트에 누락된 항목을 발굴한다. 특히 마이그레이션의 경우, 원본 코드가 source of truth이므로 원본의 모든 경우(분기, 열거형, 옵션 등)를 코드에서 직접 확인한다. 발견한 추가 항목은 Metacognitive Preamble에서 [INFERRED]로 분류한다

### 대화 맥락이나 자연어 설명으로 Feature를 결정한 경우

1. 대화/인자에서 추출한 Feature 정보를 그대로 seed로 사용한다
2. 작업 디렉토리를 결정한다:
   - `.tasks/` 하위에 기존 작업 디렉토리가 있으면 그것을 사용한다
   - 없으면 `.tasks/{yyMMddHHmmss}_{topic}/`을 생성한다 (sd-wbs와 동일한 규칙)
     - `{yyMMddHHmmss}`: **반드시 Bash 도구로 `date +%y%m%d%H%M%S`를 실행하여 얻는다**
     - `{topic}`: Feature 주제를 영어 kebab-case로 (예: `email-login`)

## Step 1.5. 크기 판단 게이트

입력을 확인한 뒤, Metacognitive Preamble(Step 2)로 넘어가기 전에 요청의 크기를 판단한다. sd-dev-spec은 **단일 Feature**를 위한 스킬이므로, Feature 범위를 벗어나는 요청은 조기에 감지하여 적절한 스킬로 안내한다.

### 자연어 입력이 프로젝트 수준인 경우

다음 중 하나 이상에 해당하면 단일 Feature가 아닌 프로젝트 수준으로 판단한다:
- 독립적으로 분리 가능한 기능이 여러 개 나열되어 있다 (예: "로그인, 결제, 상품 관리, 통계")
- "~시스템", "~플랫폼", "~서비스" 등 프로젝트 전체를 지칭하는 표현이 있다
- 여러 독립적 Actor가 각각 다른 기능을 사용한다

→ `/sd-wbs`를 먼저 수행하도록 제안한다. 왜 WBS가 먼저 필요한지(여러 독립 기능을 Feature 단위로 분해해야 각 Feature를 순차적으로 spec할 수 있다)를 설명하고, 선택지를 제시한다:
1. `/sd-wbs`를 먼저 수행한다 → sd-dev-spec을 종료하고 `/sd-wbs` 실행을 안내한다
2. 그대로 진행한다 (단일 Feature로 취급) → Step 2로 진행한다

### WBS Feature가 너무 큰 경우

Feature 선택 후 범위 힌트와 참조 자료를 확인하여 예상 Rule 수를 추정한다. **예상 Rule이 5개를 초과하면** Feature가 너무 크다고 판단한다 — sd-wbs의 크기 검증 기준과 동일하다.

→ Feature 분리를 제안한다:
1. SPIDR(Spike, Path, Interface, Data, Rule) 축으로 분리안을 1개 이상 제시한다
2. 사용자가 분리안을 수락하면 wbs.md의 해당 Feature를 분리된 Feature들로 교체한다
3. 분리된 Feature 중 하나를 선택하여 Step 1부터 다시 시작한다
4. "그대로 진행" 옵션도 포함한다 → Step 2로 진행한다

## Step 2. Metacognitive Preamble

Example Mapping을 작성하기 전에, Feature의 범위 힌트를 바탕으로 먼저 세 가지를 분리한다. 이 단계는 추측을 방지하기 위한 것으로, 모르는 것을 명확히 인식해야 올바른 Question을 도출할 수 있다.

| 구분 | 레벨 | 설명 |
|------|------|------|
| **아는 것** (VERIFIED) | — | 사용자가 직접 말했거나 문서에 명시된 것 |
| **추론 가능한 것** (INFERRED) | **High** | **현재 작업 대상(타겟) 코드베이스**에서 동일 패턴을 확인했거나 공식 문서에 근거가 있는 추론. INFERRED로 유지 |
| | **Medium** | 일반적 도메인 관행이나 유사 사례에 기반한 추론. **→ ASSUMED로 자동 격상**. 마이그레이션 원본, 이전 버전, 외부 프로젝트의 패턴은 "유사 사례"에 해당한다 |
| | **Low** | 약한 유추나 제한적 근거에 기반한 추론. **→ ASSUMED로 자동 격상** |
| **모르는 것** (ASSUMED) | — | 추측에 해당 — 반드시 Question으로 전환 |

INFERRED Medium/Low는 과신 위험이 높으므로, ASSUMED로 격상하여 사용자에게 질문한다. **INFERRED High만 질문 없이 진행**할 수 있다.

이 분리 결과를 사용자에게 보여준 뒤, 확인을 묻지 않고 즉시 Example Mapping으로 진행한다.

## Step 3. Example Mapping

범위 힌트를 seed로, 다음 세 가지로 분류한다:

- **Rule**: 비즈니스 규칙 (검증 조건, 제약, 정책)
- **Example**: Rule을 구체적으로 보여주는 사례 (입력 → 기대 결과)
- **Question**: 확인이 필요한 불확실한 사항

### Example Mapping 형식

Rule별로 그룹화하여 작성한다. 각 항목에 Confidence Tag를 표기한다.

#### ASSUMED 항목의 처리
- ASSUMED 항목은 `- Question:` 항목으로 표기한다 — 기본값이 있어도 자체 확정 금지. 사용자만이 ASSUMED를 확정할 수 있다
- 이유: ASSUMED를 바로 확정하면 사용자가 검토할 기회를 잃는다. Step 4에서 사용자 확인 후에만 해소된다

```markdown
### Rule: 제목은 필수 [VERIFIED]
- Example: 제목 "신규 기능 개발" 입력 → 저장 성공 [VERIFIED]
- Example: 제목 비움 → "제목을 입력해주세요" 에러 [INFERRED]

### Rule: 담당자를 지정할 수 있다 [VERIFIED]
- Example: 담당자 1명 지정 → 성공 [VERIFIED]
- Example: 담당자 여러 명 지정 → 성공 [INFERRED]
- Question: 담당자 없이 임시저장 가능한가? [ASSUMED → Question]
- Question: 담당자 최대 인원 제한이 있는가? [ASSUMED → Question]
```

### Question 도출 기법

아래 기법을 상황에 맞게 적용하여 빠진 Rule/Example을 찾고, 미정의 사항을 Question으로 도출한다. 모든 기법을 항상 적용하는 것이 아니라, Feature의 성격에 맞는 기법을 선택한다. 적용한 기법의 이름을 Example Mapping 출력에 표기한다.

| 기법 | 적용 시점 | 방법 |
|------|-----------|------|
| **Decision Table** | 조건 조합이 있을 때 | 조건 조합을 전부 나열하여 비어있는 칸 = Question |
| **Boundary Value Analysis** | 숫자/범위가 있을 때 | 경계값(최소, 최대, 0, 초과)을 예시로 강제 → 미정의 경계 = Question |
| **Equivalence Partitioning** | 입력 분류가 있을 때 | 입력 분류를 전부 나열 → 동작 미정의 분류 = Question |
| **State Transition** | 상태가 있는 Feature | 상태 × 이벤트 조합 나열 → 미정의 전이 = Question |
| **Perspective-Based Reading** | 최종 검토 시 | 테스터/개발자/사용자 관점에서 각각 검토 → 빠진 것 = Question |

## Step 4. Question 루프

선택지 제시 시 `.claude/rules/sd-option-scoring.md`의 규칙을 따른다.

- Example Mapping의 Question 항목들을 AskUserQuestion으로 사용자에게 제시한다
- 답변을 받으면 즉시 Example Mapping을 갱신한다:
  - ASSUMED → VERIFIED로 변경
  - 새 Rule/Example이 도출되면 추가
  - 답변에서 새 Question이 발생하면 추가

### Question 그룹화 원칙

Example Mapping의 Question이 많을 때, "같은 주제"를 이유로 여러 Question을 하나의 결정사항으로 묶지 않는다. 묶을 수 있는 유일한 기준은 **의존성**이다:
- **A의 답이 B의 선택지를 변경한다** → A를 먼저 제시하고, 답변 후 B를 제시하거나 제거한다
- **A와 B가 독립이다** → 별개의 결정사항으로 하나씩 제시한다 (sd-option-scoring 규칙)

예: "로그인 상태 유지 포함 여부"와 "비밀번호 찾기 포함 여부"는 독립 → 별개 결정사항
예: "실패 횟수 제한 여부"와 "잠금 해제 방법"은 의존적 → 순차 제시 (제한 없으면 해제 질문 불필요)

### 설계 결정 기록

Question이 해소될 때마다, 해당 결정을 추적한다. 다른 세션에서 작업을 이어받을 때 맥락이 유실되지 않도록 하기 위함이다 — Gherkin에는 "무엇을"만 담기고 "왜 그렇게 결정했는지"는 담기지 않는다.

추적 대상:
- 해소된 ASSUMED 항목의 최종 결정과 근거
- 논의 과정에서 발생한 범위 변경 (예: "이 기능은 다른 Feature로 이관")
- 다른 Feature에 영향을 주는 결정 (예: "PostCSS는 Feature 3.x에서 처리")

이 결정 목록은 Step 6에서 Feature 문서의 `### 설계 결정` 섹션(`## 참조 자료` 하위)에 기록된다.

## Step 5. Gherkin 생성

### 작성 규칙

- 각 Example → 하나의 Scenario
- 각 Rule → Gherkin `Rule:` 키워드로 그룹화
- 공통 전제조건은 `Background:`에 모은다
- Gherkin은 스펙 문서 용도다 (테스트 러너로 실행하지 않음)

### Gherkin 형식

```gherkin
Feature: {Feature번호} {Feature이름}

  Background:
    Given {공통 전제조건}

  Rule: {Rule 이름}

    Scenario: {Example 이름}
      Given {전제조건}
      When {행위}
      Then {기대 결과}

    Scenario: {Example 이름}
      Given {전제조건}
      When {행위}
      Then {기대 결과}
```

## Step 6. Feature 문서 생성

### 파일 위치 및 이름

- **위치:** `wbs.md`가 있는 디렉토리 (없으면 Step 1에서 결정한 작업 디렉토리)
- **파일명:** `{Feature번호}-{Feature이름}.md`
  - 예: `1.1-task-create-edit.md`, `2.1-personal-task-list.md`
  - Feature 이름에서 공백과 특수문자(`/` 등)를 제거한다

### 문서 구조

#### wbs.md에서 Feature를 선택한 경우

```markdown
# Feature {번호} {이름}

## 참조 자료

- [wbs.md]({wbs.md 상대 경로})

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | {결정사항} | {선택} | {근거} |

## 요구명세

{Gherkin Scenarios}
```

wbs.md에 이미 참조 자료가 있으므로, Feature 문서에는 wbs.md 링크만 기록한다.

#### wbs.md 없이 독립 실행한 경우 (자연어 입력, 대화 맥락)

```markdown
# Feature {번호} {이름}

## 참조 자료

{대화에서 수집한 구체적 정보 — sd-wbs의 참조 자료 작성 규칙과 동일}

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | {결정사항} | {선택} | {근거} |

## 요구명세

{Gherkin Scenarios}
```

다음 단계(`/sd-dev-plan`)가 별도 세션에서 실행되어도 정보가 유실되지 않도록, 대화에서 수집한 구체적 정보를 기록한다. 기록 대상과 작성 원칙은 sd-wbs의 `### 참조 자료` 작성 규칙을 따른다.

`## 구현계획` 섹션은 3단계(sd-dev-plan)에서 추가된다. 이 스킬에서는 `## 참조 자료`(하위 `### 설계 결정` 포함)와 `## 요구명세` 섹션을 작성한다.

## Step 7. 역방향 피드백

spec 과정에서 변경·발견된 모든 사항은, 영향받는 모든 문서(wbs.md, Feature 문서)에 반드시 빠짐없이 반영한다. 발견한 누락·불일치는 "사소하다" "매핑은 맞다" 등의 이유로 수정을 생략하지 않는다 — 문서 간 정합성을 항상 유지한다. 변경 내용과 사유를 사용자에게 명확히 알린다.
역방향 피드백의 주요 목적은, 새로운 세션에서 다른 작업을 수행할때 이 세션의 결정사항을 잊지 않고 이어서 하기 위함이다.

### 범위 대조 (wbs.md가 있는 경우)

현재 Feature의 범위 힌트를 다른 Feature의 범위 힌트와 대조한다. 의미적으로 다른 Feature의 영역에 해당하는 항목이 있으면 사용자에게 확인하고, 범위를 조정한다.

예: Feature 1.1 "사용자 인증"의 범위 힌트에 "권한 기반 접근 제어"가 있고 Feature 1.2가 "권한 관리"라면, "권한 기반 접근 제어"는 Feature 1.2로 이관이 적절할 수 있다.

## 산출물 예시

### wbs.md에서 Feature를 선택한 경우

```markdown
# Feature 1.1 입고 처리

## 참조 자료

- [wbs.md](./wbs.md)

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | 바코드 미인식 시 처리 | 수동 입력 허용 | 현장 바코드 손상 빈번 |

## 요구명세

Feature: 1.1 입고 처리

  Background:
    Given 로그인한 창고 담당자가 입고 처리 화면에 있다

  Rule: 바코드 스캔으로 입고한다
    (Scenarios 생략)

  Rule: 수량 불일치 시 입고 보류로 전환한다
    (Scenarios 생략)
```

### wbs.md 없이 독립 실행한 경우

```markdown
# Feature 1.1 사용자 로그인

## 참조 자료

### 인증 방식
- 이메일/비밀번호 기반 로그인
- 소셜 로그인: Google, Kakao 지원

### 보안 규칙
- 로그인 5회 실패 시 계정 잠금
- 비밀번호 찾기 기능 필요

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | 소셜 로그인 범위 | Google, Kakao만 | 사용자 90%가 이 두 플랫폼 사용 |
| D2 | 비밀번호 찾기 방식 | 이메일 인증 | SMS 비용 대비 효과 낮음 |

## 요구명세

Feature: 1.1 사용자 로그인

  Background:
    Given 사용자가 로그인 화면에 있다

  Rule: 이메일/비밀번호로 로그인한다
    (Scenarios 생략)

  Rule: 5회 실패 시 계정이 잠긴다
    (Scenarios 생략)
```
