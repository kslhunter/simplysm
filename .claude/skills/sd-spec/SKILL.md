---
name: sd-spec
description: Feature의 요구명세를 작성한다.
disable-model-invocation: true
---

# sd-spec: 요구명세 (2단계)

Feature의 범위 힌트를 Example Mapping으로 구조화하고, Question 루프로 모호함을 제거한 뒤, Gherkin Scenario로 변환하여 Feature 문서를 생성한다.

## 프로세스 개요

```
Feature 선택
    ↓
Metacognitive Preamble (아는 것 / 추론 가능한 것 / 모르는 것 분리)
    ↓
Example Mapping 초안 (Confidence Tag 포함)
    ↓
ASSUMED 항목 → Question 전환
    ↓
Question 있음 → 사용자에게 질문 → 답변 반영 → Example Mapping 갱신 (반복)
    ↓
Question 모두 해소 → Gherkin 생성 → Feature 문서 생성
```

## Step 1. 입력 확인

Feature 정보를 다음 우선순위로 결정한다:

1. **인자 지정:** 사용자가 인자로 경로(wbs.md 또는 Feature 문서)를 지정했으면 그것을 사용한다
2. **인자에 자연어 설명:** 사용자가 인자로 Feature 설명을 지정했으면 (예: `/sd-spec 로그인 기능`) 그것을 seed로 사용한다
3. **대화 맥락:** 대화에서 Feature에 대한 논의(기능 설명, 요구사항, 동작 등)가 있으면 그것을 seed로 사용한다. 이미 충분한 정보가 대화에 있으므로 Feature가 무엇인지 다시 물어보지 않는다
4. **위 모두 없으면:** AskUserQuestion으로 사용자에게 물어본다

### 경로/wbs.md가 지정된 경우

1. Feature Breakdown에서 미완료(`[ ]`) Feature 목록을 사용자에게 보여준다
2. 사용자가 Feature를 선택하면, 해당 Feature의 불릿 항목(범위 힌트)을 seed로 사용한다

### 대화 맥락이나 자연어 설명으로 Feature를 결정한 경우

1. 대화/인자에서 추출한 Feature 정보를 그대로 seed로 사용한다
2. 작업 디렉토리를 결정한다:
   - `.tasks/` 하위에 기존 작업 디렉토리가 있으면 그것을 사용한다
   - 없으면 `.tasks/{yyMMddHHmmss}_{topic}/`을 생성한다 (sd-wbs와 동일한 규칙)
     - `{yyMMddHHmmss}`: **반드시 Bash 도구로 `date +%y%m%d%H%M%S`를 실행하여 얻는다**
     - `{topic}`: Feature 주제를 kebab-case로 (예: `email-login`)

## Step 2. Metacognitive Preamble

Example Mapping을 작성하기 전에, Feature의 범위 힌트를 바탕으로 먼저 세 가지를 분리한다. 이 단계는 추측을 방지하기 위한 것으로, 모르는 것을 명확히 인식해야 올바른 Question을 도출할 수 있다.

| 구분 | 레벨 | 설명 |
|------|------|------|
| **아는 것** (VERIFIED) | — | 사용자가 직접 말했거나 문서에 명시된 것 |
| **추론 가능한 것** (INFERRED) | **High** | 코드베이스에서 동일 패턴을 확인했거나 공식 문서에 근거가 있는 추론. INFERRED로 유지 |
| | **Medium** | 일반적 도메인 관행이나 유사 사례에 기반한 추론. **→ ASSUMED로 자동 격상** |
| | **Low** | 약한 유추나 제한적 근거에 기반한 추론. **→ ASSUMED로 자동 격상** |
| **모르는 것** (ASSUMED) | — | 추측에 해당 — 반드시 Question으로 전환 |

INFERRED Medium/Low는 과신 위험이 높으므로, ASSUMED로 격상하여 사용자에게 질문한다. **INFERRED High만 질문 없이 진행**할 수 있다.

이 분리 결과를 사용자에게 보여준다. 사용자가 분류를 확인/수정한 뒤 Example Mapping으로 진행한다.

