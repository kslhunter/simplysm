# REQ-001-select메타-리터럴-ExprUnit화

## 메타
- 상태: done
- 생성일: 2026-05-07
- 마지막 갱신: 2026-05-07
- 관련 영역: orm-common / Queryable select 메타

## 요약
`Queryable.select` 결과 메타에 raw 상수가 `ExprUnit` 으로 감싸지지 않아 발생하는 표현식 자리 재사용 결함을 제거한다. SQL 출력은 동일해야 한다.

## 용어
- [x] T1: ExprUnit
  - **A**: `expr/expr-unit.ts:8` 의 클래스. `dataType` + IR `Expr` 을 보유한 표현식 래퍼. 메타 컬럼 객체에 들어가는 단위. (2026-05-07 확정)
  - 출처: packages/orm-common/src/expr/expr-unit.ts:1-19
- [x] T2: 표현식 자리
  - **A**: 컬럼 값을 IR(`Expr`) 로 다시 추출하는 위치 (`orderBy`/`groupBy` 의 IR 빌드 지점, `_buildSelectDef` 의 ExprUnit 분기 등). 정확히 `meta.<x>.map((o) => [o[0].expr, ...])` 류로 `.expr` 추출이 일어나는 자리. (2026-05-07 확정)
  - 출처: packages/orm-common/src/exec/queryable.ts:1180,1182
- [x] T3: raw 상수
  - **A**: select callback 결과 객체의 값으로 들어가는 JS primitive 또는 값 객체. `ColumnPrimitive` (column.ts:91) 정의에 따라 구체 범위는 string / number / boolean / DateTime / DateOnly / Time / Uuid / Bytes(=Uint8Array) | undefined. `ExprUnit`/`Array`/일반 객체 가 아닌 모든 것을 walk 에서 분류 대상으로 본다. (2026-05-07 확정)
  - 출처: packages/orm-common/src/types/column.ts:64-91

## 세부 요구

- [ ] R1: select callback 결과 메타에 raw 상수가 들어오면 `ExprUnit` 으로 감싸 저장한다
  > [2026-05-07, 사용자 요청] "select 안에 적힌 상수가 표현식으로 자동 감싸지게 한다"
  > 출처: 사용자 직접 요청 (2026-05-07)

  - **A**: 적용 위치는 `packages/orm-common/src/exec/queryable.ts:264-268` 의 `select` 메서드 메타 저장 직전. callback 결과 객체를 walk 해서 `ExprUnit`/`Array`/일반 객체 가 아닌 값을 만나면 `new ExprUnit(inferColumnPrimitiveStr(v), { type: "value", value: v })` 로 감싼다. (2026-05-07 확정)
    - 근거: 동일 패턴이 `expr.ts:2103` 등에서 사용 중. `inferColumnPrimitiveStr` 은 `types/column.ts:151` 에 존재.
  - **A**: walk 는 `transformColumnsAlias` (queryable.ts:1841) 의 분기 구조와 정합되게 동일 모양으로 한다 — `ExprUnit` 통과 / `Array` 재귀(첫 요소만) / 일반 객체 재귀 / 그 외는 ExprUnit 화. (2026-05-07 확정)
  - **A**: SQL 결과는 변하지 않아야 한다. `_buildSelectDef` (queryable.ts:1213) 가 어차피 `val.expr` 또는 `expr.toExpr(val)` 로 같은 IR 을 만들어내므로 동일 출력이 나오는지 회귀 테스트로 확인한다. (2026-05-07 확정)
    - 근거: `_buildSelectDef` 의 primitive 분기(line 1238-1240)가 `expr.toExpr(val)` 로 같은 `{type:"value", value}` IR 을 생성. ExprUnit 분기(line 1222-1223)는 `val.expr` 추출. 둘이 동일 IR 로 수렴.

- [ ] R2: `transformColumnsAlias` 의 raw 상수 분기도 `ExprUnit` 으로 감싸 반환한다
  > [2026-05-07, 사용자 요청] "transformColumnsAlias 도 같은 클래스의 누락"
  > 출처: 사용자 직접 요청 (2026-05-07)

  - **A**: 적용 위치는 `packages/orm-common/src/exec/queryable.ts:1862` 의 `else { result[key] = value; }` 분기. 이 분기로 들어오는 값(raw 상수)을 R1 의 walk 와 동일 규칙으로 `ExprUnit` 으로 감싼다. (2026-05-07 확정)
    - 근거: union 결과 `transformColumnsAlias(first.meta.columns, unionAlias, "")` (queryable.ts:982) 가 호출되며, sub-Queryable 의 raw 상수 컬럼이 그대로 통과되면 wrap 후에도 raw 상수로 남아 동일 결함이 재현된다. wrap 의 컬럼 변환(line 947) 도 같은 함수를 거친다.

