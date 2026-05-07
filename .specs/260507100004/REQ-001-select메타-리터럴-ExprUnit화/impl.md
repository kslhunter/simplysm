# REQ-001-select메타-리터럴-ExprUnit화 / Implementation

## 메타
- 상태: implemented
- 생성일: 2026-05-07
- 마지막 갱신: 2026-05-07

## R 단위 구현 결과

### R3: 회귀 테스트 추가
- **상태**: 완료
- **모드**: TDD
- **변경 파일**:
  - `packages/orm-common/tests/select/order.spec.ts`
    - 변경 함수: 새 `describe` 블록 3개 ("리터럴 상수 컬럼 -> ORDER BY 그 컬럼 (string overload)", "(lambda overload)", "null/undefined 컬럼 통과")
    - 변경 종류: 추가
  - `packages/orm-common/tests/select/order.expected.ts`
    - 변경 함수: 신규 export `literalColumnOrderByString`, `literalColumnOrderByLambda`, `literalNullColumn`
    - 변경 종류: 추가
  - `packages/orm-common/tests/select/subquery.spec.ts`
    - 변경 함수: 새 `describe` 블록 2개 ("UNION (리터럴 상수 컬럼 포함) -> ORDER BY 리터럴 컬럼 (wrap 없음, TypeError 안 남 검증)", "UNION (리터럴 상수 컬럼 포함) -> WRAP -> ORDER BY 리터럴 컬럼")
    - 변경 종류: 추가
  - `packages/orm-common/tests/select/subquery.expected.ts`
    - 변경 함수: 신규 export `unionLiteralColumnDirectOrderBy`, `unionLiteralColumnThenWrapThenOrderBy`
    - 변경 종류: 추가
- **테스트**:
  - 추가: 위 4 파일의 5 케이스 × 3 dialects = 15 케이스
  - 결과: 수정 전 9 FAIL (TypeError 정확히 spec 메시지와 일치) → 수정 후 15 PASS
- **plan 대비 차이**: mssql 에서 NVARCHAR string literal 이 `N'...'` 접두사로 렌더되는 점을 expected 에 반영(plan 에는 명시 없었으나 실제 동작 그대로 수용).
- **변경 의도**: spec.md R3 + plan.md R3 그대로 (TDD RED → GREEN 흐름)

### R1: select callback 결과 메타에 raw 상수가 들어오면 ExprUnit 으로 감싸 저장
- **상태**: 완료
- **모드**: TDD (R3 케이스로 검증)
- **변경 파일**:
  - `packages/orm-common/src/exec/queryable.ts`
    - 변경 함수: `Queryable.select` (메타 저장 직전 walk 적용)
    - 변경 종류: 수정
  - `packages/orm-common/src/exec/queryable.ts`
    - 변경 함수: `wrapColumnsPrimitives` (모듈 스코프 신설)
    - 변경 종류: 신설
  - `packages/orm-common/src/exec/queryable.ts`
    - 변경: `inferColumnPrimitiveStr` import 추가
    - 변경 종류: 수정
- **테스트**:
  - 검증: R3 의 단일 쿼리 + UNION 케이스가 GREEN
  - 결과: PASS
- **plan 대비 차이**: 없음
- **변경 의도**: spec.md R1 + plan.md R1 그대로

### R2: transformColumnsAlias 의 raw 상수 분기도 ExprUnit 으로 감싸 반환
- **상태**: 완료
- **모드**: TDD (R3 케이스로 검증)
- **변경 파일**:
  - `packages/orm-common/src/exec/queryable.ts`
    - 변경 함수: `transformColumnsAlias` (마지막 else 분기 → null 통과 + ExprUnit 화 분기)
    - 변경 종류: 수정
- **테스트**:
  - 검증: R3 의 UNION + WRAP 케이스가 GREEN (이 경로가 `transformColumnsAlias` 를 거침)
  - 결과: PASS
- **plan 대비 차이**: 없음
- **변경 의도**: spec.md R2 + plan.md R2 그대로

### R4: ColumnPrimitive 범위 밖 raw 값이 들어왔을 때의 처리
- **상태**: 완료
- **모드**: TDD (정책 흡수 — null/undefined 통과 회귀 케이스로 검증)
- **변경 파일**: (R1/R2 분기 안에 흡수 — null/undefined 통과 분기 명시 추가)
- **테스트**:
  - 검증: R3 의 `literalNullColumn` 케이스 (`select((u) => ({ id: u.id, x: null }))` SELECT 본문이 `NULL AS x` 로 정상 렌더)
  - 결과: PASS
- **plan 대비 차이**: 없음
- **변경 의도**: spec.md R4 + plan.md R4 그대로

## 검증 결과

- **타입체크/린트** (`pnpm check --fix -t orm-common`): 통과 (0 에러, 0 경고)
  - 시도 1회 — 초기 작성 시 `value === null || value === undefined` 가 프로젝트 린트 규칙(`no-restricted-syntax: "== null"`)을 위반해 `value == null` 한 줄로 정정.
- **단위 테스트** (`pnpm exec vitest run --project node packages/orm-common/tests/select/`): 325/325 PASS
- **전체 회귀** (`pnpm exec vitest run --project node --project browser --project angular --project sd-cli-server --project sd-cli-client --project service`): 6610/6610 PASS (503 test files)
- **orm 도메인** (`tests/orm/`): Docker 미기동으로 본 환경에서 실행 안 함 (plan.md 통합 테스트 섹션 명시 정책). 본 결함은 IR 빌드 단계라 단위 검증으로 충분.
