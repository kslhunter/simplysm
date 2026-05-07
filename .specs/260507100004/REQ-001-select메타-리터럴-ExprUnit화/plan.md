# REQ-001-select메타-리터럴-ExprUnit화 / Plan

## 메타
- 상태: planned
- 생성일: 2026-05-07
- 마지막 갱신: 2026-05-07
- 결과: proceed

## 결과 사유
spec R1/R2 모두 "차이있음"(현 코드는 raw 상수를 메타에 raw 그대로 저장). 코드 변경 필요. R3 는 회귀 테스트 신규 추가. → proceed.

## R 단위 계획

- [ ] R1: select callback 결과 메타에 raw 상수가 들어오면 ExprUnit 으로 감싸 저장한다
  - **현황**: 차이있음
    - 근거: `packages/orm-common/src/exec/queryable.ts` `Queryable.select` 가 callback 결과 객체를 메타 `columns` 에 그대로 저장. raw 상수가 ExprUnit 으로 감싸지지 않음.
  - **변경 위치**:
    - `packages/orm-common/src/exec/queryable.ts` — 모듈 스코프에 신규 헬퍼 함수 `wrapColumnsPrimitives` 추가
    - `packages/orm-common/src/exec/queryable.ts` — `Queryable.select` 메서드 (메타 저장 직전)
  - **변경 방식**:
    - 신규 헬퍼 `wrapColumnsPrimitives(columns)` — `transformColumnsAlias` 와 동일한 분기 구조로 재귀 walk:
      - `ExprUnit` → 그대로 통과
      - `Array` → 첫 요소 재귀 후 `[walk결과]`
      - 일반 객체(`typeof === "object" && value != null`) → 재귀
      - `null`/`undefined` → 그대로 통과 (R4 정책)
      - 그 외(raw 상수) → `new ExprUnit(inferColumnPrimitiveStr(value), { type: "value", value })`
    - `Queryable.select` 의 array-from 분기는 sub-from 들이 자체 select 를 거치며 walk 가 적용되므로 추가 처리 불필요. 단일 from 분기에서만 callback 결과를 walk 통과시킨 후 메타에 저장.
    - 근거: `transformColumnsAlias` (queryable.ts) 의 분기 구조 + `inferColumnPrimitiveStr` 동작(types/column.ts:151-161) + `expr.ts:2103` 의 동일 ExprUnit 생성 패턴.
  - **테스트**:
    - 방식: TDD
    - 케이스:
      - 단일 쿼리: `select((u) => ({ id: u.id, label: "fixed" }))` 후 `orderBy("label", "DESC")` → ORDER BY 절에 `'fixed'` 리터럴이 들어간 SQL 생성 (수정 전: TypeError)
      - 단일 쿼리 SQL 회귀: `select((u) => ({ id: u.id, label: "fixed" }))` 의 SELECT 본문 SQL 이 수정 전후 동일

- [ ] R2: transformColumnsAlias 의 raw 상수 분기도 ExprUnit 으로 감싸 반환한다
  - **현황**: 차이있음
    - 근거: `packages/orm-common/src/exec/queryable.ts` `transformColumnsAlias` 의 마지막 else 분기에서 raw 값을 그대로 저장. union/wrap 결과 메타에 raw 상수가 잔존.
  - **변경 위치**:
    - `packages/orm-common/src/exec/queryable.ts` — `transformColumnsAlias` 의 마지막 else 분기
  - **변경 방식**:
    - 마지막 else 분기를 R1 헬퍼와 동일 정책으로 교체:
      - `null`/`undefined` → 그대로 통과
      - 그 외(raw 상수) → `new ExprUnit(inferColumnPrimitiveStr(value), { type: "value", value })`
    - `transformColumnsAlias` 의 ExprUnit 분기는 alias 부여(`expr.col(value.dataType, alias, fullKey)`) 책임이 있어 R1 헬퍼와는 별개로 유지. 즉 R1 헬퍼와 `transformColumnsAlias` 는 "raw 상수 → ExprUnit 화" 한 줄 변환만 공유하며, 그 외 분기는 각자 의미를 가짐.
    - 근거: union 결과 `transformColumnsAlias(first.meta.columns, unionAlias, "")` 호출 + wrap 의 동일 호출. sub-Queryable 의 raw 상수 컬럼이 wrap 후에도 그대로 잔존하면 동일 함정 재현.
  - **테스트**:
    - 방식: TDD
    - 케이스:
      - union: 두 sub-Queryable 의 select 에 string literal 컬럼(`rowType: "Revise"` / `rowType: "NewPO"`) 포함 → `Queryable.union(a, b).orderBy("rowType", "DESC")` → 외부 ORDER BY 가 union 결과 컬럼에 적용된 SQL (수정 전: TypeError)
      - union + wrap: 동일 입력 + `.wrap().orderBy("rowType", "DESC")` → 외부 wrap SELECT 의 ORDER BY 가 wrap 컬럼에 적용된 SQL
      - union SQL 회귀: 기존 union 케이스의 SELECT 본문 SQL 이 수정 전후 동일

