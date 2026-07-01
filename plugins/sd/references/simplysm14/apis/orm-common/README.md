# @simplysm/orm-common

Dialect 독립 ORM 공통 라이브러리. SQL 문자열 대신 JSON AST(`QueryDef`/`Expr`)를 만들고, dialect 별 QueryBuilder 가 MySQL·MSSQL·PostgreSQL SQL 로 렌더링한다. 스키마 빌더(`Table`/`View`/`Procedure`), `DbContext` 연결·트랜잭션·DDL, `Queryable` 체이닝 CUD, `expr` 표현식 빌더, 결과 파싱 유틸리티를 제공한다.

`browser`/`node`/`neutral` 어디서나 쓰이는 neutral target 패키지이며, 실제 DB 연결·실행은 소비자가 주입하는 `DbContextExecutor`(서버 `orm-node`, 클라이언트 service) 가 담당한다.

## 사용 트리거 인덱스

- **DbContext / 연결·트랜잭션 / DDL / 마이그레이션 / 트랜잭션 에러** — `DbContext` 를 상속해 table/view/procedure 를 프로퍼티로 등록하고, `connect`/`transaction`/`initialize`/DDL 메서드와 `DbErrorCode`·`DbTransactionError` 를 다룰 때. 사용법: [client-orm.md](../../manuals/client-orm.md). 자세히: [db-context.md](./db-context.md)
- **스키마 빌더 (Table/View/Procedure/Column/Index/Relation)** — `Table`/`View`/`Procedure` fluent API, column/index/relation factory, `$inferSelect`/`$inferInsert`/`$inferUpdate` 추론 타입을 정의·해석할 때. 사용법: [orm.md](../../manuals/orm.md). 자세히: [schema.md](./schema.md)
- **Queryable / Executable / 검색** — `db.X()` 체이닝으로 SELECT·INSERT·UPDATE·DELETE·UPSERT, join/include/recursive/union, 프로시저 실행, 텍스트 검색을 작성할 때. 사용법: [orm.md](../../manuals/orm.md), [orm-union.md](../../manuals/orm-union.md). 자세히: [queryable.md](./queryable.md)
- **expr 표현식 빌더** — `where`/`select`/`groupBy`/`having`/`orderBy`/`update` 콜백에서 비교·문자열·숫자·날짜·조건·집계·윈도우 AST 를 만들 때. 사용법: [orm.md](../../manuals/orm.md). 자세히: [expr.md](./expr.md)
- **타입 / QueryDef·Expr AST / QueryBuilder / 결과 파싱** — executor·dialect 어댑터 구현, AST 직접 생성·검사, dialect SQL 렌더링(`createQueryBuilder`), 원시 결과 변환(`parseQueryResult`·`pickResultSets`)을 다룰 때. 자세히: [types.md](./types.md)
