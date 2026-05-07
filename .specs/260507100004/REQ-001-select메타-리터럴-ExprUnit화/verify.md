# REQ-001-select메타-리터럴-ExprUnit화 / Verify

## 메타
- 상태: verified
- 생성일: 2026-05-07
- 마지막 갱신: 2026-05-07

## 검증 결과

### 코드 변경 검증
- `packages/orm-common/src/exec/queryable.ts` `Queryable.select` 메타 저장 직전 `wrapColumnsPrimitives` 적용 확인 ✓
- `packages/orm-common/src/exec/queryable.ts` `transformColumnsAlias` 마지막 분기 `null` 통과 + `ExprUnit` 화 확인 ✓
- `packages/orm-common/src/exec/queryable.ts` 신규 헬퍼 `wrapColumnsPrimitives` 분기 4종 확인 ✓
- `inferColumnPrimitiveStr` import 확인 ✓

### 테스트 직접 실행
- `pnpm exec vitest run --project node packages/orm-common/tests/select/` → 328/328 PASS
- `pnpm exec vitest run --project node packages/orm-common/tests/` → 929/929 PASS (orm-common 단위 테스트 전체)
- 추가된 회귀 케이스(spec R3 의 4 시나리오 모두): 단일 쿼리 / **union 직속 orderBy** / union+wrap+orderBy / null 통과 — 전부 PASS
- 타입체크/린트: 0 에러 / 0 경고

## R 단위 충족 판정

### R1: select callback 결과 메타에 raw 상수가 들어오면 ExprUnit 으로 감싸 저장
- **판정**: 충족
- **근거**: 코드 적용 확인 + R3 단일 쿼리 케이스 PASS

### R2: transformColumnsAlias 의 raw 상수 분기도 ExprUnit 으로 감싸 반환
- **판정**: 충족
- **근거**: 코드 적용 확인 + R3 union+wrap 케이스가 이 경로를 거침 (PASS)

### R3: 회귀 검증 범위
- **판정**: 충족
- **근거**: spec R3 가 명시한 회귀 검증 케이스 4 시나리오 모두 테스트 작성 + PASS:
  - 단일 쿼리: `select((u) => ({ id: u.id, label: "fixed" })).orderBy("label", "DESC")`
  - **union 직속**: `Queryable.union(qr1, qr2).orderBy("kind", "DESC")` — TypeError 안 남 + sub-SELECT 안 ORDER BY 가 들어가는 SQL 정상 빌드
  - union + wrap: `Queryable.union(qr1, qr2).wrap().orderBy("kind", "DESC")` — 외부 wrap SELECT 의 ORDER BY 가 wrap 컬럼에 적용
  - 기존 SQL 회귀(null/undefined 통과): `select((u) => ({ id: u.id, x: null }))` SELECT 본문이 `NULL AS x` 로 정상 렌더

### R4: ColumnPrimitive 범위 밖 raw 값이 들어왔을 때의 처리
- **판정**: 충족
- **근거**: null/undefined 통과 분기 + `inferColumnPrimitiveStr` 한정 ExprUnit 화 정책 코드 확인. `literalNullColumn` 케이스 PASS.

## 부가 메모 (충족 판정에 영향 없음)

- union 직속 orderBy 의 결과 SQL 은 sub-SELECT 마다 ORDER BY 가 박히는 형태(외부 union 결과 자체에는 ORDER BY 없음). 본 REQ 의 fix 범위 밖에 있는 `Queryable` array-from 분배 패턴 결함이 그대로 남아 있어 발생. 외부 정렬을 원한다면 `wrap()` 후 `orderBy()` 사용이 권장 패턴(`.claude/references/sd-simplysm14/orm-union.md` 가이드와 일치). 별도 REQ 로 다룰 안건.

## 시연
- 모든 R 의 plan 모드 = TDD → 시연 불필요.