- [ ] R3: 회귀 테스트 추가
  - **현황**: 미구현
    - 근거: 현재 `packages/orm-common/tests/select/order.spec.ts` 및 `subquery.spec.ts` 에 raw 상수 컬럼 + orderBy 조합 케이스 부재.
  - **변경 위치**:
    - `packages/orm-common/tests/select/order.spec.ts` — 단일 쿼리 raw 상수 orderBy 케이스 추가
    - `packages/orm-common/tests/select/order.expected.ts` — 위 케이스의 dialect 별 expected SQL
    - `packages/orm-common/tests/select/subquery.spec.ts` — union / union+wrap raw 상수 orderBy 케이스 추가
    - `packages/orm-common/tests/select/subquery.expected.ts` — 위 케이스의 dialect 별 expected SQL
  - **변경 방식**:
    - 기존 페어 패턴(`*.spec.ts` + `*.expected.ts` + `toMatchSql` 매처) 그대로 따름.
    - 케이스별 expected SQL 은 mysql/mssql/postgresql 3 dialect 모두 작성 (기존 케이스와 동일 정책).
    - 근거: `packages/orm-common/tests/select/order.spec.ts:1-23` + `order.expected.ts:1-26` 페어 패턴.
  - **테스트**:
    - 방식: TDD (테스트 자체가 산출물이므로 R1/R2 fix 전에 작성 → 실패 확인 → fix → 통과)

- [ ] R4: ColumnPrimitive 범위 밖 raw 값이 들어왔을 때의 처리
  - **현황**: 구현(정책 흡수)
    - 근거: spec R4 의 정책(null/undefined 그대로 통과, ColumnPrimitive 인식 타입만 ExprUnit 화) 은 R1 헬퍼와 R2 분기 안에서 처리됨. 별도 변경 없음.
  - **변경 위치**: (R1/R2 분기로 흡수)
  - **변경 방식**: (R1/R2 분기로 흡수)
  - **테스트**:
    - 방식: TDD
    - 케이스:
      - null/undefined 통과: `select((u) => ({ id: u.id, x: null }))` 의 SELECT 본문 SQL 이 수정 전후 동일 (raw NULL 자리채움 패턴 보존). orderBy 시도는 케이스에 포함하지 않음 — 잘못된 사용 영역.

## 작업 순서
- **의존**:
  - R1·R2 는 헬퍼 정책 공유 (한 PR 단위로 묶임). 둘 사이 강한 의존은 없으나 같이 변경하는 게 자연스럽다.
  - R3 는 R1·R2 검증용. TDD 흐름에서 R3 작성 → 실패 확인 → R1·R2 fix → 통과 순.
  - R4 는 R1·R2 분기 안에 흡수.
- **권장 순서**: R3 (실패 케이스 작성) → R1 + R2 (헬퍼 추가 + 두 위치 수정) → R3 (테스트 통과 + SQL 회귀 확인) → R4 케이스 추가
- **병렬 가능**: R1 과 R2 는 같은 파일 내 인접 변경이라 한 패치로 묶음. 병렬 의미 약함.

## 통합/E2E 테스트
- po-update-result 화면 케이스 재현(adtek 워크스페이스): `Queryable.union(reviseQr, newQr).orderBy("rowType", "DESC")` 호출 시 TypeError 발생 안 함. 단, 이 검증은 simplysm 저장소 테스트에 포함하지 않음(외부 워크스페이스). 본 REQ 의 단위 테스트(R3)가 통과하면 동일 클래스의 결함이 모두 해소됨을 보장.
- `pnpm test` 전체 회귀: `node`/`browser`/`angular`/`sd-cli-server`/`sd-cli-client`/`service` 프로젝트 통과(기존 SQL 회귀 깨짐 없음 확인). `orm` 프로젝트는 Docker DB 필요로 별도 트리거.
