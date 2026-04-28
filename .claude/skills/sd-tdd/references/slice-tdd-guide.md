# Slice TDD 가이드 (Double Loop TDD)

본 문서는 sd-tdd 메인이 한 Slice를 구현할 때 따르는 룰이다.

Slice는 매핑된 모든 Scenario에 대해 1 → 2 → 3을 완료하면 종료한다.

테스트 실행 명령은 CLAUDE.md를 참조한다.

## 1. 테스트 파일 규칙

- 파일명은 테스트 대상 모듈/클래스/함수 이름을 기반으로 한다
- 기존 테스트 디렉토리 구조를 따른다 — 프로젝트에 `tests/` 디렉토리가 있으면 그 하위에 소스 구조를 미러링한다 (예: `packages/{pkg}/tests/{category}/{대상}.spec.ts`)
- 기존 테스트가 없거나 테스트 구성 지침이 없으면, 같은 모노레포의 다른 패키지 테스트 구조를 참고한다. 그마저도 없으면 `.claude/skills/sd-tdd/references/test-setup.md`를 참고한다
- Acceptance Test: `{대상}.acc.spec.ts`, Unit Test: `{대상}.spec.ts`

## 2. Acceptance Test 작성 (Red)

### Acceptance Test 제약 (CRITICAL)

Acceptance Test는 Slice의 **외부 계약**을 도메인 언어로 검증한다. 아래 제약을 모두 지킨다.

**작성 룰**

1. **도메인 용어만 사용** — Scenario의 Given/When/Then에 등장하는 업무 용어·Public API만 참조. 내부 클래스·private 메서드·파일 경로 등장 금지.
2. **Public 진입점으로만 호출** — 외부에서 실제 호출되는 방식 그대로(API 엔드포인트·서비스 공개 메서드·UI 이벤트 등). 내부 헬퍼 직접 호출 금지.
3. **구현 세부 검증 금지** — 내부 상태 값, 메서드 호출 횟수, private 필드 스냅샷 등 단언 금지. "관찰 가능한 결과"(반환값·외부 영향·공개 상태)만 단언한다.

**생명주기 룰**

4. **삭제·축소 금지** — Inner Loop에서 실패해도 Acceptance Test를 지우거나 단언을 약화시켜 통과시키는 것은 절대 금지(NEVER). 구현을 고치거나, 그대로 시도할 수 없으면 sd-tdd 누적 보고 목록에 기록한다.
5. **리팩토링 불변** — Outer Loop Refactor에서 Acceptance Test는 수정 대상이 아니다. 수정이 필요하면 스펙 변경 신호이므로 sd-tdd 누적 보고 목록에 기록한다.

### 기존 테스트 점검·선수정

새 Acceptance Test를 작성하기 전, 프로젝트에 이미 존재하는 기존 테스트부터 점검하고 선수정한다.

1. 이번 Scenario의 대상 모듈/함수를 import하는 기존 테스트 파일을 검색한다.
2. 각 테스트를 3분류로 판정한다:
   - **스펙 충돌**: 이번 Slice의 검증 명세와 다른 동작을 기대 → 스펙에 맞게 자동 선수정
   - **실제 버그**: 기존 구현의 버그를 미검증 → 이번 Slice 범위 내면 자동 수정, 범위 밖이면 sd-tdd 누적 보고 목록에 기록 (코드는 건드리지 않음)
   - **무관**: 이번 Scenario와 무관한 동작 검증 → 건드리지 않음
3. 선수정이 끝난 뒤 새 Acceptance Test 작성으로 진행한다.

### Gherkin Scenario 변환

Gherkin Scenario의 Given/When/Then을 프로젝트 테스트 프레임워크의 Acceptance Test로 변환한다.

- Scenario 하나를 하나의 test 함수로 변환하되, Scenario 내 여러 When/Then이 있으면 하나의 test 함수 안에서 순차 검증한다(통합 수준).
- 테스트를 실행하여 실패(Red)를 확인한다.

**CRITICAL: 테스트는 대상 코드를 import하여 실제로 호출·실행해야 한다.**

- 소스 파일을 `readFileSync`로 읽어 문자열 포함 여부(`toContain`/`toMatch`)만 확인하는 것은 테스트가 아니다.
- 프레임워크 의존성(Angular TestBed, playwright 등)이 필요하면 세팅한다.

## 3. Inner Loop: Unit TDD (Red-Green-Refactor)

Acceptance Test를 통과시키기 위해 **반드시 Unit Test를 먼저 작성한다**

- Acceptance Test가 통합 수준(Scenario 전체 흐름)이면, Unit Test는 각 개별 메서드/동작을 별도 test로 분리한다
- **단일 메서드 호출이더라도 Inner Loop를 생략하지 않는다** — Acceptance Test에 없는 추가 케이스(경계값, 에러, 빈 입력 등)를 최소 1개 작성한다

### Unit Test 허용 범위 (Acceptance와 비대칭)

Unit Test는 내부 설계를 검증한다. Acceptance와 달리 아래가 허용된다:

- 내부 클래스·private 메서드·내부 헬퍼 직접 import·호출 가능
- 구현 변경에 따라 **수정·삭제·재작성 자유** — 구현이 바뀌면 Unit Test도 따라 바뀐다
- 경계값·에러·빈 입력 등 구현 관점 케이스를 자유롭게 추가
- 내부 상태·호출 횟수 등 구현 세부 단언 가능 (단, 메인의 최종 정리 단계에서 "구현 결합 테스트"로 재검토 대상)

### 절차

1. **Unit Test 작성 (Red)** — Acceptance Test와 역할이 겹치지 않도록, 개별 메서드·경계값·에러 케이스를 별도 테스트로 작성한다
2. **최소 구현 (Green)** — Unit Test를 통과시키는 최소한의 코드를 작성한다
3. **Refactor**
  - 방금 작성한 코드 범위에서 중복 제거, 하드코딩 제거(Fake It → 실제 구현), 네이밍 개선, Extract Variable/Method.
  - 모듈·아키텍처 수준 정리는 여기서 하지 않는다 — 그것은 `Outer Loop Refactor`의 영역이다.

Acceptance Test가 성공할 때까지 반복한다.

## 4. Outer Loop Refactor

Scenario 단위의 설계 개선.

### 제약 규칙

- **한 번에 하나의 리팩토링만**
- **매 리팩토링 후 테스트 실행**
- **기능 추가 금지 (Two Hats)**
- **이번 Scenario에 필요한 만큼만**
- **Rule of Three**

### Code Smell → 리팩토링 기법

| Code Smell                                          | 리팩토링 기법                 |
| --------------------------------------------------- | ----------------------------- |
| Long Method / 복잡한 분기                           | Extract Method                |
| 하나의 클래스가 여러 책임 (SRP 위반)                | Extract Class                 |
| 다른 클래스의 데이터를 과도하게 사용 (Feature Envy) | Move Method                   |
| 중복 코드 (3회 이상 반복)                           | Extract Method 후 공유        |
| Primitive Obsession                                 | Replace Primitive with Object |
| 네이밍이 의도를 드러내지 않음                       | Rename                        |
