# REQ-001-union-array연산자-의미정리

## 메타
- 상태: done
- 생성일: 2026-05-07
- 마지막 갱신: 2026-05-07
- 관련 영역: orm-common / Queryable union 결과 fluent 연산자

## 이력
- 2026-05-07: R3 dropped — 사용자 결정으로 "union = 무조건 wrap, 모든 fluent 연산자 외부 적용" 단일 룰 확정. 분배 유지 정책 폐기, R3 의 본래 의도(분배 유지의 회귀 보존)도 사라짐.

## 요약
`Queryable.union(a, b)` 결과(meta.from = Queryable[]) 위 fluent 연산자의 의미를 SQL 의미와 사용자 직관에 맞게 정리한다. **모든 fluent 연산자는 외부 적용** — union 결과를 의미상 wrap 된 derived table 로 보고, 그 위에 적용되는 단일 룰. sub 별 적용을 의도하면 사용자가 sub-Queryable 자체에 미리 적용하는 책임으로 둔다.

## 용어
- [x] T1: array-from
  - **A**: `Queryable.union(a, b)` 결과의 `meta.from` 값이 `Queryable[]` 배열 형태로 저장된 상태. SQL 빌드 시 `(A UNION ALL B) AS T` 로 렌더되는 derived table 의 메타 표현. (2026-05-07 확정)
  - 출처: packages/orm-common/src/exec/queryable.ts:980 (Queryable.union 정적 메서드), 1206-1208 (_buildFromDef array 분기)
- [x] T2: 외부 적용
  - **A**: union 결과 derived table `T` 위에 SQL 절을 적용하는 의미. SQL 형태: `SELECT ... FROM (A UNION ALL B) AS T <WHERE|ORDER BY|LIMIT|GROUP BY|JOIN|...>`. (2026-05-07 확정)
  - 출처: SQL 표준 — UNION 결과 derived table 에 outer query 절 적용.
- [x] T3: 분배 (참고용 — 결정으로 폐기된 의미)
  - **A**: union 결과 위 호출된 연산자가 각 sub-Queryable 로 매핑되어 sub 별 SQL 절로 들어가는 의미. 본 REQ 결정으로 폐기됨 — 사용자가 sub-Queryable 자체에 미리 호출하는 패턴으로 대체. (2026-05-07 확정)
  - 출처: packages/orm-common/src/exec/queryable.ts 의 array-from 분기 패턴.

## 세부 요구

- [ ] R1: union 결과 fluent 연산자의 의미 — 단일 룰 확정
  > [2026-05-07, 사용자 요청] "외부 적용이 옳은 연산자(orderBy/limit/distinct/groupBy/lock)와 분배가 의미 있는 연산자(where/select)를 구분해 정리"
  > 출처: 사용자 직접 요청 (2026-05-07)
  >
  > [2026-05-07, **최종**] "그냥 union은 무조건 wrap이 맞는거 같은데? 효율이고 뭐고... sub안에 하는게 나으면 코드로 해결하게.."
  > 출처: 사용자 직접 요청 (2026-05-07)

  - **A**: `Queryable.union(a, b)` 결과는 의미상 wrap 된 derived table 로 본다. 그 위에서 호출되는 모든 fluent 연산자는 **외부 적용** 단일 룰. (2026-05-07 확정)
    - 근거: 사용자 직접 결정 (2026-05-07).
  - **A**: 영향 받는 연산자 14개 — `select` / `where` / `search` / `orderBy` / `limit` / `top` / `distinct` / `groupBy` / `having` / `lock` / `join` / `joinSingle` / `include` / `recursive`. 모두 외부 union 위에 적용되는 의미로 통일. (2026-05-07 확정)
    - 근거: packages/orm-common/src/exec/queryable.ts 의 `Array.isArray(this.meta.from)` 분기 14개 위치 (select/distinct/lock/top/limit/orderBy/where/search/groupBy/having/join/joinSingle/include/recursive). 사용자 결정으로 모두 동일 룰.
  - **A**: sub 별 적용 의도가 있는 사용자는 `Queryable.union(...)` 호출 전 각 sub-Queryable 에 미리 연산자(예: `qr1.where(...)`)를 적용하면 된다. 사용자 책임 영역. (2026-05-07 확정)
    - 근거: 사용자 직접 결정 (2026-05-07) — "sub안에 하는게 나으면 코드로 해결".

