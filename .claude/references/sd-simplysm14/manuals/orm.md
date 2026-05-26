# ORM 작업 가이드

## 단일 쿼리 우선

연관 데이터는 select 의 `join` 으로 한 쿼리에 모아 가져옴. 여러 쿼리로 나눠 받아 코드(서버/UI)에서 합치지 않음.

ORM 빌더로 표현 불가능한 경우, 작성 전 사용자 보고 후 중단.

예외: raw query로도 표현 불가하거나 단일 쿼리화가 명백히 비효율일 때만. 사유를 코드 주석에 남김.

이종 엔티티(예: 입고 + 출고)를 한 목록으로 보여줘야 할 때 두 결과를 코드에서 merge 하지 않으려면 → [orm-union.md](./orm-union.md) 참조.

## 조회 목록 표준 흐름

list / sheet 화면의 본 쿼리는 다음 순서로 작성:

1. root queryable 빌드 (`db.X()`).
2. 필요한 연관 데이터를 `joinSingle` 로 부착 — 본 행에 곧장 부착하지 않으면 안 되는 컬럼만. join 내부 쿼리도 동일 흐름 (`from → joinSingle → where → select`).
3. `.select((p) => ({ ...도출 컬럼들... }))` — coalesce / CASE WHEN / 산식 등 모든 도출을 한 번에 projection. select 콜백 안에서 로컬 `const` 로 산식을 잘게 나눠 가독성 확보.
4. WHERE 는 step 3 의 projected 컬럼 이름으로 직접 참조 (`r.psd`, `r.isCanceled`, `r.status`, …). framework 가 projected ExprUnit AST 를 WHERE 절에 그대로 inline 하므로 wrap 없이도 도출 컬럼 필터링이 동작함.
5. `count()` 로 총 건수.
6. `orderBy(...).limit(page * size, size).execute()`.

WHERE / SELECT 양쪽에서 동일 도출 산식을 쓰겠다고 `buildDerived(p)` 같은 helper 함수 만들지 말 것 — step 3 의 projected 컬럼이 자동으로 그 역할을 함.

화면 첫 진입 1회만 필요하고 refresh / 필터 변경에 무관한 데이터 (필터 dropdown 옵션 등) 는 본 목록 쿼리에 섞지 말 것. 별도 1회 effect 로 분리해 init 시점에만 로드함.

## 안티패턴

### SELECT 절 안 `expr.subquery` / `expr.exists` 박지 말 것

도메인 boolean (`isCompleted`, `hasAny` 등) / 집계 (`SUM`, `COUNT`, `MAX`) 가 필요하면 `joinSingle` 안에서 `from + where + select(aggregate)` 로 묶어 outer 행에 컬럼으로 부착함. SELECT column 에 subquery / exists 박으면 outer 행마다 inner 가 N 회 실행됨.

```ts
// 나쁜 예 — 행당 subquery N회
.select((p) => ({
  isCompleted: expr.is(expr.exists(db.X().where(...))),
  sumA: expr.subquery("number", db.Y().select(...)),
}))

// 좋은 예 — joinSingle 로 1회 부착, 컬럼으로 참조
.joinSingle("state", (q, p) =>
  q.from(X).where((x) => [expr.eq(x.fk, p.id)])
    .select((x) => ({
      rowCount: expr.count(),
      completedCount: expr.count(x.completedAt),
      sumA: expr.sum(x.amount),
    })),
)
.select((p) => ({
  isCompleted: expr.gt(p.state!.completedCount, 0),
  sumA: expr.coalesce(p.state!.sumA, 0),
}))
```

### 불필요한 `wrap()`

`wrap()` 은 framework 가 명시 요구하는 경우에만 씀 (대표적으로 `count()` after `distinct()` / `groupBy()` 호출 같은 명시 요구).

도출 컬럼 위에서 필터/정렬을 걸기 위해 wrap 을 끼우는 패턴은 불필요 — `.select(...).where((r) => [...])` 만으로 framework 가 projected ExprUnit AST 를 WHERE / ORDER BY 에 inline 함.

"Layer 1 = materialize, Layer 2 = derive" 같은 다층 wrap 구조도 군더더기. 단일 select 안 로컬 `const` 로 산식 분리하면 동일 SQL 이 나옴.

## 스키마 정의

컬럼은 `NOT NULL` 기본. `.nullable()`/`.default(...)` 는 도메인 근거가 있을 때만 붙임.

- `.nullable()`: 도메인상 값이 없을 수 있을 때만 (선택 입력, 미발생 이벤트 시각, 선택적 FK).
- `.default(...)`: 사용자가 명시 지시한 경우에만.
- "초기값 애매", "마이그레이션 중간 단계", "넣을 값 모름" 은 nullable/default 근거 아님. 호출자가 넣도록 강제하거나 backfill 후 `NOT NULL`로 전환.

## 삭제 전략

- **기초정보(마스터)**: soft delete (`isDisabled` 등). FK 참조 무결성 보존.
- **프로세스 문서(트랜잭션)**: 물리 delete. 상세 행 포함 캐스케이드. 단, 다른 테이블이 FK로 참조 중이면 삭제 차단하고 최종 사용자에게 toast 등으로 사유 안내.
