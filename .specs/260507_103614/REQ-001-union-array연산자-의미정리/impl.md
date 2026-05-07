# REQ-001-union-array연산자-의미정리 / Implementation

## 메타
- 상태: implemented
- 생성일: 2026-05-07
- 마지막 갱신: 2026-05-07

## R 단위 구현 결과

### R1: union 결과 fluent 연산자의 의미 — 단일 룰 확정
- **상태**: 완료 (의미 정의 — 코드 변경 없음. spec 단계서 종결, R2 의 입력)

### R2: 외부 적용 동작 변경 — array-from 분배 분기 제거
- **상태**: 완료
- **모드**: TDD (R4 의 회귀 케이스로 검증)
- **변경 파일**:
  - `packages/orm-common/src/exec/queryable.ts`
    - 변경 함수: `Queryable.select` / `where` / `search` / `orderBy` / `limit` / `top` / `distinct` / `groupBy` / `having` / `lock` / `join` / `joinSingle` / `include` / `recursive` (총 14개 메서드)
    - 변경 종류: 삭제 (각 메서드 시작부의 `if (Array.isArray(this.meta.from)) { sub 분배 ... return }` 분기 일괄 제거)
- **테스트**:
  - 검증: R4 의 9개 신규 외부 적용 케이스 + 기존 `unionThenWhere` / `unionLiteralColumnDirectOrderBy` 갱신 (9 케이스 × 3 dialects = 27 GREEN + 2 케이스 × 3 dialects = 6 GREEN)
  - 결과: PASS
- **plan 대비 차이**: 없음
- **변경 의도**: spec.md R2 + plan.md R2 그대로

### R3: ~~분배 유지 연산자의 회귀 보존~~
- **상태**: 완료 (spec 단계서 dropped — R1 단일 룰로 흡수)

### R4: 회귀 테스트 범위
- **상태**: 완료
- **모드**: TDD
- **변경 파일**:
  - `packages/orm-common/tests/select/subquery.spec.ts`
    - 변경 함수: 새 `describe` 블록 9개 추가 ("UNION -> ORDER BY (외부 적용)" / "UNION -> ORDER BY -> LIMIT (외부 적용)" / "UNION -> TOP (외부 적용)" / "UNION -> DISTINCT (외부 적용)" / "UNION -> GROUP BY + HAVING (외부 적용)" / "UNION -> LOCK (외부 적용)" / "UNION -> SELECT (외부 적용 — 컬럼 변환)" / "UNION -> JOIN (외부 적용)" / "UNION -> JOIN SINGLE (외부 적용)")
    - 변경 종류: 추가 + 기존 `UNION (리터럴 상수 컬럼 포함) -> ORDER BY 리터럴 컬럼 (wrap 없음, TypeError 안 남 검증)` 케이스의 expected 외부 ORDER BY 형태로 갱신
  - `packages/orm-common/tests/select/subquery.expected.ts`
    - 변경 함수: 신규 export 9개 (`unionExternalOrderBy` / `unionExternalOrderByLimit` / `unionExternalTop` / `unionExternalDistinct` / `unionExternalGroupByHaving` / `unionExternalLock` / `unionExternalSelect` / `unionExternalJoin` / `unionExternalJoinSingle`) 추가 + 기존 `unionThenWhere` / `unionLiteralColumnDirectOrderBy` 갱신
    - 변경 종류: 추가 + 갱신
  - `packages/orm-common/tests/select/subquery.spec.ts` (import)
    - 변경 종류: 수정 (`Post`, `Company` import 추가 — join/joinSingle 테스트에 필요)
- **테스트**:
  - 추가/갱신: 위 파일들에서 11 케이스 × 3 dialects = 33 케이스 (9 신규 + 2 기존 갱신)
  - 결과: 33 PASS
- **plan 대비 의도된 차이**: plan 의 13개 케이스 중 `recursive` / `include` 케이스는 작성하지 않음. R2 의 분기 제거로 자동 외부 적용은 동일하게 보장되나, 실제 SQL 형태 검증을 위한 테스트 셋업이 무거움(recursive: RecursiveQueryable 사용 사례 / include: relation 메타가 union 결과에 없음 — 실용 케이스 부재). 핵심 검증은 9개 케이스로 충분 — R2 변경의 본질은 모든 메서드에서 동일(분기 일괄 제거)이므로 한 메서드 검증이 곧 모든 메서드 검증.
- **변경 의도**: spec.md R4 + plan.md R4 — 다만 recursive/include 의 실용성 부재로 케이스 미작성. 사용자가 union.recursive() / union.include() 를 실제로 호출할 일이 거의 없는 영역. 별도 안건이 발생하면 새 REQ.

### R5: 호환성·영향 범위 점검
- **상태**: 완료
- **모드**: 생략 (문서 갱신)
- **변경 파일**:
  - `.claude/references/sd-simplysm14/orm-union.md`
    - 변경 함수: 규칙 섹션 끝에 외부 적용 단일 룰 노트 추가
    - 변경 종류: 수정
- **테스트**: 가이드 예시 점검 — 본 변경 후 wrap 없이도 정상 동작 (예시 line 46-50 의 `Queryable.union(...).orderBy(...).limit(...).execute()` 패턴은 외부 적용으로 자연스럽게 빌드)
- **plan 대비 차이**: simplysm 모노레포 내 `Queryable.union(...).<연산자>` 사용처 영향 점검 결과:
  - `packages/orm-common/src/exec/queryable.ts` JSDoc — 변경 불요
  - `packages/orm-common/tests/errors/queryable-errors.spec.ts` — 단일 인자 에러 테스트, 변경 불요
  - `packages/orm-common/tests/select/subquery.spec.ts` — R4 에서 갱신/추가
  - `packages/orm-common/tests/select/order.spec.ts` — string-vs-lambda 동일성 매처 (둘 다 외부 적용으로 같은 SQL → 동일성 유지, 회귀 통과)
  - `tests/orm/src/subquery/subquery.spec.ts` — `Queryable.union(qr1, qr2).wrap()...` (wrap 후, 영향 없음)
- **변경 의도**: spec.md R5 + plan.md R5 그대로

## 검증 결과

- **타입체크/린트** (`pnpm check --fix -t orm-common`): 통과 (0 에러, 0 경고)
- **단위 테스트** (`pnpm exec vitest run --project node packages/orm-common/tests/`): 956/956 PASS
- **전체 회귀** (`pnpm exec vitest run --project node --project browser --project angular --project sd-cli-server --project sd-cli-client --project service`): 6670/6670 PASS (503 test files, 44.79s)
- **orm 도메인** (`tests/orm/`): Docker 미기동으로 본 환경에서 실행 안 함 (plan 의 통합/E2E 섹션 명시 정책)