- [ ] R2: 외부 적용 동작 변경 — array-from 분배 분기 제거
  > [2026-05-07, 사용자 요청] "외부 적용이 옳은 연산자는 외부 union 위에 적용되도록 변경"
  > 출처: 사용자 직접 요청 (2026-05-07)
  >
  > [2026-05-07, **최종**] "union은 무조건 wrap → 모든 fluent 연산자 외부 적용으로 통일"
  > 출처: 사용자 직접 요청 (2026-05-07)

  - **A**: queryable.ts 의 14개 연산자(R1 의 영향 목록)에서 `if (Array.isArray(this.meta.from)) { ... }` 분배 분기를 제거한다. 그러면 일반 분기가 호출되어 외부 union Queryable 의 meta 에 직접 저장되거나(orderBy/limit/top/distinct/groupBy/having/lock/where/search/select), 외부 join 메타에 저장되거나(join/joinSingle/include), 외부 base 로 잡아 recursive CTE 가 만들어진다(recursive). (2026-05-07 확정)
    - 근거: queryable.ts 의 일반 분기들은 이미 단일 from 가정으로 외부 절·메타 저장을 수행. array-from 도 동일 흐름을 타게 하면 외부 적용이 자동 달성.
  - **A**: SQL 빌드 단계는 별도 수정 불필요. `_buildFromDef` (queryable.ts:1194-1208) 가 array 를 SelectQueryDef[] 로 빌드하고, `renderFrom` (query-builder-base.ts:161) 이 `(... UNION ALL ...)` 으로 합치며, 외부 SELECT 의 절(WHERE/ORDER BY/LIMIT/GROUP BY/HAVING/JOIN/...)이 그 위에 자연스럽게 붙는다. (2026-05-07 확정)
    - 근거: 직전 채팅(2026-05-07) 사용자 ↔ 어시스턴트 분석.
  - **A**: 사용자 코드(adtek po-update-result.list.ts) 의 `Queryable.union(reviseQr, newQr).orderBy(...).limit(...)` 패턴이 fix 후 외부 ORDER BY + LIMIT 가 자동 적용된 SQL 로 빌드되어 정렬·페이지네이션 의도가 SQL 레벨에서 보장된다. (2026-05-07 확정)

- [-] R3: ~~분배 유지 연산자의 회귀 보존~~ (dropped — R1 단일 룰 확정으로 분배 유지 정책 폐기)
  > [2026-05-07, 사용자 요청] "기존 SQL 회귀 우려: where 등 분배가 등가인 연산자의 SQL 문자열은 변경하지 않거나, 변경해도 등가성을 유지해야 함"
  > 출처: 사용자 직접 요청 (2026-05-07)
  >
  > [2026-05-07, **dropped**] R1 의 "union = 무조건 wrap, 모든 연산자 외부 적용" 결정으로 분배 유지 정책 자체가 사라짐. 본 R 의 "회귀 보존" 의도는 R5 의 영향 범위 점검·R4 의 회귀 테스트 갱신으로 흡수.
  > 출처: 사용자 직접 요청 (2026-05-07)