## Step 3. Example Mapping

범위 힌트를 seed로, 다음 세 가지로 분류한다:

- **Rule**: 비즈니스 규칙 (검증 조건, 제약, 정책)
- **Example**: Rule을 구체적으로 보여주는 사례 (입력 → 기대 결과)
- **Question**: 확인이 필요한 불확실한 사항

### Example Mapping 형식

Rule별로 그룹화하여 작성한다. 각 항목에 Confidence Tag를 표기한다.

**ASSUMED 항목의 처리 — 이 규칙을 반드시 따른다:**
- ASSUMED 항목은 Example Mapping에서 반드시 `- Question:` 항목으로 표기한다
- ASSUMED를 자체 판단으로 확정하여 `[VERIFIED]`나 `[INFERRED]`로 바꾸지 않는다. 사용자만이 ASSUMED를 확정할 수 있다
- 이유: Example Mapping은 "현재 확인된 것"과 "아직 확인되지 않은 것"을 분리하는 도구다. ASSUMED를 바로 확정하면 사용자가 검토할 기회를 잃는다. Question은 Step 4(Question 루프)에서 사용자에게 질문한 뒤에만 해소된다
- "합리적 기본값이 있으니 확정해도 된다"는 판단은 금지한다 — 기본값이 있더라도 `- Question:`으로 남긴 뒤 Step 4에서 사용자에게 확인받는다

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

1. Example Mapping의 Question 항목들을 AskUserQuestion으로 사용자에게 제시한다
2. 답변을 받으면 즉시 Example Mapping을 갱신한다:
  - ASSUMED → VERIFIED로 변경
  - 새 Rule/Example이 도출되면 추가
  - 답변에서 새 Question이 발생하면 추가
3. Question이 모두 해소될 때까지 반복한다
4. 모든 Question이 해소되면 즉시 Step 5(Gherkin 생성)로 진행한다

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
  - 예: `1.1-업무생성편집.md`, `2.1-개인업무목록조회.md`
  - Feature 이름에서 공백과 특수문자(`/` 등)를 제거한다

### 문서 구조

```markdown
# Feature {번호} {이름}

## 요구명세

{Gherkin Scenarios}
```

`## 구현계획` 섹션은 3단계(sd-plan)에서 추가된다. 이 스킬에서는 `## 요구명세` 섹션만 작성한다.

## 산출물 예시

```markdown
# Feature 1.1 업무 생성/편집

## 요구명세

Feature: 1.1 업무 생성/편집

Background:
Given 로그인한 사용자가 업무 생성 화면에 있다

Rule: 업무 생성 시 제목은 필수

    Scenario: 제목을 입력하여 업무 생성 성공
      Given 제목에 "신규 기능 개발"을 입력한다
      And 설명에 "로그인 기능 구현"을 입력한다
      When 저장 버튼을 클릭한다
      Then 업무가 생성된다
      And 업무 목록에 "신규 기능 개발"이 표시된다

    Scenario: 제목 없이 업무 생성 실패
      Given 제목을 비워둔다
      When 저장 버튼을 클릭한다
      Then "제목을 입력해주세요" 에러가 표시된다
      And 업무가 생성되지 않는다

Rule: 담당자를 지정할 수 있다

    Scenario: 담당자 1명 지정
      Given 업무 생성 화면에서 제목을 입력한다
      When 담당자에 "홍길동"을 선택한다
      And 저장 버튼을 클릭한다
      Then 업무의 담당자가 "홍길동"으로 설정된다

    Scenario: 담당자 여러 명 지정
      Given 업무 생성 화면에서 제목을 입력한다
      When 담당자에 "홍길동", "김철수"를 선택한다
      And 저장 버튼을 클릭한다
      Then 업무의 담당자가 "홍길동", "김철수"로 설정된다

Rule: 첨부파일을 추가할 수 있다

    Scenario: 첨부파일 1개 추가
      Given 업무 생성 화면에서 제목을 입력한다
      When "설계서.pdf" 파일을 첨부한다
      And 저장 버튼을 클릭한다
      Then 업무에 "설계서.pdf"가 첨부된다
```
