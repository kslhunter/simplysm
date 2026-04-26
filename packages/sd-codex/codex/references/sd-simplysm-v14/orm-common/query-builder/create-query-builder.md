# `createQueryBuilder`

> **읽어야 하는 상황**: QueryDef AST를 dialect별 SQL 문자열로 변환할 때. 주로 테스트 목적으로 사용하며, 일반 쿼리 실행은 `Queryable.execute()`가 자동 처리한다.

주어진 Dialect에 맞는 QueryBuilder 인스턴스를 생성한다. `Queryable.execute()` 내부에서 자동 호출되며, 직접 호출은 테스트 목적에만 사용한다.

```typescript
export function createQueryBuilder(dialect: Dialect): QueryBuilderBase;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `dialect` | `Dialect` | `"mysql"` \| `"mssql"` \| `"postgresql"` |

## Returns

`QueryBuilderBase` — 해당 dialect의 QueryBuilder 구현체

## Related Types

### `QueryBuilderBase`

QueryDef → SQL 문자열 변환 추상 기본 클래스. 모든 dialect에서 100% 동일한 dispatch 로직만 구현하고, dialect별 차이는 abstract 메서드로 위임한다.

```typescript
export abstract class QueryBuilderBase {
  protected abstract expr: ExprRendererBase;

  build(def: QueryDef): QueryBuildResult;

  // DML
  protected select(def: SelectQueryDef): QueryBuildResult;
  protected insert(def: InsertQueryDef): QueryBuildResult;
  protected update(def: UpdateQueryDef): QueryBuildResult;
  protected delete(def: DeleteQueryDef): QueryBuildResult;
  protected upsert(def: UpsertQueryDef): QueryBuildResult;
  // ... 기타 DDL 메서드들
}
```

### `ExprRendererBase`

Expr AST → SQL 표현식 문자열 변환 추상 기본 클래스.

```typescript
export abstract class ExprRendererBase {
  render(expr: Expr): string;
  renderWhere(expr: WhereExpr): string;
  // ... dialect별 abstract 메서드들
}
```

### Dialect별 구현체

| 클래스 | 설명 |
|--------|------|
| `MysqlQueryBuilder` | MySQL 8.0.14+ 구현체 |
| `MysqlExprRenderer` | MySQL 표현식 렌더러 |
| `MssqlQueryBuilder` | MSSQL 2012+ 구현체 |
| `MssqlExprRenderer` | MSSQL 표현식 렌더러 |
| `PostgresqlQueryBuilder` | PostgreSQL 9.0+ 구현체 |
| `PostgresqlExprRenderer` | PostgreSQL 표현식 렌더러 |

## Usage

```typescript
// 일반적으로 직접 호출하지 않음 — Queryable.execute()가 내부적으로 처리

// 테스트에서 SQL 생성 검증 시 직접 사용
const builder = createQueryBuilder("mysql");  // | "mssql" | "postgresql"
const { sql } = builder.build(queryDef);
expect(sql).toBe("SELECT ...");

// dialect별 테스트
const dialects: Dialect[] = ["mysql", "mssql", "postgresql"];
it.each(dialects)("[%s] SQL 검증", (dialect) => {
  const { sql } = createQueryBuilder(dialect).build(queryDef);
  expect(sql).toBe(expected[dialect]);
});
```