- [ ] R4: 회귀 테스트 범위
  > [2026-05-07, 자동 분석] "외부 적용 변경 후 모든 13개 연산자 동작 검증 + 기존 union 관련 테스트 expected SQL 갱신"
  > 출처: cascading implication

  - **A**: 회귀 테스트는 `packages/orm-common/tests/select/subquery.spec.ts` 에 추가하며, 기존 `*.expected.ts` 페어 + `toMatchSql` 패턴을 따른다. (2026-05-07 확정)
    - 근거: 직전 세션 260507100004 REQ-001 R3 결정 동일 정책.
  - **A**: 다음 케이스를 모두 검증한다 (외부 적용 SQL 형태). (2026-05-07 확정)
    - `Queryable.union(a, b).orderBy(...)` → 외부 SELECT 의 ORDER BY 절
    - `Queryable.union(a, b).limit(0, 10)` → 외부 SELECT 의 LIMIT 절
    - `Queryable.union(a, b).top(10)` → 외부 SELECT 의 TOP 절
    - `Queryable.union(a, b).distinct()` → 외부 SELECT 의 DISTINCT 절
    - `Queryable.union(a, b).groupBy(fn).having(fn)` → 외부 GROUP BY/HAVING 절
    - `Queryable.union(a, b).lock()` → 외부 SELECT 의 lock 절
    - `Queryable.union(a, b).where(fn)` → **외부** SELECT 의 WHERE 절 (수정 전: sub-SELECT 안에 분배 → 수정 후: 외부)
    - `Queryable.union(a, b).select(fn)` → **외부** SELECT 의 SELECT 절 변환 (수정 전: sub-SELECT 안 분배 → 수정 후: 외부)
    - `Queryable.union(a, b).join(...)` / `.joinSingle(...)` → 외부 JOIN 절
    - `Queryable.union(a, b).include(...)` → 외부 include 조인
    - 사용자 시나리오 — adtek po-update-result 패턴: union + orderBy + limit (wrap 없이) → 외부 ORDER BY + LIMIT
  - **A**: 기존 union 관련 테스트(`subquery.spec.ts`)의 SQL expected 가 갱신 대상이 된다. 특히:
    - `unionThenWhere` (where 분배 → 외부 적용으로 SQL 모양 변함)
    - `unionThenSelect` (select 분배 → 외부 적용으로 SQL 모양 변함)
    - 직전 세션 260507100004 의 `unionLiteralColumnDirectOrderBy` (sub-SELECT 안 ORDER BY → 외부 ORDER BY 로 이동)
    - (필요 시) 다른 union 케이스의 expected SQL 점검 — plan 단계에서 grep
    (2026-05-07 확정)

- [ ] R5: 호환성·영향 범위 점검
  > [2026-05-07, 자동 분석] "외부 적용 변경에 따라 기존 사용자 코드 SQL 결과가 달라질 수 있음. 영향 범위 명시."
  > 출처: cascading implication

  - **A**: 외부 적용 변경 후 기존 사용자 코드 영향:
    - **wrap 없이 union 직속 fluent 연산자 사용 케이스** — SQL 모양이 변함. 의미 방향은 SQL 표준에 더 부합 + 사용자 직관 일치 → 사용자에게 이득.
    - **wrap() 명시 사용 케이스** — wrap 후 외부 적용은 기존 동작과 동일하게 유지(wrap 자체가 단일 from 으로 만들고 외부 메타 저장).
    - **sub 별 분배 의도 케이스** — 사용자가 sub-Queryable 에 미리 적용하면 기존 분배 SQL 과 동일 결과.
    (2026-05-07 확정)
  - **A**: 본 변경은 명백한 breaking change. simplysm 모노레포 내 영향 범위는 plan 단계에서 grep(`Queryable\.union\([^)]*\)\s*\.(orderBy|limit|top|distinct|groupBy|having|lock|where|search|select|join|joinSingle|include|recursive)` 패턴) 으로 점검한다. 발견된 사용처마다 의도(외부 적용 vs 분배)를 확인 후 필요 시 코드 보정. (2026-05-07 확정)
    - 근거: 운영 사항. spec 차원 의미 정의에는 영향 없음.
  - **A**: adtek 워크스페이스 사용자 코드(po-update-result.list.ts)는 외부 적용이 의도와 일치하므로 보정 불필요. simplysm 외 다른 워크스페이스 사용자 코드도 의도 점검은 사용자 측 책임. CHANGELOG/breaking change 명시 필요. (2026-05-07 확정)
