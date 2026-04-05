---
name: sd-tdd
description: 구현계획(plan) 기반으로 TDD 개발하는 스킬. "TDD 개발", "테스트 주도 개발", "plan 기반 구현" 등을 요청할 때 사용한다.
---

# sd-tdd: TDD 개발

Feature 문서(요구명세 + 구현계획)를 기반으로, Double Loop TDD로 코드를 구현한다.

개발 프로세스: Feature 분해 → Feature 설계 → **TDD 개발**

## 공통 규칙

### 기술적 장벽 처리

**CRITICAL: 설계 결정은 사용자가 확정한 구속력 있는 결정이다. 임의로 변경·축소·제외하는 것은 절대 금지다.**

구현 중 설계 결정을 그대로 구현할 수 없는 기술적 어려움을 발견하면,
1. **해당 구현을 중단**한다.
2. `.claude/references/sd-options.md`를 읽고 사용자에게 대안을 제시한다.
3. 사용자가 결정하면
  - 해당 결정을 Feature 문서의 `### 설계 결정` 섹션에 역방향 피드백으로 기록한다
  - 결정에 따라 구현계획을 갱신한다
  - 갱신된 Feature 문서로 구현을 재개한다

설계 결정의 변경은 사용자만이 할 수 있다.
sd-tdd는 설계를 그대로 구현하는 역할이므로, 문서(요구명세·구현계획·설계 결정)를 사용자 결정 없이 독자적으로 변경하지 않는다(NEVER).

### 테스트 분류 기준

**CRITICAL: 판단 단위는 Scenario가 아니라 검증 항목이다.**
Scenario에 하드웨어 의존이 하나라도 있다고 Scenario 전체를 수동 테스트로 분류하는 것은 금지다.

Scenario의 검증 항목을 분해하고, 각 항목별로 분류한다:

| 분류            | 기준                                                                       | 산출물                   |
| --------------- | -------------------------------------------------------------------------- | ------------------------ |
| **자동 테스트** | import하여 호출·실행·단언 가능 (순수 함수, 상태 변경, 분기 로직 등)        | `.spec.ts` → TDD         |
| **LLM 검증**    | 자동 테스트는 불가하지만 LLM이 코드 읽기·명령 실행·설정 확인으로 검증 가능 | `.verify.md` → 즉시 수행 |
| **수동 검증**   | 실제 하드웨어·물리적 UI 조작 등 LLM이 절대 수행할 수 없는 항목             | `.spec.md` → 문서화      |

하나의 Scenario에서 3종류가 모두 나올 수 있다. 각 분류에 해당하는 항목이 없으면 해당 파일은 생성하지 않는다.

#### LLM 검증 문서 (.verify.md)

자동 테스트(`.spec.ts`)로는 검증할 수 없지만, LLM이 코드 읽기·명령 실행·설정 확인 등으로 직접 검증할 수 있는 항목을 다룬다.
콜백 등록 코드의 정확성, 설정 파일 값, 에러 핸들링 경로 존재 여부, 타입 정합성 등이 해당한다.

`.verify.md`는 `.spec.ts`와 동급의 테스트 산출물이다. 본 문서에서 "테스트 실행"은 `.spec.ts` 실행과 `.verify.md` 검증을 모두 포함한다.

**수행 절차:**
1. 검증 항목 중 "LLM 검증" 분류 항목을 `.verify.md`에 체크리스트로 작성한다.
2. 각 항목을 순회하며 검증을 수행한다 — 코드를 읽고, 명령을 실행하고, 결과를 확인한다.
3. 검증 결과를 체크리스트에 기록한다 — 통과하면 `[x]`, 문제 발견 시 `[!]`와 함께 내용을 기록하고 코드를 수정한다.

```markdown
# {Scenario 제목} — LLM 검증

## 검증 항목

- [x] {항목}: {수행한 검증 내용과 결과}
- [x] {항목}: {수행한 검증 내용과 결과}
- [!] {항목}: {발견된 문제} → {수정 내용}
```

#### 수동 테스트 문서 (.spec.md)

실제 하드웨어 연결, 물리적 UI 조작 등 LLM이 절대 수행할 수 없는 항목만 포함한다.

```markdown
# {Scenario 제목} — 수동 검증

## 전제 조건

- {테스트 전 필요한 상태/환경}

## 수행 절차

1. {사용자가 수행할 단계}
2. ...

## 기대 결과

- {관찰되어야 하는 결과}
```

### 테스트 파일 네이밍 및 배치

- **CRITICAL: Slice/Scenario 번호를 파일명에 사용하지 않는다** — `3.1-bootstrap.spec.ts` (X), `bootstrap.spec.ts` (O)
- 파일명은 테스트 대상 모듈/클래스/함수 이름을 기반으로 한다
- 기존 테스트 디렉토리 구조를 따른다 — 프로젝트에 `tests/` 디렉토리가 있으면 그 하위에 소스 구조를 미러링한다 (예: `packages/{pkg}/tests/{category}/{대상}.spec.ts`)
- 기존 테스트가 없거나 테스트 구성 지침이 없으면, 같은 모노레포의 다른 패키지 테스트 구조를 참고한다. 그마저도 없으면 `.claude/skills/sd-tdd/references/test-setup.md`를 참고한다
- Acceptance Test: `{대상}.acc.spec.ts`, Unit Test: `{대상}.spec.ts`

## Step 1: Feature 문서 읽기 + 코드베이스 탐색

### 1-1. Feature 문서 읽기

Feature 문서 경로가 필수이다. 입력되지 않았거나 대화로 유추할 수 없다면 `/sd-plan`을 안내하고 종료한다.