- [ ] R3: 회귀 검증 범위
  > [2026-05-07, 사용자 요청] "단일 쿼리·union 양쪽 모두 회귀 검증 필요"
  > 출처: 사용자 직접 요청 (2026-05-07)

  - **A**: 다음 케이스가 모두 깨지지 않아야 한다 (수정 전 깨지는 것 + 수정 후 동일 SQL 인지). (2026-05-07 확정)
    - 단일 쿼리: `select((u) => ({ id: u.id, label: "fixed" })).orderBy("label", "DESC")`
    - union: `Queryable.union(a, b).orderBy("rowType", "DESC")` (a/b 의 select 에 `rowType: "Revise"` / `rowType: "NewPO"` 같은 string literal 포함)
    - union + wrap: `Queryable.union(a, b).wrap().orderBy("rowType", "DESC")`
    - 기존 SQL 회귀: select 본문에 raw 상수가 박힌 기존 케이스의 SQL 문자열이 동일 (수정 전후 비교)
  - **A**: orm-common 의 `_buildSelectDef` / `where` / `expr.eq` 등은 이미 `expr.toExpr` 경유로 raw 상수를 처리하고 있으므로, 이번 수정으로 SQL 출력이 변하면 안 된다. SQL 회귀는 단위 테스트의 IR/SQL 비교로 검증한다. (2026-05-07 확정)
  - **A**: 회귀 테스트는 `packages/orm-common/tests/select/` 에 추가한다. 기존 `order.spec.ts` / `subquery.spec.ts` / `basic.spec.ts` 의 `*.expected.ts` 페어 패턴을 따른다. Docker DB 통합 테스트(`tests/orm/`) 추가는 하지 않는다 — 이번 결함은 IR 빌드 단계의 누락이라 IR/SQL 문자열 단위 검증으로 충분. (2026-05-07 확정)

- [ ] R4: `ColumnPrimitive` 범위 밖 raw 값이 들어왔을 때의 처리
  > [2026-05-07, 자동 분석] "ExprUnit 화 walk 에서 ColumnPrimitive 범위 밖 값(null/undefined/함수/Symbol/일반 클래스 인스턴스 등)을 만났을 때의 동작"
  > 출처: cascading implication

  - **A**: walk 에서 ExprUnit 화 대상은 `inferColumnPrimitiveStr` 가 인식하는 타입(string/number/boolean/DateTime/DateOnly/Time/Uuid/Uint8Array)으로 한정한다. (2026-05-07 확정)
    - 근거: packages/orm-common/src/types/column.ts:151-161 — 미지원 타입에 throw.
  - **A**: null/undefined 는 walk 에서 ExprUnit 화하지 않고 그대로 통과시킨다. 사용자가 NULL 자리채움이 필요하면 `expr.raw("<type>")\`NULL\`` 로 명시하는 게 기존 권장 패턴이며, walk 가 null 에 임의 dataType 을 강제 부여하면 부정확. (2026-05-07 확정)
    - 근거: `.claude/references/sd-simplysm14/orm-union.md:L9` — "한쪽에만 있는 컬럼은 NULL 자리채움이 필요한데 타입 추론이 안 되므로 `expr.raw("<type>")\`NULL\`` 로 명시한다".
  - **A**: null/undefined 가 select 메타에 raw 로 통과된 뒤 그 컬럼을 orderBy/groupBy 등 표현식 자리에 쓰면 기존 함정과 동일한 TypeError 가 다시 난다. 이는 사용자가 "타입 미명시 NULL" 컬럼을 정렬 키로 쓰는 잘못된 사용이므로 사용자 책임 영역으로 둔다. 가이드 가독성을 위해 `transformColumnsAlias`/walk 의 raw 통과 분기에 짧은 주석을 남길지는 plan 단계에서 결정한다. (2026-05-07 확정)
  - **A**: 그 외 함수/Symbol/일반 클래스 인스턴스가 select callback 결과에 박히는 케이스는 ORM 사용 의도상 발생할 일이 없으므로 별도 핸들링하지 않는다(현 동작 유지: 일반 객체 분기 → 빈 walk 또는 raw 통과). plan 단계에서 walk 분기 순서를 정리할 때 일관 처리한다. (2026-05-07 확정)
