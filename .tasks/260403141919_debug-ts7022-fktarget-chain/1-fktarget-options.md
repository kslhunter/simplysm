# Feature 1 Target 빌더 체이닝 → options 파라미터 전환

## 참조 자료

- [debug.md](./debug.md) — 근본 원인 분석 (TS7022)
- GitHub 이슈: kslhunter/simplysm#15

### 대상 파일

- `packages/orm-common/src/schema/factory/relation-builder.ts` — ForeignKeyTargetBuilder, RelationKeyTargetBuilder, RelationFkFactory, RelationRkFactory, createRelationFactory
- `packages/orm-common/src/schema/table-builder.ts` — TableBuilder.relations() (간접 영향)
- `packages/orm-common/src/schema/view-builder.ts` — ViewBuilder.relations() (간접 영향)
- `packages/orm-common/tests/setup/models/` — 테스트 모델 (체이닝 사용처 0건이므로 변경 불필요)

### 현재 API 사용 현황

- `ForeignKeyTargetBuilder.description()` / `.single()` 체이닝: 코드베이스 내 사용처 **0건** (JSDoc 예시만 존재)
- `RelationKeyTargetBuilder.description()` / `.single()` 체이닝: 코드베이스 내 사용처 **0건**
- `.meta.isSingle`: `src/exec/queryable.ts:848`에서만 접근
- `.meta.description`: 외부 접근 코드 없음

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | 변경 범위 | Target 빌더(FKTarget, RKTarget)만 변경 | FK/RK의 .description()은 TS7022 미발생. single()도 Target 전용이므로 Target만 다른 API가 자연스러움 |
| D2 | 기존 체이닝 메서드 처리 | 제거 | 체이닝이 TS7022의 근본 원인. 코드베이스 사용처 0건이므로 영향 없음 |
| D3 | single 옵션 타입 분기 방식 | 오버로드 2개 | `single: true` → `<TTargetTableFn, true>`, 그 외 → `<TTargetTableFn, false>`. 조건부 타입보다 명확 |

## 요구명세

```gherkin
Feature: 1 Target 빌더 체이닝을 options 파라미터로 전환

  Background:
    Given orm-common 패키지의 relation-builder 모듈이 있다

  Rule: foreignKeyTarget()에 options 파라미터를 지원한다

    Scenario: description을 options로 설정한다
      When foreignKeyTarget(() => Post, "user", { description: "게시글" })을 호출한다
      Then ForeignKeyTargetBuilder의 meta.description이 "게시글"이다

    Scenario: single을 options로 설정한다
      When foreignKeyTarget(() => Post, "user", { single: true })를 호출한다
      Then ForeignKeyTargetBuilder의 meta.isSingle이 true이다
      And 반환 타입이 ForeignKeyTargetBuilder<TTargetTableFn, true>이다

    Scenario: description과 single을 동시에 설정한다
      When foreignKeyTarget(() => Post, "user", { description: "프로필", single: true })를 호출한다
      Then meta.description이 "프로필"이다
      And meta.isSingle이 true이다

    Scenario: options를 생략한다
      When foreignKeyTarget(() => Post, "user")를 호출한다
      Then meta.description이 undefined이다
      And meta.isSingle이 undefined이다
      And 반환 타입이 ForeignKeyTargetBuilder<TTargetTableFn, false>이다

  Rule: relationKeyTarget()에 options 파라미터를 지원한다

    Scenario: description을 options로 설정한다
      When relationKeyTarget(() => Post, "user", { description: "게시글" })을 호출한다
      Then RelationKeyTargetBuilder의 meta.description이 "게시글"이다

    Scenario: single을 options로 설정한다
      When relationKeyTarget(() => Post, "user", { single: true })를 호출한다
      Then RelationKeyTargetBuilder의 meta.isSingle이 true이다
      And 반환 타입이 RelationKeyTargetBuilder<TTargetTableFn, true>이다

    Scenario: options를 생략한다
      When relationKeyTarget(() => Post, "user")를 호출한다
      Then 기존과 동일하게 동작한다

  Rule: Target 빌더에서 체이닝 메서드를 제거한다

    Scenario: ForeignKeyTargetBuilder에서 description() 메서드가 없다
      Given ForeignKeyTargetBuilder 인스턴스가 있다
      Then .description() 메서드가 존재하지 않는다

    Scenario: ForeignKeyTargetBuilder에서 single() 메서드가 없다
      Given ForeignKeyTargetBuilder 인스턴스가 있다
      Then .single() 메서드가 존재하지 않는다

    Scenario: RelationKeyTargetBuilder에서 description()과 single() 메서드가 없다
      Given RelationKeyTargetBuilder 인스턴스가 있다
      Then .description()과 .single() 메서드가 존재하지 않는다

  Rule: 복합 순환 참조에서 TS7022가 발생하지 않는다

    Scenario: 3테이블 다중 경로 순환 + description option
      Given User, Post, Company 3개 테이블이 다중 경로로 순환 참조한다
      And User.relations에 foreignKeyTarget(() => Post, "user", { description: "게시글목록" })이 있다
      When TypeScript 타입체크를 실행한다
      Then TS7022 에러가 발생하지 않는다

    Scenario: 3테이블 다중 경로 순환 + single option
      Given User, Post, Company 3개 테이블이 다중 경로로 순환 참조한다
      And User.relations에 foreignKeyTarget(() => Post, "user", { single: true })이 있다
      When TypeScript 타입체크를 실행한다
      Then TS7022 에러가 발생하지 않는다
```