Feature 문서의 `## 참조 자료` 섹션 및 그 하위섹션을 반드시 함께 읽는다.

- wbs.md의 참조 자료 섹션도 모두 읽는다. 참조 자료의 구체적 정보(업무 규칙, 데이터 형식, 기술 제약 등)를 구현에 반영한다.

### 1-2. 코드베이스 탐색

**코드가 source of truth이다.** 문서가 아닌 실제 코드를 기준으로 파악한다.

- 관련 엔티티/모델 구조
- 기존 API 엔드포인트 및 패턴
- 사용 중인 프레임워크와 아키텍처 패턴
- 기존 시스템 연동 방식
- 성능/보안 제약
- 관련 테스트 구조
- 관련 의존성과 설정

### 1-3. 문서 정합성 확인

요구명세의 각 Scenario에서 참조하는 기능·메서드를 구현계획과 대조한다.
`.claude/references/sd-clarify.md`를 읽고 누락된 기능등 불명확한 부분을 명확화한다.

## Step 2: Double Loop TDD

구현계획의 Slice 순서대로 진행한다. 각 Slice 내에서 Scenario를 하나씩 처리한다.
각 Scenario 시작 시 **테스트 분류 기준**에 따라 검증 항목을 분류한다.
테스트 실행 명령은 CLAUDE.md를 참조한다.

### 2-1. Acceptance Test 작성 (Red)

**CRITICAL: 프로젝트에 이미 존재하는 기존 테스트부터 점검하고 선수정한다.**

Gherkin Scenario의 Given/When/Then을 프로젝트 테스트 프레임워크의 Acceptance Test로 변환한다.

- Scenario 하나를 하나의 test 함수로 변환하되, Scenario 내 여러 When/Then이 있으면 하나의 test 함수 안에서 순차 검증한다(통합 수준).
- 테스트를 실행하여 실패(Red)를 확인한다.

**CRITICAL: 테스트는 대상 코드를 import하여 실제로 호출·실행해야 한다.**

- 소스 파일을 `readFileSync`로 읽어 문자열 포함 여부(`toContain`/`toMatch`)만 확인하는 것은 테스트가 아니다.
- 프레임워크 의존성(Angular TestBed, playwright 등)이 필요하면 세팅한다.

### 2-2. Inner Loop: Unit TDD (Red-Green-Refactor)

Acceptance Test를 통과시키기 위해 **반드시 Unit Test를 먼저 작성한다**

- Acceptance Test가 통합 수준(Scenario 전체 흐름)이면, Unit Test는 각 개별 메서드/동작을 별도 test로 분리한다
- **단일 메서드 호출이더라도 Inner Loop를 생략하지 않는다** — Acceptance Test에 없는 추가 케이스(경계값, 에러, 빈 입력 등)를 최소 1개 작성한다

#### 절차

1. **Unit Test 작성 (Red)** — Acceptance Test와 별개의 도구 호출(Write/Edit)로 작성한다
2. **최소 구현 (Green)** — Unit Test를 통과시키는 최소한의 코드를 작성한다
3. **Refactor**
   - 방금 작성한 코드 범위에서 중복 제거, 하드코딩 제거(Fake It → 실제 구현), 네이밍 개선, Extract Variable/Method.
   - 모듈·아키텍처 수준 정리는 여기서 하지 않는다 — 그것은 `Outer Loop Refactor`의 영역이다.

Acceptance Test가 성공할때 까지 반복한다.

### 2-3. Outer Loop Refactor

Scenario 단위의 설계 개선.

#### 제약 규칙

- **한 번에 하나의 리팩토링만**
- **매 리팩토링 후 테스트 실행**
- **기능 추가 금지 (Two Hats)**
- **이번 Scenario에 필요한 만큼만**
- **Rule of Three**

#### Code Smell → 리팩토링 기법

| Code Smell                                          | 리팩토링 기법                 |
| --------------------------------------------------- | ----------------------------- |
| Long Method / 복잡한 분기                           | Extract Method                |
| 하나의 클래스가 여러 책임 (SRP 위반)                | Extract Class                 |
| 다른 클래스의 데이터를 과도하게 사용 (Feature Envy) | Move Method                   |
| 중복 코드 (3회 이상 반복)                           | Extract Method 후 공유        |
| Primitive Obsession                                 | Replace Primitive with Object |
| 네이밍이 의도를 드러내지 않음                       | Rename                        |

## Step 3: Feature 완료

모든 Slice가 완료되면:

### 3-1. 최종 테스트 정리

Feature 전체의 테스트 코드를 "지속적 회귀 테스트로 남길 가치가 있는가?" 관점에서 정리한다. 여기서 Feature 전체를 보고 가치 판단을 수행한다.

- **중복 Unit Test 삭제** — `test`/`it` 단위로 판단한다. Acceptance Test와 검증 대상·입력값이 동일한 개별 테스트 케이스만 삭제한다(파일 단위 삭제 금지). Scenario 간 중복 포함
- **구현 결합 테스트 전환/삭제** — 내부 상태 값, 메서드 호출 횟수 등 구현 세부사항을 검증하는 테스트
- **공통 setup 추출** — 중복되는 arrange 코드를 헬퍼/beforeEach로
- **테스트 네이밍 개선** — 검증하는 동작을 문장처럼 읽히게

정리 후 전체 테스트를 실행하여 회귀가 없는지 확인한다.

### 3-2. Feature/WBS 갱신

Feature 문서 `## 구현계획`에서 해당 Slice의 체크박스를 `[x]`로 갱신한다.
WBS 파일(`wbs.md`)에서 해당 Feature의 `[ ]`를 `[x]`로 갱신한다.