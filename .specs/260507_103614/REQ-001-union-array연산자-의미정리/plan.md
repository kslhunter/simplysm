# REQ-001-union-array연산자-의미정리 / Plan

## 메타
- 상태: planned
- 생성일: 2026-05-07
- 마지막 갱신: 2026-05-07
- 결과: proceed

## 결과 사유
spec R2 가 13개 연산자의 동작 변경을 명시. R4 가 회귀 테스트 추가/갱신을 명시. 코드·테스트 변경 필요. → proceed.

## R 단위 계획

- [ ] R1: union 결과 fluent 연산자의 의미 — 단일 룰 확정
  - **현황**: 구현 (spec 단계 결정으로 종결, 코드 변경 없음. R2 의 입력 정보로 작용)
  - **변경 위치**: 없음 (의미 분류만)
  - **변경 방식**: 없음
  - **테스트**: 생략 (의미 정의 — R2/R4 가 검증)

- [ ] R2: 외부 적용 동작 변경 — array-from 분배 분기 제거
  - **현황**: 차이있음
    - 근거: `packages/orm-common/src/exec/queryable.ts` 의 14개 메서드(`select`/`where`/`search`/`orderBy`/`limit`/`top`/`distinct`/`groupBy`/`having`/`lock`/`join`/`joinSingle`/`include`/`recursive`) 가 `if (Array.isArray(this.meta.from)) { sub 분배 }` 분기를 가지고 있어, union 결과 위 호출 시 sub 별 분배 동작.
  - **변경 위치**:
    - `packages/orm-common/src/exec/queryable.ts` — `Queryable.select`
    - `packages/orm-common/src/exec/queryable.ts` — `Queryable.where`
    - `packages/orm-common/src/exec/queryable.ts` — `Queryable.search`
    - `packages/orm-common/src/exec/queryable.ts` — `Queryable.orderBy`
    - `packages/orm-common/src/exec/queryable.ts` — `Queryable.limit`
    - `packages/orm-common/src/exec/queryable.ts` — `Queryable.top`
    - `packages/orm-common/src/exec/queryable.ts` — `Queryable.distinct`
    - `packages/orm-common/src/exec/queryable.ts` — `Queryable.groupBy`
    - `packages/orm-common/src/exec/queryable.ts` — `Queryable.having`
    - `packages/orm-common/src/exec/queryable.ts` — `Queryable.lock`
    - `packages/orm-common/src/exec/queryable.ts` — `Queryable.join`
    - `packages/orm-common/src/exec/queryable.ts` — `Queryable.joinSingle`
    - `packages/orm-common/src/exec/queryable.ts` — `Queryable.include`
    - `packages/orm-common/src/exec/queryable.ts` — `Queryable.recursive`
  - **변경 방식**:
    - 각 메서드 시작부의 `if (Array.isArray(this.meta.from)) { ... return new Queryable({...}) }` 분배 분기를 **그대로 삭제**한다. 일반 분기(단일 from 가정 하에 외부 메타 저장)가 자연스럽게 호출됨.
    - 일반 분기에서 `fn(this.meta.columns)` 등의 콜백 호출 시 `this.meta.columns` 는 `Queryable.union` 의 정적 메서드(queryable.ts:978-984)가 `transformColumnsAlias(first.meta.columns, unionAlias, "")` 로 만든 union alias 기반 ExprColumn 객체이므로, 외부 적용 SQL 의 컬럼 alias 가 union alias(예: `T3`)로 자연스럽게 빌드된다.
    - SQL 빌드 단계 수정 불필요. `_buildFromDef` (queryable.ts:1194-1208) 가 array 를 SelectQueryDef[] 로 빌드, `renderFrom` (query-builder-base.ts:161) 이 `(... UNION ALL ...) AS T` 으로 합치며, 외부 SELECT 절(WHERE/ORDER BY/LIMIT/...) 이 그 위에 자연스럽게 붙음.
    - 근거: queryable.ts 일반 분기 패턴 + union 정적 메서드의 columns 변환 동작 + spec.md R2 의 분석.
  - **테스트**:
    - 방식: TDD
    - 케이스: R4 의 회귀 테스트가 본 변경의 검증 — TDD RED → 분기 제거 → GREEN 흐름.

- [-] R3: ~~분배 유지 연산자의 회귀 보존~~ (dropped — spec 단계에서 폐기)

