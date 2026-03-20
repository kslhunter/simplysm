---
name: sd-wbs
description: 프로젝트 요구사항을 Feature 단위로 분해한다.
disable-model-invocation: true
---

# sd-wbs: 프로젝트 분해 (WBS)

프로젝트 요구사항을 **Impact Mapping**과 **Feature Breakdown**으로 분해하여 `wbs.md`를 생성한다.

4단계 개발 프로세스의 1단계:
1. **분해 (WBS)** ← 현재
2. 요구명세 (`/sd-spec`)
3. 구현계획서 (`/sd-plan`)
4. TDD 개발 (`/sd-tdd`)

## 프로세스

### 1. 요구사항 수집

사용자가 요구사항을 제공하면 분석을 시작한다. 요구사항이 없으면 "어떤 시스템/프로젝트를 만들려고 하시나요?"로 시작한다.

### 2. 자율 분석

아래 질문 흐름을 따라 Impact Mapping 트리를 구축한다. 불명확한 점은 반드시 사용자에게 질문한다 — 절대 추측하지 않는다. 선택지 제시 시 `.claude/rules/sd-option-scoring.md`의 규칙을 따른다.

**질문 흐름:**

| 순서 | 질문 | 도출 요소 | 기법 |
|------|------|-----------|------|
| 1 | "왜 만드나?" 반복 | Goal | 5 Whys → GQM으로 측정 가능하게 |
| 2 | "누가 쓰나? 누가 영향받나?" | Actor | Stakeholder Onion |
| 3 | "그 사람 행동이 어떻게 바뀌어야?" | Impact | Behavior Change Questions |
| 4 | "가장 단순하게 뭘 만들면?" | Deliverable | 최소 산출물 도출 |
| 5 | (구조화) | Epic/Feature | SPIDR·INVEST로 크기 검증 |
| 6 | "뭘 빼나?" | 제외 사항 | In/Out List |

위 순서대로 한 단계씩 질문하며 진행한다. 모든 Question이 해소되면 WBS 문서를 생성한다.

### 3. WBS 문서 생성

`.tasks/{yyMMddHHmmss}_{topic}/wbs.md`에 아래 형식으로 작성한다.

- `{yyMMddHHmmss}`: 현재 시각. **반드시 Bash 도구로 `date +%y%m%d%H%M%S`를 실행하여 얻는다.** LLM이 직접 생성하면 시분초가 누락되므로 금지한다. (예: `260319133103`)
- `{topic}`: 프로젝트 주제를 kebab-case로 (예: `task-management`)

```markdown
# WBS

## Impact Mapping

- **Goal:** [측정 가능한 목표]
  - **Actor:** [이해관계자]
    - **Impact:** [행동 변화]
      - **Deliverable:** [산출물]
    - **Impact:** [행동 변화]
      - **Deliverable:** [산출물]
  - **Actor:** [이해관계자]
    - **Impact:** [행동 변화]
      - **Deliverable:** [산출물]

## Feature Breakdown

### Epic 1. [Epic 이름]

- [ ] Feature 1.1 [Feature 이름]
  - [범위 힌트]
  - [범위 힌트]
- [ ] Feature 1.2 [Feature 이름]
  - [범위 힌트]

### Epic 2. [Epic 이름]

- [ ] Feature 2.1 [Feature 이름]
  - [범위 힌트]

## 참조 자료

[대화에서 수집한 구체적 정보를 여기에 기록한다]

## 제외 사항

- [제외 항목]
- [제외 항목]
```

## 작성 규칙

### Impact Mapping

- 모든 Feature가 Goal까지 역추적 가능해야 한다. Goal에 연결되지 않는 기능은 제외 대상이다.
- Goal은 측정 가능하게 기술한다. "효율화"가 아닌 "처리 시간 30% 단축"처럼 구체적으로.
- Impact는 기능이 아닌 **행동 변화**를 기술한다. "대시보드를 본다"가 아닌 "업무 상태를 빠르게 파악한다".

### Feature Breakdown

- **의존성 순서로 정렬한다.** Feature 번호 순서 = 구현 순서. 앞선 Feature가 뒤의 Feature의 기반이 되도록 배치한다.
- **범위 힌트는 "-" 불릿으로 나열한다.** 정식 분해가 아닌 seed이다. 정식 분해는 2단계(`/sd-spec`)에서 수행한다.
- **`[ ]` 체크박스로 진행을 추적한다.** 4단계(`/sd-tdd`) 완료 시 `[x]`로 갱신한다.
- **MoSCoW 우선순위를 사용하지 않는다.** 순서 정렬이면 충분하다.
- **SPIDR로 Feature 크기를 검증한다.** Feature가 너무 크면 Spike, Path, Interface, Data, Rule 축으로 분할한다.
- **INVEST로 적정성을 검증한다.** Independent, Negotiable, Valuable, Estimable, Small, Testable.

### 참조 자료

다음 단계(`/sd-spec`)가 별도 세션에서 실행되어도 정보가 유실되지 않도록, 대화에서 수집한 구체적 정보를 이 섹션에 기록한다. 범위 힌트에 들어가지 않는 모든 구체적 정보가 대상이다.

**기록 대상:**
- 고객이 제공한 문서/예제의 핵심 내용 (원문 인용 또는 요약)
- 업무 규칙, 데이터 형식, 유효성 조건 등 구체적 제약
- 기술 제약 (기존 시스템 연동, 프로토콜, 데이터 포맷 등)
- 화면/UI 요구사항 (레이아웃, 필드 구성 등)
- 참조 파일 경로 (대화에서 첨부된 파일이 있으면 경로 기록)

**작성 원칙:**
- Feature별로 그룹화하지 않는다 — 주제별로 자유롭게 기록한다
- 범위 힌트와 중복되는 일반적 설명은 제외하고, 범위 힌트에 담기지 않는 **구체적 세부사항**만 기록한다
- 대화에서 첨부된 이미지의 경우, 이미지에서 읽은 핵심 내용을 텍스트로 기록한다

### 제외 사항

- 현재 범위에서 명시적으로 제외하는 항목을 나열한다.
- Impact Mapping에서 Goal에 연결되지 않는 기능이 여기에 온다.

## 다음 단계

WBS 완료 후, Feature Breakdown의 위에서부터 순서대로 Feature를 선택하여 `/sd-spec`(2단계)으로 진행한다.
