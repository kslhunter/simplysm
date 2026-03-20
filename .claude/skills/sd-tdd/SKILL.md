---
name: sd-tdd
description: 구현계획(plan) 기반으로 TDD 개발한다.
disable-model-invocation: true
---

# sd-tdd: TDD 개발 (4단계)

Feature 문서(요구명세 + 구현계획)를 기반으로, Double Loop TDD로 코드를 구현한다. 외부 루프에서 Gherkin Scenario를 Acceptance Test로, 내부 루프에서 Unit TDD(Red-Green-Refactor)를 수행한다.

4단계 개발 프로세스:
1. 분해 (`/sd-wbs`)
2. 요구명세 (`/sd-spec`)
3. 구현계획 (`/sd-plan`)
4. **TDD 개발** (`/sd-tdd`) ← 현재

## 입력과 산출물

- **입력:** Feature 문서 (요구명세 + 구현계획) + 코드베이스
- **산출물:** 테스트된 코드 + WBS 체크박스 갱신 (`[x]`)

## 프로세스 흐름

```
1. Feature 문서 읽기 + 코드베이스 탐색
2. Slice 순서대로 Double Loop TDD 진행
   → 각 Scenario: Acceptance Test 작성 (Red)
     → 내부 루프: Unit Test Red → Green → Refactor (반복)
     → Acceptance Test 통과 (Green)
   → Slice 완료
3. 모든 Slice 완료 → WBS 체크박스 갱신
```

## Step 1: Feature 문서 읽기 + 코드베이스 탐색

### Feature 문서 읽기

Feature 문서 경로를 다음 우선순위로 결정한다:
1. 사용자가 경로를 지정했으면 그것을 사용한다
2. 대화 맥락에서 경로를 알 수 있으면 그것을 사용한다
3. 둘 다 없으면 AskUserQuestion으로 사용자에게 물어본다 (`.claude/rules/sd-option-scoring.md`의 규칙을 따른다)

Feature 문서에는 다음 두 섹션이 **전제 조건**으로 필요하다:
- `## 요구명세` — Gherkin Scenarios
- `## 구현계획` — Tech Design Doc + Vertical Slices

Feature 문서에 `## 참조 자료` 섹션이 있으면 함께 읽는다. wbs.md 링크가 있으면 해당 wbs.md의 참조 자료 섹션을 Read 도구로 읽는다. 참조 자료의 구체적 정보(업무 규칙, 데이터 형식, 기술 제약 등)를 구현에 반영한다.

둘 중 하나라도 섹션 자체가 없으면 **즉시 중단한다 — 이것은 우회할 수 없는 하드 스톱이다.** 누락 사실을 사용자에게 알리고 이전 단계(`/sd-spec` 또는 `/sd-plan`) 실행을 안내한 뒤 종료한다. 구현계획을 자동 생성하거나 "간단히 만들고 진행"하는 것은 금지다 — 구현계획은 반드시 `/sd-plan` 단계에서 사용자 확인을 거쳐 만들어야 한다. 섹션이 통째로 없는 것은 "역방향 피드백"의 대상이 아니다 — 이전 단계에서 만들어야 할 산출물이기 때문이다.

### 코드베이스 탐색

**코드가 source of truth이다.** 문서와 코드가 다르면 코드를 기준으로 한다.

탐색 대상:
- 구현계획에서 언급된 파일/모듈/엔티티
- 기존 테스트 구조와 컨벤션 (테스트 프레임워크, 파일 위치, 네이밍 패턴)
- 관련 의존성과 설정

### 현재 상태 확인

Slice 목록과 각 Slice에 매핑된 Scenario를 사용자에게 표시한다. 이미 구현된 부분이 있으면 현재 진행 상태를 파악하여 알린다.

## Step 2: Double Loop TDD

### 외부 루프: Slice → Scenario

구현계획의 Slice 순서대로 진행한다. 각 Slice 내에서 Scenario를 하나씩 처리한다.

### 각 Scenario의 진행

**1. Acceptance Test 작성 (Red)**

Gherkin Scenario의 Given/When/Then을 프로젝트 테스트 프레임워크의 Acceptance Test로 변환한다.

- Gherkin은 스펙 문서용이다. Cucumber 등 BDD 러너를 사용하지 않는다
- 프로젝트의 일반 테스트 프레임워크로 작성한다
- 테스트를 실행하여 실패(Red)를 확인한다

**2. 내부 루프: Unit TDD (반복)**

Acceptance Test를 통과시키기 위해 **반드시 Unit Test를 별도로 작성한다.** Acceptance Test가 아무리 단순해 보여도, 내부 루프를 최소 1회 수행해야 한다. Acceptance Test만 작성하고 곧바로 구현하는 것은 Double Loop TDD가 아니다.

1. Unit Test를 작성한다 (Red) — Acceptance Test와 별개의 도구 호출(Write/Edit)로 작성한다
2. Unit Test를 통과시키는 최소한의 코드를 구현한다 (Green)
3. 중복 제거, 네이밍 개선 등 리팩토링한다 (Refactor)
4. Acceptance Test가 아직 실패하면 → 1로 돌아간다

**3. Acceptance Test 통과 확인 (Green)**

Acceptance Test가 통과하면 다음 Scenario로 진행한다.

### Slice 완료

Slice의 모든 Scenario가 통과하면:
1. 전체 테스트 스위트를 실행하여 회귀가 없는지 확인한다
2. Feature 문서와 같은 디렉토리의 `progress.md`를 갱신한다 (current_slice, attempt_count 등)
3. 다음 Slice로 진행한다

## Step 3: Feature 완료

모든 Slice가 완료되면:
1. 전체 테스트 스위트를 최종 실행한다
2. WBS 파일(`wbs.md`)에서 해당 Feature의 `[ ]`를 `[x]`로 갱신한다
3. `progress.md`의 phase를 `done`으로 갱신한다

## 역방향 피드백

TDD 진행 중 **이미 존재하는** 요구명세나 구현계획의 내용에 누락·오류를 발견하면:
1. 같은 Feature 문서의 해당 섹션을 직접 수정한다
2. 변경 내용과 사유를 사용자에게 알린다

별도로 `/sd-spec`이나 `/sd-plan`을 재실행할 필요 없이, 이 스킬 내에서 직접 수정한다.

역방향 피드백은 기존 섹션의 **보완/수정**이다. `## 요구명세`나 `## 구현계획` 섹션 자체를 새로 작성하는 것은 역방향 피드백이 아니다 — 그것은 이전 단계(`/sd-spec`, `/sd-plan`)의 산출물이다.

예시 상황:
- Gherkin에 없는 엣지 케이스 발견 → 요구명세에 Scenario 추가
- 구현계획의 설계가 실제 코드와 맞지 않음 → 구현계획 수정
- Slice 분할/순서 변경이 필요 → 구현계획 수정

## 핵심 원칙

1. **테스트 먼저** — 구현 코드보다 테스트를 항상 먼저 작성한다. 테스트 없이 코드를 작성하지 않는다.
2. **최소 구현** — 테스트를 통과시키는 최소한의 코드만 작성한다. 미래 요구사항을 미리 구현하지 않는다 (YAGNI).
3. **작은 단계** — 한 번에 하나의 Unit Test만 추가한다. 큰 도약을 하지 않는다.
4. **리팩토링은 Green일 때** — 모든 테스트가 통과하는 상태에서만 리팩토링한다.
5. **기존 컨벤션 준수** — 프로젝트의 기존 테스트 패턴, 파일 구조, 코딩 스타일을 따른다.
6. **코드가 source of truth** — 문서에 구현 상세를 중복 기록하지 않는다.
