# 검증 도구 4종 — Phase 4 적용 가이드

Phase 4에서 ACH 매트릭스 갱신을 위한 판별 실험을 선택할 때 사용한다. 각 도구는 가설을 *반증* 하기 위한 실험을 설계하는 방법론이다.

## 도구 선택 결정 트리

```
스택 트레이스가 있는가?
├ Yes → 역추적 (Backward Reasoning)
└ No  → 잘못된 값이 출력되는가?
        ├ Yes → 데이터 흐름 추적 (Data Flow Tracing)
        └ No  → "이전엔 됐는데 안 됨"인가?
                ├ Yes → 변경 이력 분석 (Change History Analysis)
                └ No  → 제약 조건 추론 (Constraint-based Reasoning)
```

여러 도구를 조합 가능 (예: 변경 이력 분석으로 회귀 커밋 좁힘 → 역추적으로 발현 지점 분석).

## 1. 역추적 (Backward Reasoning)

문제 발현 지점에서 출발하여 원인 방향으로 거슬러 올라간다.

### 적용 조건

- 스택 트레이스가 있을 때
- 문제 발현 지점이 명확할 때 (특정 함수 / 특정 라인)
- TypeError, NullPointerException 같은 *지점이 명확한* 에러

### 절차

1. 문제 발생 지점의 변수 상태 확인 (스택 트레이스 또는 디버거)
2. 해당 변수의 마지막 할당(definition) 위치 추적
3. 잘못된 값이 최초로 유입된 지점까지 반복

### 적용 예시

```
TypeError: Cannot read properties of undefined (reading 'map')
  at getUserRoleNames (src/utils.ts:7)

→ Step 1: src/utils.ts:7 → u.roles가 undefined
→ Step 2: u는 어디서? → users 배열의 element
→ Step 3: users는 어디서? → src/app.ts에서 정의
→ Step 4: src/app.ts → { name: "Bob" } 항목에 roles 누락
→ ROOT: User 인터페이스가 roles?: string[]로 옵셔널이라 누락 허용
```

### ACH 등록

각 단계의 관찰을 증거로 등록. 가설(예: "u.roles가 undefined인 항목이 있다")의 C(code)로 표시.

## 2. 데이터 흐름 추적 (Data Flow Tracing)

데이터의 생명주기를 따라가며 불일치 지점을 찾는다.

### 적용 조건

- 잘못된 값이 출력되거나 기대와 다른 결과가 나올 때
- 입력은 정상이지만 중간 처리에서 깨지는 경우
- 스택 트레이스 없이 동작 이상만 있는 경우

### 절차

1. Input 지점 식별 (API 요청, DB 읽기, 사용자 입력 등)
2. Transform 체인을 순서대로 나열 (함수 호출, 매핑, 직렬화 등)
3. 각 단계의 기대값 vs 실제값 비교
4. 최초 불일치 지점 = 버그 위치

### 적용 예시

```
Input: ages = [2, 10, 1]
Transform 1: items.sort((a, b) => String(a.age).localeCompare(String(b.age)))
  기대: [1, 2, 10]
  실제: [1, 10, 2]  ← 첫 불일치
ROOT: localeCompare가 문자열 사전식 비교 ("10" < "2")
```

### 도구

- `console.log` (LLM은 실행 환경 없으면 코드 트레이스로 시뮬레이션)
- 디버거 step-through (사용자 환경)
- assertion 삽입 (각 단계의 기대값 명시)

## 3. 변경 이력 분석 (Change History Analysis)

최근 변경과 버그의 상관관계를 분석한다. 회귀 의심 시 가장 효과적.

### 적용 조건

- "이전엔 됐는데 안 됨"
- 회귀가 의심될 때
- 의존성 업데이트 후 발생

### 절차

1. 버그 발생 시점 전후의 코드 변경 조회
   - `git log --since="<발생 직전>" --until="<발생 직후>"`
   - `git log -p <관련 파일>`
