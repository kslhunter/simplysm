# CLAUDE.md — `@simplysm/orm-common`

루트 `CLAUDE.md` 의 모노레포 가이드를 먼저 따른다.

## 역할

DB 비종속 ORM 코어. **드라이버는 안 가지고**, 표현식·쿼리 빌더·DDL·스키마·실행 추상만 담는다. 빌드 타겟 `neutral`.

`orm-node` 가 이걸 들고 mssql/mysql/postgresql 드라이버에 붙는다. `service-client/features/orm` 도 이 정의에서 타입을 받아 원격 호출한다.

## 구조

| 경로                       | 내용                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| `db-context.ts`            | `DbContext` 베이스. 사용자가 상속해 테이블/뷰/프로시저 정의.                                      |
| `expr/`                    | 표현식 트리 — `expr-unit`, `expr`. WHERE/ORDER/SELECT projection 등 모든 SQL 조각의 IR.           |
| `query-builder/base/`      | DB 비종속 빌더(SELECT/INSERT/UPDATE/DELETE 골격).                                                 |
| `query-builder/{mssql,mysql,postgresql}/` | 방언별 override(이스케이프·LIMIT vs TOP·UPSERT 문법 등). DB별 분기는 **여기에만**.    |
| `query-builder/query-builder.ts` | 빌더 진입.                                                                                  |
| `exec/queryable.ts`        | LINQ 풍 fluent — `where`/`select`/`groupBy`/`include` 등.                                         |
| `exec/executable.ts`       | 실행 단위(파라미터 바인딩 + SQL 문자열).                                                          |
| `exec/search-parser.ts`    | 사용자 검색어 → 표현식 파싱(범위·OR·따옴표).                                                      |
| `ddl/`                     | DDL 모델(테이블/컬럼/관계/스키마)과 `initialize`(스키마 적용).                                    |
| `schema/`                  | `TableBuilder`, `ViewBuilder`, `ProcedureBuilder`, `factory/` — 사용자 모델 → DDL 변환.           |
| `models/system-migration.ts` | `_SystemMigration` 시스템 테이블 — 적용된 마이그레이션 추적.                                    |
| `types/`                   | 컬럼·표현식·쿼리·DB 타입.                                                                         |
| `utils/`                   | `result-parser`(결과 행 → 객체 트리), `pick-result-sets`(다중 결과셋 분리).                       |
| `errors/db-transaction-error.ts` | 트랜잭션 실패 표준 에러.                                                                    |

워크스페이스 의존: `@simplysm/core-common` 만.

## 작업 시 주의

- DB 드라이버 코드 금지. 새 DB 지원은 `orm-node/connections/` + `query-builder/<dialect>/` 추가로.
- 표현식은 IR(`expr/`) → 빌더가 SQL 문자열로 직렬화. 쿼리 변형 시 IR 단계에서 다루는 게 안전.
- `ProcedureBuilder` 의 OUTPUT/RETURN 처리는 방언별로 다르므로 DB별 빌더에 위임.
- 기존 마이그레이션은 절대 수정하지 마라(`_SystemMigration` 해시 불일치). 변경분은 새 마이그레이션으로.