- [ ] R4: 회귀 테스트 범위
  - **현황**: 부분
    - 근거: 기존 union 관련 케이스 일부(`unionThenWhere`, `unionLiteralColumnDirectOrderBy`)는 분배 SQL 형태로 작성되어 있어 본 변경 후 갱신 필요. 추가 외부 적용 케이스(distinct/groupBy/having/lock/limit/top/join/joinSingle/include/recursive)는 미작성.
  - **변경 위치**:
    - `packages/orm-common/tests/select/subquery.spec.ts` — 외부 적용 케이스 새 describe 블록 추가 + 기존 분배 케이스(`unionThenWhere`, `unionLiteralColumnDirectOrderBy`) 의 expected 명칭/모양 갱신
    - `packages/orm-common/tests/select/subquery.expected.ts` — 위 케이스 dialect 별 expected SQL 추가/갱신
    - `packages/orm-common/tests/select/order.spec.ts` — `리터럴 상수 컬럼 -> ORDER BY` 케이스(string/lambda overload)의 expected 명칭/모양 점검 (직전 REQ-001 추가분 — 본 케이스는 단일 from 이라 영향 없음. 점검만)
  - **변경 방식**:
    - 기존 페어 패턴(`*.spec.ts` + `*.expected.ts` + `toMatchSql` 매처) 그대로 따름.
    - 새 외부 적용 케이스의 expected SQL 은 외부 SELECT 의 절(WHERE/ORDER BY/LIMIT/GROUP BY/...) 형태로 작성.
    - 기존 `unionThenWhere` / `unionLiteralColumnDirectOrderBy` 의 expected SQL 은 sub-SELECT 안 절이 아닌 외부 SELECT 절 형태로 갱신.
    - 케이스 작성 전략 — 핵심 외부 적용 시나리오 9개 신규 + 2 기존 갱신 = 11 케이스. fn 콜백이 union 결과 columns 기반인지 검증하기 위한 시나리오(orderBy/limit/top/distinct/groupBy+having/lock/where/select/join/joinSingle) 우선. recursive/include 는 실용성 부재 + 분기 일괄 삭제 본질로 다른 메서드 검증으로 갈음.
  - **테스트**:
    - 방식: TDD (R2 의 검증 수단)
    - 케이스 (수정 전 → 수정 후):
      - **신규**:
        - `Queryable.union(a, b).orderBy(fn, "DESC")` — 외부 ORDER BY
        - `Queryable.union(a, b).orderBy(fn, "DESC").limit(0, 10)` — 외부 ORDER BY + LIMIT
        - `Queryable.union(a, b).top(10)` — 외부 TOP
        - `Queryable.union(a, b).distinct()` — 외부 DISTINCT
        - `Queryable.union(a, b).select(fn).groupBy(fn).having(fn)` — 외부 GROUP BY/HAVING
        - `Queryable.union(a, b).lock()` — 외부 lock 절
        - `Queryable.union(a, b).select(fn)` — 외부 SELECT 컬럼 변환
        - `Queryable.union(a, b).join("alias", fn)` — 외부 JOIN
        - `Queryable.union(a, b).joinSingle("alias", fn)` — 외부 single JOIN
        - (recursive/include 는 실용성 부재로 미작성)
      - **갱신**:
        - 기존 `unionThenWhere` (subquery.expected.ts:236) — sub-SELECT 안 WHERE → 외부 WHERE
        - 직전 REQ-001 의 `unionLiteralColumnDirectOrderBy` — sub-SELECT 안 ORDER BY → 외부 ORDER BY
      - **무영향 확인**:
        - order.spec.ts 의 string-vs-lambda 동일성 매처 (line 155-176) — 두 코드 SQL 동일성만 비교. 본 변경 후에도 동일성 유지(둘 다 외부 적용 SQL).
        - subquery.spec.ts 의 wrap 후 케이스(`UNION -> WRAP -> ORDER BY + LIMIT`, `UNION (...) -> WRAP -> ORDER BY 리터럴 컬럼`) — wrap 후 동작은 변경 없음.

