---
name: sd-tdd
description: 구현계획(plan) 기반으로 TDD 개발하는 스킬
---

# sd-tdd: TDD 개발

Feature 문서(구현계획)를 기반으로, Double Loop TDD로 코드를 구현한다.

개발 프로세스: WBS 문서 작성 → Feature 문서 작성 → TDD 개발

## 기본 원칙

### 기술적 장벽 처리

설계 결정은 사용자가 확정한 구속력 있는 결정이다. 임의로 변경·축소·제외하는 것은 절대 금지다.

구현 중 그대로 실현할 수 없는 기술적 장벽을 발견하면:

1. 구현을 중단하고, 사용자에게 대안을 제시한다.
2. 사용자의 결정을 Feature 문서의 `### 설계 결정` 섹션에 기록한다.
3. 결정에 맞춰 구현계획을 갱신한 뒤, 갱신된 Feature 문서로 구현을 재개한다.

설계 결정 변경 권한은 사용자에게만 있다. sd-tdd는 설계를 그대로 구현하는 역할이므로, 문서(요구명세·구현계획·설계 결정)를 사용자 결정 없이 독자적으로 변경하지 않는다.

## Step 1: Feature 문서 읽기 + 코드베이스 탐색

### 1-1. Feature 문서 읽기

Feature 문서 경로가 필수이다. 입력되지 않았거나 대화로 유추할 수 없다면 `$sd-plan`을 안내하고 종료한다.

Feature 문서 및 WBS 문서의 `## 참조 자료` 섹션 및 그 하위섹션을 반드시 함께 읽는다.

- wbs.md의 참조 자료 섹션도 모두 읽는다. 참조 자료의 구체적 정보(업무 규칙, 데이터 형식, 기술 제약 등)를 구현에 반영한다.

### 1-2. 기준 코드 탐색·확인

**CRITICAL: 코드가 source of truth이다.** 문서가 아닌 실제 코드를 기준으로 파악하며, 탐색 없이 코드 작성으로 넘어가지 않는다.

#### (a) Feature 문서의 `## 기준 코드` 섹션 활용

- `## 기준 코드` 섹션이 있으면, 인용된 **모든 파일을 직접 읽는다**. 요약만 보고 넘어가지 않는다.
- 인용 라인 주변 컨텍스트(±20줄 권장)를 함께 읽어 패턴의 전체 형태를 파악한다.

#### (b) 섹션이 없거나 부실할 때 — 직접 탐색

- 코드베이스에서 이 Feature와 가장 유사한 기존 기능을 찾는다.
- 탐색 대상: 관련 엔티티/모델, 기존 API 엔드포인트 및 패턴, 사용 중인 프레임워크·아키텍처, 기존 시스템 연동 방식, 성능/보안 제약, 관련 테스트 구조, 관련 의존성과 설정.
- 발견한 항목을 `파일경로:라인번호` 인용과 함께 작업 메모로 정리한다. 인용 없는 항목은 신뢰하지 않는다.

#### (c) 패턴 메모 정리

다음 관점에서 이번 Feature 구현 시 따를 패턴을 명시적으로 적어둔다:

- 네이밍 규칙 (파일·클래스·함수·변수)
- 디렉토리 구조 / 파일 배치
- 에러 처리·검증 방식
- 의존성 주입·import 패턴
- 테스트 구조·헬퍼 사용 패턴
- **UI 구조·레이아웃 / 컴포넌트 구성·생김새** (HTML 골격, CSS 클래스 네이밍, 컨트롤 배치, 반응형/스타일 토큰 사용 패턴 등)

이 메모는 Step 2 구현 시 매번 참조한다.

### 1-3. 문서 정합성 확인

요구명세의 각 Scenario에서 참조하는 기능·메서드를 구현계획과 대조한다. 다음과 같은 불명확한 부분이 있으면 `$sd-inner-clarify` 스킬을 호출하여 명확화한다:

- Scenario가 참조하는 메서드/기능이 구현계획의 Slice에 등장하지 않음
- 요구명세의 용어와 구현계획의 용어가 서로 다름 (동일 개념을 다른 이름으로 지칭)
- Scenario의 단언 대상(에러 메시지·상태값·반환 형식 등)이 구현계획에 구체화되지 않음

## Step 2: Double Loop TDD

구현계획의 Slice 순서대로 진행한다. 각 Slice 내에서 Scenario를 하나씩 처리한다.
테스트 실행 명령은 AGENTS.md를 참조한다.

### 2-0. 테스트 파일 규칙