2. 에러 관련 파일과 변경된 파일의 교집합 분석
3. 변경 내용의 의미적 분석 (리팩토링 vs 로직 변경 vs API 계약 변경)
4. 회귀 도입 커밋 의심 시 `git bisect`로 자동 좁히기

### 적용 예시

```bash
# 1. 최근 변경 확인
git log --oneline -20 src/utils.ts

# 2. 의심 커밋 시점 비교
git diff <suspected-commit>^ <suspected-commit> -- src/utils.ts

# 3. 자동 좁힘
git bisect start
git bisect bad HEAD
git bisect good <known-good>
git bisect run pnpm test
```

### ACH 등록

회귀 도입 커밋이 식별되면 해당 커밋이 도입한 변경을 가설의 C(code)로 등록.

## 4. 제약 조건 추론 (Constraint-based Reasoning)

발생/비발생 조건을 체계적으로 좁혀간다. 간헐 발생(L4) 또는 특정 환경 의존(L2/L3) 케이스에 효과적.

### 적용 조건

- 간헐적 발생
- 특정 환경/입력에서만 발생
- 명확한 트리거가 보이지 않을 때

### 절차

1. 발생 조건 수집: 어떤 입력/환경/순서에서 발생하는가?
2. 비발생 조건 수집: 어떤 경우 발생하지 않는가?
3. 차이 분석: 발생/비발생 조건의 차이가 원인을 가리킴
4. 차이 항목을 단일화하여 검증 (one-variable-at-a-time)

### 적용 예시

```
발생 조건:
- Chrome 90 + Windows
- 사용자 > 100명 동시 접속
- 트랜잭션 내 5회 이상 쿼리

비발생 조건:
- Chrome 90 + macOS
- 사용자 < 50명
- 트랜잭션 내 1~3회 쿼리

차이: OS, 사용자 수, 쿼리 수
→ 단일 변경: macOS에서 동시 100명 + 5쿼리 → 발생 → OS 영향 배제
→ 단일 변경: Windows에서 동시 50명 + 5쿼리 → 비발생 → 사용자 수 영향
ROOT: 동시 접속 수 + 쿼리 수의 곱이 임계 초과 시 발생 → 커넥션 풀 고갈
```

### ACH 등록

각 검증 결과를 증거로 등록. 가설(예: "커넥션 풀 고갈")의 C(code) 또는 I로 표시.

## 도구 결합 패턴

### 패턴 A: 회귀 + 발현 지점

1. 변경 이력 분석으로 회귀 커밋 좁힘
2. 역추적으로 발현 지점에서 회귀 커밋의 변경 확인
3. ACH에 두 단계 모두 증거 등록

### 패턴 B: 간헐 발생

1. 제약 조건 추론으로 발생 조건 좁힘
2. 데이터 흐름 추적으로 발생 조건에서 데이터 흐름 분석
3. ACH에 두 단계 모두 증거 등록

### 패턴 C: 외부 의존 의심

1. 변경 이력 분석으로 의존성 버전 변경 확인
2. 외부 라이브러리 changelog/이슈 검색 (`gh search issues`, `WebSearch`)
3. C(doc) 등급으로 ACH 등록 (C(infer) 단독 금지)

## Falsification First

각 도구를 적용하기 전에 다음을 명시한다.

> "이 실험으로 어떤 가설이 *반증* 될 수 있는가?"

가설을 입증하려는 실험은 confirmation bias에 빠지기 쉽다. 반증 가능한 실험을 우선 선택.

## minimally-invasive probe

검증 시 사용자 코드를 수정하지 않는다. 다음 도구만 사용:

- 코드 *읽기* (Read, Grep)
- 실행 *결과* 관찰 (Bash로 테스트 실행)
- assertion / print 삽입은 *지시* 로만 (실제 코드 수정 금지, 사용자가 수행)

## one-variable-at-a-time

여러 변수를 동시에 변경하면 인과 식별이 깨진다. 항상 한 번에 한 변수만 변경.

위반 예: "버전 업그레이드 + 설정 변경 + 코드 리팩토링을 동시에 적용 → 어느 것이 원인인지 식별 불가"
