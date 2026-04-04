# 디버그: foreignKeyTarget().description() 체이닝 시 양방향 관계에서 TS7022 발생

## 출처

- **origin:** `kslhunter/simplysm#15`
- **완료 시 참고:** 수정 완료 후 해당 이슈의 close 및 comment가 필요할 수 있다.

## 에러 증상

- **에러 메시지:** `TS7022: 'User' implicitly has type 'any' because it does not have a type annotation and is referenced directly or indirectly in its own initializer.`
- **위치:** `User.ts:5:14`, `Post.ts:4:14`
- **재현:** 3개 이상 테이블이 다중 경로로 순환 참조하는 상태에서 `foreignKeyTarget().description()` 또는 `foreignKeyTarget().single()` 체이닝 시 발생

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | E1: 3테이블+.description()→TS7022 | E2: .description()제거→정상 | E3: .single()→동일에러 | E4: 2테이블+.description()→정상 | E5: options파라미터→정상 | E6: foreignKey().description()→정상 |
|----|-----|-----|-----|-----|-----|------|
| H1: Target 빌더 체이닝이 제네릭 타입 조기 평가 강제 | C(code) | C(code) | C(code) | C(code) | C(code) | C(code) |
| H2: TypeScript 컴파일러 버그 | C(infer) | N | N | I -> 폐기 | N | I -> 폐기 |
| H3: $inferSelect 재귀 타입 원인 | C(infer) | I -> 폐기 | N | I -> 폐기 | N | N |

### 결과: 확정 -- H1

`ForeignKeyTargetBuilder` / `RelationKeyTargetBuilder`의 `.description()` / `.single()` 메서드 체이닝이 TypeScript의 제네릭 타입 파라미터(`TTargetTableFn`) 조기 평가를 강제한다.

### 메커니즘

1. `foreignKeyTarget(() => Post, "user")` 단독 -> TypeScript가 `() => typeof Post`를 **지연 평가**로 처리
2. `.description()` / `.single()` 체이닝 -> TypeScript가 메서드를 찾기 위해 빌더를 **즉시 인스턴스화** -> `TTargetTableFn` 평가 강제 -> 순환!
3. 단순 순환(2테이블)에서는 TS의 cycle budget이 충분하지만, 다중 경로 순환(3테이블+)에서는 초과

### Target 빌더만 영향받는 이유

| Builder | 제네릭 파라미터 | 체이닝 시 TS7022 |
|---|---|---|
| ForeignKeyBuilder<**TOwner**, TTargetFn> | `TOwner`가 self-reference | 정상 |
| ForeignKeyTargetBuilder<**TTargetTableFn**, TIsSingle> | self-reference 없음, 대상 테이블만 참조 | **에러** |
| RelationKeyBuilder<**TOwner**, TTargetFn> | `TOwner`가 self-reference | 정상 |
| RelationKeyTargetBuilder<**TTargetTableFn**, TIsSingle> | self-reference 없음, 대상 테이블만 참조 | **에러** |

`TOwner` self-reference가 있는 빌더는 TypeScript가 자기 참조를 인식하여 지연 처리하지만, Target 빌더는 이 메커니즘이 없어서 체이닝 시 대상 테이블의 즉시 평가가 강제된다.

## 해결 방안

### 방안 A: options 파라미터 추가 (비파괴적)

- **설명:** Target 빌더에 options 파라미터 추가, 기존 체이닝 유지
- **장점:** 기존 API 호환성 유지
- **반론:** 두 가지 방식 공존으로 혼란, 체이닝 사용 시 여전히 TS7022 노출
- **점수:** 안정성 9, 근본성 7, 일관성 6 -> **평균 7.3/10**

### 방안 B-1: Target 빌더만 options로 대체 (파괴적, 선택됨)

- **설명:** `ForeignKeyTargetBuilder` / `RelationKeyTargetBuilder`에서 `.description()` / `.single()` 제거, `foreignKeyTarget()` / `relationKeyTarget()`의 3번째 파라미터로 options 제공
- **장점:** 문제 원인 완전 제거. `single()`도 Target 전용이므로 "Target = options, 나머지 = 체이닝"으로 일관된 분리
- **반론:** 기존 체이닝 코드 breaking change
- **점수:** 안정성 10, 근본성 10, 일관성 8 -> **평균 9.3/10**

### 방안 B-2: 4개 빌더 모두 options로 통일

- **설명:** 모든 빌더의 `.description()` 제거, 각 factory 함수에 options 파라미터 추가
- **장점:** 완전한 일관성
- **반론:** FK/RK는 문제없는데 불필요하게 breaking change
- **점수:** 안정성 10, 근본성 10, 일관성 10 -> **평균 10/10** (하지만 변경 범위 대비 이점 낮음)

### 방안 C: 수행 안 함

- **설명:** README에 한계 문서화
- **장점:** 코드 변경 없음
- **반론:** 버그 방치, 사용자가 직관적 API 사용 시 파악 어려운 에러 반복
- **점수:** 안정성 4, 근본성 2, 일관성 3 -> **평균 3.0/10**

## 선택 결과

**방안 B-1: Target 빌더만 options로 대체** (평균 9.3/10)

사용자 판단: `single()`도 Target 전용이므로, Target 빌더가 다른 API 패턴을 갖는 것이 자연스러움.

### 구현 범위

1. `ForeignKeyTargetBuilder` / `RelationKeyTargetBuilder`에서 `.description()` / `.single()` 메서드 제거
2. `RelationFkFactory.foreignKeyTarget()` / `RelationRkFactory.relationKeyTarget()`에 3번째 파라미터 `opts?: { description?: string; single?: true }` 추가
3. `single: true` 시 반환 타입을 `ForeignKeyTargetBuilder<TTargetTableFn, true>`로 변경 (오버로드 또는 조건부 타입)
4. `createRelationFactory()` 구현 수정: opts를 builder 생성자에 전달
5. 기존 테스트에서 `.description()` / `.single()` 체이닝을 options로 마이그레이션
6. 재현 테스트 추가: 3테이블 순환 참조 + options 사용 시 타입체크 통과 확인
