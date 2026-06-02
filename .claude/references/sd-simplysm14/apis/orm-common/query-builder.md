# @simplysm/orm-common — QueryBuilder (dialect SQL 렌더러)

`QueryDef` AST 를 각 DBMS SQL 문자열로 변환하는 클래스군. executor 구현체(`@simplysm/orm-node` 등)가 사용하며, 일반 쿼리 작성에선 직접 다루지 않는다.

## 팩토리

- `createQueryBuilder(dialect: Dialect): QueryBuilderBase` — dialect 에 맞는 QueryBuilder 인스턴스 생성. `dialect` 가 `"mysql"|"mssql"|"postgresql"` 중 하나에 따라 아래 구현체 반환.

```typescript
const builder = createQueryBuilder("mysql");
const { sql } = builder.build(queryDef);
```

## QueryBuilder 클래스

- `abstract class QueryBuilderBase` — QueryDef → SQL 추상 기반.
  - `build(def: QueryDef): QueryBuildResult` — `def.type` 과 동일 이름 메서드로 동적 dispatch 하여 SQL 렌더. 알 수 없는 타입이면 throw. dialect 공통 로직만 구현하고 차이나는 부분은 abstract(하위 클래스 구현).
- `class MysqlQueryBuilder extends QueryBuilderBase` — MySQL 렌더러.
- `class MssqlQueryBuilder extends QueryBuilderBase` — MSSQL 렌더러(TOP, IDENTITY_INSERT, OUTPUT 등).
- `class PostgresqlQueryBuilder extends QueryBuilderBase` — PostgreSQL 렌더러.

## ExprRenderer 클래스

`QueryBuilder` 내부에서 `Expr`/`WhereExpr` AST 를 SQL 식 문자열로 렌더.

- `abstract class ExprRendererBase` — 표현식 렌더 추상 기반. `render(expr)`/`renderWhere(wheres)` 를 dispatch, dialect 차이(함수명·NULL 안전 비교·날짜 함수 등)는 abstract.
- `class MysqlExprRenderer extends ExprRendererBase` — MySQL 표현식 렌더러(`<=>` 등).
- `class MssqlExprRenderer extends ExprRendererBase` — MSSQL 표현식 렌더러.
- `class PostgresqlExprRenderer extends ExprRendererBase` — PostgreSQL 표현식 렌더러.
