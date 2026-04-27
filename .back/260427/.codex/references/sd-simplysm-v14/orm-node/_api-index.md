# API Index — @simplysm/orm-node

> API 이름을 알고 있을 때 해당 문서를 찾는 인덱스.
> 작업 기반으로 찾으려면 [README.md](./README.md) 참조.

## Connections

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `MssqlDbConn` | class | [`mssql-db-conn.md`](./connections/mssql-db-conn.md) | MSSQL 또는 Azure SQL 저수준 연결 구현을 직접 다룰 때 |
| `MysqlDbConn` | class | [`mysql-db-conn.md`](./connections/mysql-db-conn.md) | MySQL 저수준 연결 구현을 직접 다룰 때 |
| `PostgresqlDbConn` | class | [`postgresql-db-conn.md`](./connections/postgresql-db-conn.md) | PostgreSQL 저수준 연결 구현을 직접 다룰 때 |

## Core

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `createDbConn` | function | [`create-db-conn.md`](./core/create-db-conn.md) | 연결 설정에서 dialect별 `DbConn` 구현체를 만들 때 |
| `createOrm` | function | [`create-orm.md`](./core/create-orm.md) | `DbContext` 클래스를 트랜잭션 경계와 함께 실행할 때 |
| `Orm` | interface | [`create-orm.md`](./core/create-orm.md) | `createOrm` 반환 객체의 타입을 명시할 때 |
| `OrmOptions` | interface | [`create-orm.md`](./core/create-orm.md) | `DbConnConfig`의 database/schema를 실행 옵션으로 덮어쓸 때 |
| `NodeDbContextExecutor` | class | [`node-db-context-executor.md`](./core/node-db-context-executor.md) | Node.js DB 연결을 `DbContextExecutor`로 연결할 때 |

## Types

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `DbConn` | interface | [`db-conn.md`](./types/db-conn.md) | DBMS별 연결 구현이 따라야 할 계약을 확인할 때 |
| `DbConnConfig` | type | [`db-conn-config.md`](./types/db-conn-config.md) | 연결 설정 union 타입을 받을 때 |
| `MysqlDbConnConfig` | interface | [`db-conn-config.md`](./types/db-conn-config.md) | MySQL 연결 설정을 작성할 때 |
| `MssqlDbConnConfig` | interface | [`db-conn-config.md`](./types/db-conn-config.md) | MSSQL/Azure SQL 연결 설정을 작성할 때 |
| `PostgresqlDbConnConfig` | interface | [`db-conn-config.md`](./types/db-conn-config.md) | PostgreSQL 연결 설정을 작성할 때 |
| `getDialectFromConfig` | function | [`get-dialect-from-config.md`](./types/get-dialect-from-config.md) | `mssql-azure`를 쿼리 빌더용 `mssql` dialect로 정규화할 때 |
| `DB_CONN_CONNECT_TIMEOUT` | const | [`db-conn-constants.md`](./types/db-conn-constants.md) | 연결 수립 타임아웃 값을 확인할 때 |
| `DB_CONN_DEFAULT_TIMEOUT` | const | [`db-conn-constants.md`](./types/db-conn-constants.md) | 쿼리·유휴 연결 타임아웃 값을 확인할 때 |
| `DB_CONN_ERRORS` | const | [`db-conn-constants.md`](./types/db-conn-constants.md) | 공통 연결 오류 메시지를 재사용할 때 |
