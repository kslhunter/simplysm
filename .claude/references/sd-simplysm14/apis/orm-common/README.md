# @simplysm/orm-common

Dialect(MySQL/MSSQL/PostgreSQL) 독립 ORM 코어. 스키마를 빌더로 정의하고, `DbContext` 를 상속해 연결/트랜잭션/DDL 을 다루며, `Queryable` 체이닝과 `expr` 표현식 빌더로 타입 안전한 쿼리 AST(QueryDef/Expr)를 만든 뒤 dialect 별 QueryBuilder 로 SQL 을 렌더링한다. 실제 DB 연결·실행은 `@simplysm/orm-node` 등 `DbContextExecutor` 구현체가 담당하고, 이 패키지 자체는 dialect 독립 로직(빌더·AST·SQL 문자열 생성)까지만 가진다.

## 사용 트리거 인덱스

- **DbContext / 연결·트랜잭션·DDL·마이그레이션** — `DbContext` 를 상속해 테이블·뷰·프로시저를 프로퍼티로 등록하고 `connect`/`transaction`/`createTable`/`initialize` 등으로 연결·트랜잭션 경계와 스키마 변경을 다룰 때. 자세히: [db-context.md](./db-context.md)
- **스키마 빌더 (Table/View/Procedure/Column/Index/Relation)** — `Table()`/`View()`/`Procedure()` 와 column·index·relation 팩토리로 테이블·뷰·프로시저 정의를 fluent 하게 작성할 때. 자세히: [schema.md](./schema.md)
- **Queryable / Executable / 검색** — `db.X()` 로 시작하는 SELECT/INSERT/UPDATE/DELETE/UPSERT 체이닝, join/include/union/recursive, 텍스트 검색(`search`/`parseSearchQuery`), 프로시저 실행을 작성할 때. 자세히: [queryable.md](./queryable.md)
- **expr 표현식 빌더** — `where`/`select`/`groupBy`/`orderBy` 콜백 안에서 비교·논리·문자열·숫자·날짜·집계·조건·윈도우·서브쿼리 표현식을 만들 때. `ExprUnit`/`WhereExprUnit`/`ExprInput`/`expr.val`/`expr.raw` 포함. 자세히: [expr.md](./expr.md)
- **타입 / QueryDef·Expr AST / QueryBuilder / 결과 파싱** — executor 구현, dialect 별 SQL 렌더링(`createQueryBuilder`), QueryDef/Expr AST 타입, 컬럼 원시 타입(`ColumnPrimitive*`/`DataType`), 결과 변환(`parseQueryResult`/`pickResultSets`)을 다룰 때. 자세히: [types.md](./types.md)

## 전형적 사용 흐름

이 패키지의 export 는 위 5개 군으로 나뉘며 모두 별도 `.md` 로 분할되어 있다.

1. `schema.md` — `Table("User").columns(...).primaryKey(...).relations(...)` 로 스키마 정의.
2. `db-context.md` — `class AppDb extends DbContext { user = this.queryable(User); }` 로 컨텍스트 구성, `db.connect(async () => { ... })` 로 트랜잭션 경계 잡기.
3. `queryable.md` + `expr.md` — `db.user().where((u) => [expr.eq(u.id, 1)]).execute()` 형태로 조회·CUD.
4. `types.md` — executor·dialect 어댑터를 직접 구현하거나 AST/결과 파싱을 다룰 때.