## 구현계획

### 배경

`ForeignKeyTargetBuilder` / `RelationKeyTargetBuilder`의 `.description()` / `.single()` 메서드 체이닝이 TypeScript의 제네릭 타입 파라미터 조기 평가를 강제하여, 복합 순환 참조에서 TS7022 발생. factory 함수의 options 파라미터로 전환하면 메서드 체이닝이 제거되어 문제가 해결된다.

### 목표

- `foreignKeyTarget()` / `relationKeyTarget()`의 3번째 파라미터로 `{ description?, single? }` 지원
- `ForeignKeyTargetBuilder` / `RelationKeyTargetBuilder`에서 `.description()` / `.single()` 메서드 제거
- 복합 순환 참조에서 TS7022 미발생 검증

### 비목표

- `ForeignKeyBuilder` / `RelationKeyBuilder`의 `.description()` 변경 (이 빌더들은 TS7022 미발생)
- `TableBuilder.description()` 등 다른 description() 메서드 변경

### 설계

#### 타입 오버로드 (foreignKeyTarget)

```typescript
foreignKeyTarget<TTargetTableFn extends () => TableBuilder<any, any>>(
  targetTableFn: TTargetTableFn,
  relationName: string,
  opts: { single: true; description?: string },
): ForeignKeyTargetBuilder<TTargetTableFn, true>;

foreignKeyTarget<TTargetTableFn extends () => TableBuilder<any, any>>(
  targetTableFn: TTargetTableFn,
  relationName: string,
  opts?: { single?: false; description?: string },
): ForeignKeyTargetBuilder<TTargetTableFn, false>;
```

#### 타입 오버로드 (relationKeyTarget)

```typescript
relationKeyTarget<TTargetTableFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>>(
  targetTableFn: TTargetTableFn,
  relationName: string,
  opts: { single: true; description?: string },
): RelationKeyTargetBuilder<TTargetTableFn, true>;

relationKeyTarget<TTargetTableFn extends () => TableBuilder<any, any> | ViewBuilder<any, any, any>>(
  targetTableFn: TTargetTableFn,
  relationName: string,
  opts?: { single?: false; description?: string },
): RelationKeyTargetBuilder<TTargetTableFn, false>;
```

#### createRelationFactory 구현 변경

```typescript
foreignKeyTarget(targetTableFn, relationName, opts?) {
  return new ForeignKeyTargetBuilder({
    targetTableFn,
    relationName,
    description: opts?.description,
    isSingle: opts?.single,
  });
}
```

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| 오버로드 2개 | 채택 | single 여부에 따라 반환 타입 명확 분기 |
| 조건부 타입 (`TOpts extends { single: true } ? true : false`) | 미채택 | TypeScript가 리터럴 타입 추론을 놓칠 수 있어 오버로드보다 불안정 |
| this 반환 타입 | 미채택 | debug에서 테스트 실패 (TS7022 미해결) |
| 체이닝 유지 + options 병행 | 미채택 | 체이닝이 남아있으면 사용자가 여전히 TS7022에 노출됨 |

### Vertical Slices

- [x] #### Slice 1: 타입 시그니처 + 빌더 클래스 + 런타임 구현
  - **구현 내용:** factory 타입에 opts 오버로드 추가, Target 빌더에서 `.description()`/`.single()` 제거, `createRelationFactory()` 구현에서 opts 전달
  - **호출 그래프:**
    ```mermaid
    flowchart TD
      TB["TableBuilder.relations(fn)"] --> CRF["createRelationFactory()"]
      VB["ViewBuilder.relations(fn)"] --> CRF
      CRF --> FKT["foreignKeyTarget(targetTableFn, relationName, opts?)"]
      CRF --> RKT["relationKeyTarget(targetTableFn, relationName, opts?)"]
      FKT --> FKTB["new ForeignKeyTargetBuilder(meta)"]
      RKT --> RKTB["new RelationKeyTargetBuilder(meta)"]
    ```
  - **Scenarios:**
    - Scenario: description을 options로 설정한다 (FK)
    - Scenario: single을 options로 설정한다 (FK)
    - Scenario: description과 single을 동시에 설정한다 (FK)
    - Scenario: options를 생략한다 (FK)
    - Scenario: description을 options로 설정한다 (RK)
    - Scenario: single을 options로 설정한다 (RK)
    - Scenario: options를 생략한다 (RK)
    - Scenario: ForeignKeyTargetBuilder에서 description() 메서드가 없다
    - Scenario: ForeignKeyTargetBuilder에서 single() 메서드가 없다
    - Scenario: RelationKeyTargetBuilder에서 description()과 single() 메서드가 없다

- [x] #### Slice 2: 순환 참조 테스트 + JSDoc 업데이트
  - **구현 내용:** 3테이블 순환참조 + options 사용 시 타입체크 통과 테스트 추가, JSDoc 예시 업데이트
  - **의존:** Slice 1
  - **호출 그래프:**
    ```mermaid
    flowchart TD
      TEST["타입 테스트: 3테이블 순환참조"] --> FKT["foreignKeyTarget(opts)"]
      TEST --> RKT["relationKeyTarget(opts)"]
    ```
  - **Scenarios:**
    - Scenario: 3테이블 다중 경로 순환 + description option
    - Scenario: 3테이블 다중 경로 순환 + single option
