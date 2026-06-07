# ORM 작업 가이드

## 단일 쿼리 우선

연관 데이터는 select 의 `join` 으로 한 쿼리에 모아 가져옴. 여러 쿼리로 나눠 받아 코드(서버/UI)에서 합치지 않음.

ORM 빌더로 표현 불가능한 경우, 작성 전 사용자 보고 후 중단.

예외: raw query 로도 표현 불가하거나 단일 쿼리화가 명백히 비효율인 경우에 한함. 사유를 코드 주석에 남김.

이종 엔티티(예: 입고 + 출고)를 한 목록으로 보여줘야 할 때 두 결과를 코드에서 merge 하지 않으려면 → [orm-union.md](./orm-union.md) 참조.

## 조회 목록 표준 흐름

list / sheet 화면의 본 쿼리는 다음 순서로 작성:

1. root queryable 빌드 (`db.X()`).
2. 필요한 연관 데이터를 `joinSingle` 로 부착 — 본 행에 직접 부착해야 하는 컬럼만. join 내부 쿼리도 동일 흐름(`from → joinSingle → where → select`)을 따름.
3. `.select((p) => ({ ...도출 컬럼들... }))` — coalesce / CASE WHEN / 산식 등 모든 도출을 한 번에 projection. select 콜백 안에서 로컬 `const` 로 산식을 잘게 나눠 가독성 확보.
4. WHERE 는 3번 단계의 projected 컬럼 이름으로 직접 참조 (`r.psd`, `r.isCanceled`, `r.status` 등). framework 가 projected ExprUnit AST 를 WHERE 절에 그대로 inline 하므로 wrap 없이도 도출 컬럼 필터링이 동작함.
5. `count()` 로 총 건수 산출.
6. `orderBy(...).limit(page * size, size).execute()` 로 페이지 결과 조회.

WHERE 와 SELECT 양쪽에서 동일 도출 산식을 쓰겠다고 `buildDerived(p)` 같은 helper 함수를 만들지 말 것 — 3번 단계의 projected 컬럼이 자동으로 그 역할을 함.

화면 첫 진입 1회만 필요하고 refresh / 필터 변경에 무관한 데이터(필터 dropdown 옵션 등)는 본 목록 쿼리에 섞지 말 것. 별도의 1회성 effect 로 분리해 init 시점에만 로드함.

## 안티패턴

### execute 결과를 코드에서 후처리 금지

가져올 데이터는 DB단에서 최소화함. 중복 제거·필터·정렬·집계·페이징은 ORM 절로 처리하고, `execute()` 로 받은 배열을 코드에서 가공하지 않음. 전건을 메모리로 끌어온 뒤 코드에서 거르면 네트워크·직렬화·메모리 비용이 행 수에 비례해 커짐.

| 코드 후처리 (나쁜 예)                         | ORM 절 (좋은 예)                          |
| --------------------------------------------- | ----------------------------------------- |
| `(await q.execute())` 후 `.distinct()`        | `.distinct().execute()` (count 시 `.distinct().wrap().count()`) |
| 받은 배열을 `.filter(...)`                    | `.where((r) => [...])`                     |
| 받은 배열을 `.sort(...)`                      | `.orderBy((r) => ..., "ASC")`             |
| 받은 배열을 `.slice(page*size, ...)`          | `.limit(page * size, size)`               |
| 받은 배열로 `.reduce((sum, ...) => ...)`      | `.select((r) => ({ sum: expr.sum(...) }))` (집계는 `joinSingle` 부착) |

이종 엔티티를 합쳐야 할 때도 코드 merge 대신 DB단 UNION — predicate pushdown 으로 각 소스에서 먼저 행을 줄임 ([orm-union.md](./orm-union.md)).

### SELECT 절 내부에 `expr.subquery` / `expr.exists` 사용 금지

도메인 boolean(`isCompleted`, `hasAny` 등)이나 집계(`SUM`, `COUNT`, `MAX`)가 필요하면 `joinSingle` 안에서 `from + where + select(aggregate)` 로 묶어 outer 행에 컬럼으로 부착함. SELECT 컬럼에 subquery / exists 를 넣으면 outer 행마다 inner 쿼리가 N 회 실행됨.

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

### 불필요한 `wrap()` 사용 금지

`wrap()` 은 framework 가 명시적으로 요구하는 경우에만 사용 (예: `distinct()` / `groupBy()` 이후 `count()` 호출).

도출 컬럼 위에서 필터·정렬을 걸기 위해 wrap 을 끼우는 패턴은 불필요 — `.select(...).where((r) => [...])` 만으로 framework 가 projected ExprUnit AST 를 WHERE / ORDER BY 에 inline 함.

