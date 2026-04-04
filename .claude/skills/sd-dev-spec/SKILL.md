---
name: sd-dev-spec
description: Feature의 요구명세를 작성하는 스킬. "요구명세 작성", "spec 만들어줘", "요구사항 정의" 등을 요청할 때 사용한다.
---

# sd-dev-spec: 요구명세 (2단계)

## Step 1. 요구사항 크기 판단

**출처가 wbs문서인 경우 이 단계를 생략한다.**

입력을 확인한 뒤, 요청의 크기를 판단한다.

### 자연어 입력이 프로젝트 수준인 경우

다음 중 하나 이상에 해당하면 단일 Feature가 아닌 프로젝트 수준으로 판단한다:

- 독립적으로 분리 가능한 기능이 여러 개 나열되어 있다 (예: "로그인, 결제, 상품 관리, 통계")
- "~시스템", "~플랫폼", "~서비스" 등 프로젝트 전체를 지칭하는 표현이 있다
- 여러 독립적 Actor가 각각 다른 기능을 사용한다

→ `/sd-wbs`를 먼저 수행하도록 제안하고 종료한다.

## Step 2. Feature 정의

다음을 파악한다.

- **범위**: 해당 Feature의 세부 기능을 **구체적 동작 수준**으로 **MUST 빠짐없이** 나열한다. (절대 누락되어선 안된다.)
  입력에 이미 범위가 작성되어 있더라도 그대로 사용하지 않고, 각 항목을 구체적 동작 수준으로 세분화하여 재나열한다.
- **경계**: 이 Feature가 **하지 않는 것**을 명시한다. 인접 Feature와의 경계가 모호한 경우 특히 중요하다.
- **근거**: 범위가 도출된 근거 혹은 출처를 명시한다. (요구사항, 사용자 답변, 첨부문서 등) 개발에 필요한 참조 파일/자료 경로가 있으면 확인 목적과 함께 기록한다.

불명확한 점은 **반드시** 사용자에게 질문한다. **절대** 추측하지 않는다.

### 기능단위가 너무 큰 경우

나열한 범위의 세부 기능 수를 확인한다. **세부 기능이 5개를 초과하면** Feature가 너무 크다고 판단한다.

→ Feature 분리를 제안한다. ("그대로 진행" 선택지도 포함)

- **출처가 wbs 문서인 경우**: SPIDR(Spike, Path, Interface, Data, Rule) 축으로 분리안을 제시하고, 수락 시 해당 문서의 Feature를 교체한다.
- **그 외**: `/sd-wbs`를 먼저 수행하도록 제안하고 종료한다.

## Step 3. Metacognitive Preamble

Example Mapping을 작성하기 전에, Feature의 범위를 바탕으로 먼저 세 가지를 분리한다.

| 구분           | 레벨         | 설명                                                                       |
|--------------|------------|--------------------------------------------------------------------------|
| **VERIFIED** | —          | 사용자가 직접 말했거나 문서에 명시된 것                                                   |
| **INFERRED** | **High**   | **현재 작업 대상(타겟) 코드베이스**에서 동일 패턴을 확인했거나 공식 문서에 근거가 있는 추론. INFERRED로 유지     |
|              | **Medium** | 일반적 도메인 관행이나 유사 사례에 기반한 추론. 마이그레이션 원본, 이전 버전, 외부 프로젝트의 패턴은 "유사 사례"에 해당한다 |
|              | **Low**    | 약한 유추나 제한적 근거에 기반한 추론.                                                   |
| **ASSUMED**  | —          | 추측에 해당 — 반드시 Question으로 전환                                               |

INFERRED Medium/Low와 ASSUMED는 불명확한것으로 보고, `.claude/rules/sd-option-scoring.md`의 규칙에 따라 **반드시** 사용자에게 질문하여 명확화한다.

## Step 4. Example Mapping

Feature의 범위와 Metacognitive Preamble 결과를 바탕으로, 다음 세 가지로 분류한다:

- **Rule**: 비즈니스 규칙 (검증 조건, 제약, 정책)
- **Example**: Rule을 구체적으로 보여주는 사례 (입력 → 기대 결과)
- **Question**: 확인이 필요한 불확실한 사항

### Question 도출 기법

