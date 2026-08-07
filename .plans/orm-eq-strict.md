# orm: expr.eqStrict 신설 및 include 조인 최적화 (issue #46)

> 이 문서는 **계획**입니다. 작업을 슬라이스 단위로 쪼개 진행 순서와 상태를 관리합니다. 계획과 어긋나는 변경이 생기면 이 문서를 잊지 말고 갱신해야 합니다.

## 배경 (issue #46)

- PostgreSQL 은 `IS NOT DISTINCT FROM` 을 hash/merge join, index scan 조건으로 쓰지 못함 → `expr.eq` 기반 조인 전부 nested loop + seq scan.
- `expr.eq` 는 유일한 동등 비교 API 이며 NULL-safe(NULL == NULL → true) 의미를 소비자가 의존 중(`eq(col, undefined)` = IS NULL 매칭 패턴). 따라서 `eq` 자체를 `=` 로 바꾸는 것은 침묵 오동작 → 불가.
- `include()` 내부 조인은 항상 `PK ↔ FK` 쌍이고 PK 는 NOT NULL 이라 `=` 와 null-safe 비교의 결과가 100% 동일 → 무해하게 최적화 가능.
- 소비자가 직접 쓰는 조인 조건은 자동 치환 불가 → opt-in API `expr.eqStrict` 신설.

## 확정 사항

- `expr.eqStrict` 신설: 세 dialect 모두 표준 `=` 하나로 렌더. 계약: "NULL 이 끼면 항상 미매칭"(SQL 표준 3값 논리).
- 시그니처에서 target 쪽 `undefined` 비허용(항상 빈 결과가 되는 실수를 컴파일 타임 차단). nullable 컬럼끼리 비교는 허용.
- `include()`/`_include()` 내부 조인 조건은 **세 dialect 공통** eqStrict 로 교체(PG만 분기하지 않음. MSSQL OR 패턴의 2회 렌더 문제도 함께 해소).
- 기존 `expr.eq` 의 의미·렌더는 변경하지 않음.
- 완료 후 issue #46 에 한계와 이유(소비자 직접 `expr.eq` 는 자동 치환 불가 → eqStrict 활용 안내)를 코멘트하고 close.

## 슬라이스

| # | 슬라이스 | 내용 | 확인 방법 | 상태 |
|---|---|---|---|---|
| 1 | `expr.eqStrict` 신설 | `ExprEqStrict` 노드(`types/expr.ts`, WhereExpr 유니온 포함) + `expr.eqStrict` 헬퍼(`expr/expr.ts`) + 3개 렌더러에 `=` 렌더 + `tests/expr/comparison` 에 spec/expected 추가 | `pnpm test` 통과, 소비자가 `expr.eqStrict` 를 바로 사용 가능 | 완료 |
| 2 | include 조인 교체 | `queryable.ts:590/628` 의 `expr.eq` → `expr.eqStrict` + include 경유 기대 SQL 갱신(`tests/select/join.expected.ts` 등, 소비자가 직접 `expr.eq` 를 쓴 기대값은 유지) | `pnpm test` 통과, include SQL 이 `=` 로 렌더됨 | 완료 |
| 3 | issue #46 마감 | 한계·이유·eqStrict 안내 코멘트 작성 후 close (`gh issue comment` / `gh issue close`) | GitHub 이슈 상태 CLOSED | 완료 |

## 범위 제외

- MSSQL `eq` OR 패턴의 2회 렌더 문제 자체 수정(eq 유지 시나리오) — 별도 이슈.
- `in([null])` vs `eq(null)` NULL 의미 불일치 — 별도 이슈.
- upsert MERGE ON 의 null-safe eq — 소비자가 넘긴 조건이므로 이번 범위 아님.
