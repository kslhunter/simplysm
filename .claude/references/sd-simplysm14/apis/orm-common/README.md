# @simplysm/orm-common

Dialect 독립 ORM 코어. 테이블/뷰/프로시저를 fluent builder 로 정의하고, `DbContext` 클래스에 등록한 뒤, 체이닝 `Queryable` 로 타입 안전한 SELECT/CUD 쿼리를 JSON AST(`QueryDef`/`Expr`)로 조립한다. 실제 SQL 변환은 이 패키지의 dialect QueryBuilder(MySQL/MSSQL/PostgreSQL)가, DB 연결·실행은 `DbContextExecutor` 구현체(`@simplysm/orm-node` 등)가 담당한다.

## 사용 트리거 인덱스

- **스키마 정의 (Table/View/Procedure/Column/Index/Relation 빌더)** — DB 객체를 fluent 빌더로 선언하고 column·PK·index·FK 관계를 잡을 때. 자세히: [schema.md](./schema.md)
- **DbContext (연결·트랜잭션·DDL·마이그레이션·초기화·트랜잭션 에러)** — 빌더들을 한 컨텍스트에 등록하고 `connect`/`transaction` 으로 실행, DDL·migration·`initialize` 를 돌리거나 `DbTransactionError` 를 처리할 때. 자세히: [db-context.md](./db-context.md)
- **Queryable (SELECT/JOIN/CUD 체이닝 · 프로시저 실행 · 검색 파서)** — `db.user()` 로 받은 쿼리 빌더에 where/orderBy/join/include/group/recursive/union 을 걸고 execute/single/count/insert/update/delete/upsert 하거나, `Executable` 로 프로시저를 실행하고 `search()` 텍스트 검색을 쓸 때. 자세히: [queryable.md](./queryable.md)
- **expr (SQL 표현식 빌더)** — where/select/orderBy 콜백 안에서 비교·문자열·숫자·날짜·집계·조건·window·서브쿼리 표현식을 만들 때. 자세히: [expr.md](./expr.md)
- **타입·실행 엔진 내부 (QueryDef/Expr/Column 타입 · dialect QueryBuilder · 결과 파서)** — executor·QueryBuilder 를 직접 구현하거나 AST·결과 메타를 다루고, QueryDef 를 SQL 로 렌더링하거나 raw 결과를 환원할 때. 자세히: [types.md](./types.md)

모든 군이 별도 파일로 분할되어 있다. README 인라인 섹션은 두지 않는다.