아래 기법을 상황에 맞게 적용하여 빠진 Rule/Example을 찾고, 미정의 사항을 Question으로 도출한다. 모든 기법을 항상 적용하는 것이 아니라, Feature의 성격에
맞는 기법을 선택한다. 적용한 기법의 이름을 Example Mapping 출력에 표기한다.

| 기법                            | 적용 시점          | 방법                                             |
|-------------------------------|----------------|------------------------------------------------|
| **Decision Table**            | 조건 조합이 있을 때    | 조건 조합을 전부 나열하여 비어있는 칸 = Question               |
| **Boundary Value Analysis**   | 숫자/범위가 있을 때    | 경계값(최소, 최대, 0, 초과)을 예시로 강제 → 미정의 경계 = Question |
| **Equivalence Partitioning**  | 입력 분류가 있을 때    | 입력 분류를 전부 나열 → 동작 미정의 분류 = Question            |
| **State Transition**          | 상태가 있는 Feature | 상태 × 이벤트 조합 나열 → 미정의 전이 = Question             |
| **Perspective-Based Reading** | 최종 검토 시        | 테스터/개발자/사용자 관점에서 각각 검토 → 빠진 것 = Question       |

### Example Mapping 형식

Rule별로 그룹화하여 작성한다.

```markdown
### Rule: 제목은 필수

- Example: 제목 "신규 기능 개발" 입력 → 저장 성공
- Example: 제목 비움 → "제목을 입력해주세요" 에러

### Rule: 담당자를 지정할 수 있다

- Example: 담당자 1명 지정 → 성공
- Example: 담당자 여러 명 지정 → 성공
- Question: 담당자 없이 임시저장 가능한가?
- Question: 담당자 최대 인원 제한이 있는가?
```

## Step 5. Question 루프

1. 첫번째 Question 항목에 대해 하나씩 `.claude/rules/sd-option-scoring.md`의 규칙에 따라 사용자에게 질문한다.
2. 답변에 따라 Example Mapping을 갱신한다.
  - 새 Rule/Example/Question을 추가 혹은 기존 항목 수정
3. 모든 Question이 해소될 때까지 반복한다.

## Step 6. Gherkin 생성

### 작성 규칙

- 각 Example → 하나의 Scenario
- 각 Rule → Gherkin `Rule:` 키워드로 그룹화
- 공통 전제조건은 `Background:`에 모은다
- Gherkin은 스펙 문서 용도다. (테스트 러너로 실행하지 않음)

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

## Step 7. Feature 문서 생성

### 파일 위치 및 이름

- **위치:** wbs 문서가 있으면 해당 디렉토리, 없으면 `.tasks/{yyMMddHHmmss}_{topic}/`
- **파일명:** `{Feature번호}-{Feature이름}.md`
  - 예: `1.1-task-create-edit.md`, `2.1-personal-task-list.md`
    - Feature 이름에서 공백과 특수문자(`/` 등)를 제거한다
    - Feature이름은 영문으로 한다.

### 문서 구조

```markdown
# Feature {번호} {이름}

## 참조 자료

{대화에서 수집한 구체적 정보 혹은 참조한 자료}

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | {결정사항} | {선택} | {근거} |

## 요구명세

{Gherkin Scenarios}
```

## Step 8. 역방향 피드백

이 과정에서 변경·발견된 모든 사항은, wbs 문서에 반드시 빠짐없이 반영한다. (wbs 문서가 없으면 이 단계를 생략한다.)
발견한 누락·불일치는 어떠한 이유로도 수정을 생략해선 안된다.
문서 간 정합성을 항상 유지한다. 변경 내용과 사유를 명확히 작성한다.
역방향 피드백의 주요 목적은, 새로운 세션에서 다른 작업을 수행할때 이 세션의 결정사항을 잊지 않고 이어서 하기 위함이다.

### 범위 대조 (wbs.md가 있는 경우)

현재 Feature의 범위를 다른 Feature의 범위와 대조한다. 의미적으로 다른 Feature의 영역에 해당하는 항목이 있으면 사용자에게 확인하고, 범위를 조정한다.

예: Feature 1.1 "사용자 인증"의 범위 힌트에 "권한 기반 접근 제어"가 있고 Feature 1.2가 "권한 관리"라면, "권한 기반 접근 제어"는 Feature
1.2로 이관이 적절할 수 있다.
