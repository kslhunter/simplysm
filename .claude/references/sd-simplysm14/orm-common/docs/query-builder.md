# Query Builder

## `createQueryBuilder`

주어진 Dialect에 맞는 QueryBuilder 인스턴스를 생성한다.

```typescript
export function createQueryBuilder(dialect: Dialect): QueryBuilderBase;
```

| Dialect | Builder |
|---------|---------|
| `"mysql"` | `MysqlQueryBuilder` |
| `"mssql"` | `MssqlQueryBuilder` |
| `"postgresql"` | `PostgresqlQueryBuilder` |

## `QueryBuilderBase`

QueryDef -> SQL 문자열 변환 추상 클래스. 각 Dialect별 구현체가 상속한다.

```typescript
export abstract class QueryBuilderBase {
  build(queryDef: QueryDef): QueryBuildResult;
}
```

`build()` 메서드는 `QueryDef` AST를 받아 SQL 문자열과 결과 셋 메타데이터를 포함하는 `QueryBuildResult`를 반환한다.

## `ExprRendererBase`

Expr -> SQL 표현식 문자열 변환 추상 클래스. 각 Dialect별 구현체가 상속한다.

```typescript
export abstract class ExprRendererBase {
  // 내부적으로 QueryBuilderBase에서 사용
}
```

## `MysqlQueryBuilder`

MySQL용 QueryBuilder 구현체.

```typescript
export class MysqlQueryBuilder extends QueryBuilderBase {
  // MySQL 8.0.14+ 문법 사용
}
```

## `MysqlExprRenderer`

MySQL용 ExprRenderer 구현체.

```typescript
export class MysqlExprRenderer extends ExprRendererBase {
  // MySQL 고유 함수/구문 사용 (<=>, IFNULL, DATE_FORMAT 등)
}
```

## `MssqlQueryBuilder`

MSSQL용 QueryBuilder 구현체.

```typescript
export class MssqlQueryBuilder extends QueryBuilderBase {
  // MSSQL 2012+ 문법 사용 (OFFSET/FETCH, OUTPUT 등)
}
```

## `MssqlExprRenderer`

MSSQL용 ExprRenderer 구현체.

```typescript
export class MssqlExprRenderer extends ExprRendererBase {
  // MSSQL 고유 함수/구문 사용 (ISNULL, CONVERT, CHARINDEX 등)
}
```

## `PostgresqlQueryBuilder`

PostgreSQL용 QueryBuilder 구현체.

```typescript
export class PostgresqlQueryBuilder extends QueryBuilderBase {
  // PostgreSQL 9.0+ 문법 사용
}
```

## `PostgresqlExprRenderer`

PostgreSQL용 ExprRenderer 구현체.

```typescript
export class PostgresqlExprRenderer extends ExprRendererBase {
  // PostgreSQL 고유 함수/구문 사용 (COALESCE, TO_CHAR, POSITION 등)
}
```
