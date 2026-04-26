# API Index — @simplysm/orm-common

> API 이름을 알고 있을 때 해당 문서를 찾는 인덱스.
> 작업 기반으로 찾으려면 [README.md](./README.md) 참조.

## Core

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `DbContext` | class | [db-context.md](./core/db-context.md) | DB 연결/트랜잭션/DDL/초기화를 관리할 때 |
| `DbTransactionError` | class | [db-transaction-error.md](./core/db-transaction-error.md) | 트랜잭션 에러를 DBMS 독립적으로 처리할 때 |

## Queryable / Executable

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `Queryable` | class | [queryable.md](./queryable-executable/queryable.md) | SELECT/INSERT/UPDATE/DELETE/UPSERT 쿼리를 체이닝으로 구성할 때 |
| `Executable` | class | [executable.md](./queryable-executable/executable.md) | Stored Procedure를 실행할 때 |
| `parseSearchQuery` | function | [parse-search-query.md](./queryable-executable/parse-search-query.md) | 사용자 검색 텍스트를 SQL LIKE 패턴으로 변환할 때 |

## Expression

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `expr` | const | [expr.md](./expression/expr.md) | WHERE 조건, SELECT 표현식, 집계/윈도우 함수를 작성할 때 |
| `ExprUnit` | class | [expr-unit.md](./expression/expr-unit.md) | 표현식의 타입 정보를 래핑하여 타입 안전 체인을 구성할 때 |

## Schema Builders

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `Table` | function | [table.md](./schema-builders/table.md) | 테이블 스키마를 정의할 때 |
| `View` | function | [view.md](./schema-builders/view.md) | 뷰 스키마를 정의할 때 |
| `Procedure` | function | [procedure.md](./schema-builders/procedure.md) | Stored Procedure 스키마를 정의할 때 |
| `ColumnBuilder` | class | [column-builder.md](./schema-builders/column-builder.md) | 컬럼의 타입/nullable/autoIncrement/default를 설정할 때 |
| `IndexBuilder` | class | [index-builder.md](./schema-builders/index-builder.md) | 인덱스를 정의할 때 |
| `ForeignKeyBuilder` | class | [foreign-key-builder.md](./schema-builders/foreign-key-builder.md) | FK/역참조/논리적 관계를 정의할 때 |

## Models

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `_Migration` | const | [migration.md](./models/migration.md) | 마이그레이션 이력을 관리하는 시스템 테이블 |

## Query Builder

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `createQueryBuilder` | function | [create-query-builder.md](./query-builder/create-query-builder.md) | QueryDef AST를 dialect별 SQL 문자열로 변환할 때 (테스트용) |

## Types

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `Dialect` | type | [dialect.md](./types/dialect.md) | DB 방언 및 런타임 타입을 참조할 때 |
| `DataType` | type | [data-type.md](./types/data-type.md) | SQL 데이터 타입 매핑을 참조할 때 |
| `QueryDef` | type | [query-def.md](./types/query-def.md) | SQL AST 구조를 이해할 때 |
| `Expr` | type | [expr.md](./types/expr.md) | 표현식 AST 구조를 이해할 때 |
| `parseQueryResult` | function | [parse-query-result.md](./types/parse-query-result.md) | DB 원시 결과를 중첩 TypeScript 객체로 변환할 때 (커스텀 executor용) |
| `pickResultSets` | function | [pick-result-sets.md](./types/pick-result-sets.md) | 여러 result set 중 QueryBuildResult 메타데이터가 가리키는 결과만 꺼낼 때 |