- 파일명은 테스트 대상 모듈/클래스/함수 이름을 기반으로 한다
- 기존 테스트 디렉토리 구조를 따른다 — 프로젝트에 `tests/` 디렉토리가 있으면 그 하위에 소스 구조를 미러링한다 (예: `packages/{pkg}/tests/{category}/{대상}.spec.ts`)
- 기존 테스트가 없거나 테스트 구성 지침이 없으면, 같은 모노레포의 다른 패키지 테스트 구조를 참고한다. 그마저도 없으면 `.codex/skills/sd-tdd/references/test-setup.md`를 참고한다
- Acceptance Test: `{대상}.acc.spec.ts`, Unit Test: `{대상}.spec.ts`

### 2-1. Acceptance Test 작성 (Red)

#### Acceptance Test 제약 (CRITICAL)

Acceptance Test는 Feature의 **외부 계약**을 도메인 언어로 검증한다. 아래 제약을 모두 지킨다.

**작성 룰**

1. **도메인 용어만 사용** — Scenario의 Given/When/Then에 등장하는 업무 용어·Public API만 참조. 내부 클래스·private 메서드·파일 경로 등장 금지.
2. **Public 진입점으로만 호출** — 외부에서 실제 호출되는 방식 그대로(API 엔드포인트·서비스 공개 메서드·UI 이벤트 등). 내부 헬퍼 직접 호출 금지.
3. **구현 세부 검증 금지** — 내부 상태 값, 메서드 호출 횟수, private 필드 스냅샷 등 단언 금지. "관찰 가능한 결과"(반환값·외부 영향·공개 상태)만 단언한다.

**생명주기 룰**

4. **삭제·축소 금지** — Inner Loop에서 실패해도 Acceptance Test를 지우거나 단언을 약화시켜 통과시키는 것은 절대 금지(NEVER). 구현을 고치거나, 설계 장벽이면 `기술적 장벽 처리`에 따라 에스컬레이션한다.
5. **리팩토링 불변** — Outer Loop Refactor에서 Acceptance Test는 수정 대상이 아니다. 수정이 필요하면 스펙 변경 신호이므로 중단하고 사용자에게 보고한다.

(스펙 자체가 변경된 경우에만 Feature 문서 갱신 후 Acceptance Test 수정 가능)

#### 기존 테스트 점검·선수정

**새 Acceptance Test를 작성하기 전, 프로젝트에 이미 존재하는 기존 테스트부터 점검하고 선수정한다.**

1. 이번 Scenario의 대상 모듈/함수를 import하는 기존 테스트 파일을 검색한다.
2. 각 테스트를 3분류로 판정한다:
   - **스펙 충돌**: 이번 Feature의 요구명세와 다른 동작을 기대 → 스펙에 맞게 선수정
   - **실제 버그**: 기존 구현의 버그를 미검증 → 이번 Feature 범위 내면 수정, 범위 밖이면 사용자에게 보고 후 판단
   - **무관**: 이번 Scenario와 무관한 동작 검증 → 건드리지 않음
3. 판단이 모호하면 `$sd-inner-clarify`로 명확화한다.
4. 선수정이 끝난 뒤 새 Acceptance Test 작성으로 진행한다.

#### Gherkin Scenario 변환

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

#### Unit Test 허용 범위 (Acceptance와 비대칭)

Unit Test는 내부 설계를 검증한다. Acceptance와 달리 아래가 허용된다:

- 내부 클래스·private 메서드·내부 헬퍼 직접 import·호출 가능
- 구현 변경에 따라 **수정·삭제·재작성 자유** — 구현이 바뀌면 Unit Test도 따라 바뀐다
- 경계값·에러·빈 입력 등 구현 관점 케이스를 자유롭게 추가
- 내부 상태·호출 횟수 등 구현 세부 단언 가능 (단, Step 3-1 정리에서 "구현 결합 테스트"로 재검토 대상)

#### 절차

1. **Unit Test 작성 (Red)** — Acceptance Test와 역할이 겹치지 않도록, 개별 메서드·경계값·에러 케이스를 별도 테스트로 작성한다
2. **최소 구현 (Green)** — Unit Test를 통과시키는 최소한의 코드를 작성한다
3. **Refactor**
  - 방금 작성한 코드 범위에서 중복 제거, 하드코딩 제거(Fake It → 실제 구현), 네이밍 개선, Extract Variable/Method.
  - 모듈·아키텍처 수준 정리는 여기서 하지 않는다 — 그것은 `Outer Loop Refactor`의 영역이다.

Acceptance Test가 성공할 때까지 반복한다.

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
