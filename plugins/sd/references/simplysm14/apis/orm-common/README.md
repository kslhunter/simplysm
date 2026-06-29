# @simplysm/orm-common

Dialect 독립 ORM 공통 API. 스키마 빌더, `DbContext`, `Queryable` 체이닝, `expr` AST, dialect 별 SQL 렌더러, 결과 파싱 유틸리티를 제공한다.

## 사용 트리거 인덱스

- **DbContext / DDL / 마이그레이션** — `DbContext` 를 상속하거나 executor·트랜잭션·DDL·초기화 흐름을 다룰 때. 자세히: [db-context.md](./db-context.md)
- **스키마 빌더** — `Table`/`View`/`Procedure`, column/index/relation 빌더, `$infer*` 타입을 정의·해석할 때. 사용법: [orm.md](../../manuals/orm.md). 자세히: [schema.md](./schema.md)
- **Queryable / Executable / 검색** — `db.X()` 체이닝으로 SELECT/CUD/UPSERT, join/include/recursive/union, 프로시저 실행, 텍스트 검색을 작성할 때. 사용법: [orm.md](../../manuals/orm.md), [orm-union.md](../../manuals/orm-union.md). 자세히: [queryable.md](./queryable.md)
- **expr 표현식 빌더** — `where`/`select`/`groupBy`/`having`/`update` 콜백에서 비교·문자열·숫자·날짜·집계·윈도우 AST를 만들 때. 사용법: [orm.md](../../manuals/orm.md). 자세히: [expr.md](./expr.md)
- **타입 / QueryDef·Expr AST / QueryBuilder / 결과 파싱** — executor·dialect 어댑터 구현, AST 직접 생성·검사, SQL 렌더링, 원시 결과 변환을 다룰 때. 자세히: [types.md](./types.md)