"Layer 1 = materialize, Layer 2 = derive" 같은 다층 wrap 구조도 군더더기. 단일 select 안에서 로컬 `const` 로 산식을 분리하면 동일한 SQL 이 생성됨.

### 불필요한 `expr.val` 사용 금지

`where` 비교·`update`/`upsert`/`insert` 값은 `ExprInput`(= `ExprUnit | T`) 자리라 리터럴을 그대로 넘김 — `expr.val` 로 감싸지 말 것.

```ts
// 나쁜 예 — 불필요한 래핑
.update((u) => ({ name: expr.val("string", "새이름") }))
.where((u) => [expr.eq(u.status, expr.val("string", "active"))])

// 좋은 예 — 리터럴 직접 전달
.update((u) => ({ name: "새이름" }))
.where((u) => [expr.eq(u.status, "active")])
```

`expr.val` 은 `select` 콜백에서 리터럴 상수 컬럼을 만들 때처럼 `ExprUnit` 이 요구되는 자리에서만 사용.

## 컬럼 정책 (nullable / default)

컬럼은 `NOT NULL` 기본. `.nullable()` / `.default(...)` 는 도메인 근거가 있을 때만 사용.

- `.nullable()`: 도메인상 값이 없을 수 있을 때만 사용 (선택 입력, 미발생 이벤트 시각, 선택적 FK 등).
- `.default(...)`: 사용자가 명시적으로 지시한 경우에만 사용.
- "초기값 애매", "마이그레이션 중간 단계", "넣을 값 모름" 은 nullable / default 근거가 아님. 호출자가 값을 넣도록 강제하거나 backfill 후 `NOT NULL` 로 전환.

## 삭제 전략

- **기초정보(마스터)**: soft delete (`isDisabled` 등) 사용. FK 참조 무결성 보존.
- **프로세스 문서(트랜잭션)**: 물리 delete. 상세 행을 포함해 캐스케이드. 단, 다른 테이블이 FK 로 참조 중이면 삭제를 차단하고 최종 사용자에게 toast 등으로 사유 안내.

## 유니크 전략 (활성 유니크 vs 완전 유니크)

soft delete 하는 마스터에서 "중복 불가" 컬럼은 두 종류로 나뉨. 대부분 DB 유니크 제약 대신 앱 검증을 기본으로 함.

### 명칭·코드 = 활성(비삭제) 유니크

활성(`isDeleted=false`) 레코드끼리만 중복 불가. 삭제하면 그 값이 풀려 재사용 가능.

- **DB 유니크 제약(부분 유니크 인덱스 포함)을 두지 않음.** 등록·수정 시 앱에서 검증:
  ```ts
  const isDuplicated = await db
    .role()
    .where((c) => [
      expr.eq(c.name, data.name),
      expr.eq(c.isDeleted, false),
      ...(roleId == null ? [] : [expr.not(expr.eq(c.id, roleId))]), // 수정 시 자기 자신 제외
    ])
    .exists();
  if (isDuplicated) throw new Error("이미 존재하는 역할 이름입니다.");
  ```
- **단, `(컬럼, isDeleted)` 복합 비유니크 인덱스는 둠** — 위 검증 쿼리(`컬럼=? AND isDeleted=false`)의 성능용. 유니크 제약이 아님.
- 채택 이유: 코드·명칭은 엑셀·외부 데이터 업로드 시 id 가 없어 **코드·명칭으로 기존 레코드에 매핑**됨. 완전 유니크로 두면 삭제값이 영구 점유돼 매핑이 깨짐 → 활성만 유니크로 둬 삭제값을 재사용 가능하게 함.
- 조회·매핑은 항상 `isDeleted=false`(활성) 대상으로.

### 자격증명(loginId 등) = 완전 유니크

전체 행(삭제 포함) 유니크. 영구 점유 — 퇴사자 ID 재사용 방지(보안).

- 업로드 매핑 대상이 아니라 삭제값을 재사용할 이유가 없음 → **DB 유니크 인덱스를 둠**.
- DB unique 위반은 raw 에러라 사용자 메시지로 못 씀 → 앱 선검증 + 메시지를 병행하고 DB 인덱스는 안전망으로 둠.

### 지킬 것

- 활성 유니크는 DB 유니크 제약으로 강제하지 말고 앱 검증(`where(컬럼, isDeleted=false, id≠self).exists()`)으로. DB 에는 검증 성능용 `(컬럼, isDeleted)` **비유니크** 인덱스만.
- 완전 유니크는 DB 유니크 인덱스 + 앱 선검증(메시지용) 병행.
- 활성 유니크 컬럼은 삭제 후 복구될 때 충돌이 생길 수 있음 → 복구 경로에서 반드시 재검증([client-crud.md](./client-crud.md) 의 삭제·복구 처리).