- [ ] R5: 호환성·영향 범위 점검
  - **현황**: 부분 (코드 grep 으로 영향 범위 식별 완료, 보정 액션 미수행)
    - 근거: plan 단계에서 직접 grep 수행 — `Queryable\.union\([^)]*\)\s*\.<연산자>` 패턴.
  - **변경 위치**:
    - `.claude/references/sd-simplysm14/orm-union.md` — 가이드 예시 갱신 검토 (현재 `Queryable.union(...).wrap().orderBy(...)` 형태. 본 변경 후엔 wrap 없이도 동일 효과)
  - **변경 방식**:
    - simplysm 모노레포 내 `Queryable.union(...).<연산자>` 패턴 사용처 grep 결과:
      - `packages/orm-common/src/exec/queryable.ts` — JSDoc 예시. 변경 불요.
      - `packages/orm-common/tests/errors/queryable-errors.spec.ts` — 단일 인자 에러 테스트. 변경 불요.
      - `packages/orm-common/tests/select/subquery.spec.ts` — R4 에서 갱신/추가.
      - `packages/orm-common/tests/select/order.spec.ts` — R4 에서 점검 (영향 없음 예상).
      - `tests/orm/src/subquery/subquery.spec.ts` — `Queryable.union(qr1, qr2).wrap()...` (wrap 후, 영향 없음).
    - `.claude/references/sd-simplysm14/orm-union.md` 가이드:
      - 옵션 (i) 그대로 둔다 — wrap 후 패턴은 여전히 정상. 사용자가 명시적으로 derived table 의도를 표현하는 효과.
      - 옵션 (ii) wrap 없이도 가능함을 노트로 추가.
      - 옵션 (iii) wrap 자체를 권장 패턴에서 제거 (이제 불필요).
    - **A 권장**: 옵션 (ii) — wrap 없이도 외부 적용이 자동 보장됨을 노트로 추가하되, 기존 `wrap()` 명시 패턴은 사용자가 derived table 의도를 표현하는 수단으로 그대로 유지 가능. 변경량 최소.
    - 근거: spec.md R5 + 사용자 결정으로 wrap 자체는 여전히 유효한 명시 수단.
  - **테스트**:
    - 방식: 생략 (문서 갱신)
    - 케이스: 가이드 예시가 새 동작과 정합한지 plan 종료 시 검토.
  - **breaking change 명시**: simplysm 외 다른 워크스페이스 사용자에게 영향 가능. CHANGELOG 또는 commit 메시지에 breaking change 명시. (단, 본 REQ 범위는 코드/테스트 변경. CHANGELOG 정책은 모노레포 별도 운영 사항.)

## 작업 순서
- **의존**:
  - R1 은 의미 정의 (코드 변경 X). R2 의 입력.
  - R4 는 R2 검증의 도구. TDD 흐름에서 R4 작성 → R2 분기 제거 → R4 통과.
  - R5 는 R2 와 독립. 다만 R2 변경 후 가이드 점검이 자연스러움.
- **권장 순서**:
  1. R4 케이스 작성 (RED): 신규 13개 외부 적용 케이스 + 기존 `unionThenWhere`/`unionLiteralColumnDirectOrderBy` expected 외부 적용 형태로 갱신
  2. R2 코드 변경: 13개 메서드 array-from 분기 삭제
  3. R4 검증 (GREEN): 회귀 테스트 통과 + 기존 wrap 후 케이스/string-vs-lambda 동일성 케이스 회귀 통과
  4. R5 가이드 갱신: orm-union.md 노트 추가 (wrap 없이도 가능)
- **병렬 가능**: R2 와 R5 는 독립 — 동시 변경 가능하나 한 패치로 묶음(테스트 + 코드 + 가이드).

## 통합/E2E 테스트
- adtek 워크스페이스 `po-update-result.list.ts` 의 `Queryable.union(reviseQr, newQr).orderBy(...).limit(...)` 패턴 — 본 변경 후 외부 ORDER BY + LIMIT 가 자동 적용되어 정렬·페이지네이션 의도가 SQL 레벨에서 보장됨. 단, simplysm 저장소 테스트에 포함하지 않음(외부 워크스페이스). R4 의 단위 테스트가 통과하면 동일 클래스의 결함이 모두 해소됨을 보장.
- `pnpm test` 전체 회귀 — node/browser/angular/sd-cli-server/sd-cli-client/service 프로젝트 통과(기존 SQL 회귀 깨짐 없음 확인). orm 프로젝트는 Docker 필요로 별도 트리거.
