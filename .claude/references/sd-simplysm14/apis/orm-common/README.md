# @simplysm/orm-common

Dialect 독립적 ORM 코어. `DbContext` 를 상속해 테이블/뷰/프로시저를 등록하고, fluent `Queryable` 체이닝 + JSON AST `expr` 로 쿼리를 구성하면 dialect별 QueryBuilder 가 MySQL/MSSQL/PostgreSQL SQL 로 변환한다. 실제 DB 연결·실행은 `DbContextExecutor` 구현체(서버/클라이언트)가 담당하므로 이 패키지 자체는 SQL 문자열·QueryDef AST 까지만 생성한다.

## 사용 트리거 인덱스

- **DbContext / 연결 / 트랜잭션 / DDL / 마이그레이션** — DB 컨텍스트 클래스를 정의하거나, `connect`/`transaction` 으로 쿼리를 감싸거나, 스키마를 생성·변경하거나, `initialize`/`migrations` 로 마이그레이션을 돌릴 때. `DbTransactionError`·`Migration`·`IsolationLevel`·`DbContextExecutor` 포함. 자세히: [db-context.md](./db-context.md)
- **스키마 정의 (Table / View / Procedure / column / index / relation)** — `Table(...)`/`View(...)`/`Procedure(...)` 빌더로 테이블·뷰·프로시저 스키마와 column·PK·index·FK 관계를 선언하고 타입을 추론할 때. 자세히: [schema.md](./schema.md)
- **Queryable 체이닝 / CRUD 실행 / 검색** — `db.X()` 로 얻은 `Queryable` 을 `select`/`where`/`join`/`include`/`groupBy`/`orderBy` 로 조립하고 `execute`/`single`/`count`/`insert`/`update`/`delete`/`upsert` 로 실행할 때. `Queryable.union`·`search`·`Executable`·`parseSearchQuery` 포함. 자세히: [queryable.md](./queryable.md)
- **expr 표현식 빌더** — `where`/`select`/`orderBy`/`having` 콜백 안에서 비교·논리·문자열·숫자·날짜·집계·window·조건·서브쿼리 표현식을 만들 때. `ExprUnit`/`WhereExprUnit`/`ExprInput` 포함. 자세히: [expr.md](./expr.md)
- **하위 타입 / QueryDef AST / QueryBuilder / 결과 파싱** — Executor·QueryBuilder 를 직접 구현하거나, `QueryDef` AST·`Expr` AST·column 타입을 다루거나, 원시 결과를 `parseQueryResult`/`pickResultSets` 로 변환할 때. 자세히: [types.md](./types.md)
