# API Index — @simplysm/orm-node

> API 이름을 알고 있을 때 해당 문서를 찾는 인덱스.
> 작업 기반으로 찾으려면 [README.md](./README.md) 참조.

## Types

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `DbConn` | interface | [db-conn.md](./types/db-conn.md) | DBMS에 무관한 연결 객체의 공통 인터페이스를 확인할 때 |
| `DbConnConfig` | type | [db-conn-config.md](./types/db-conn-config.md) | DB 연결 설정을 구성할 때. `dialect` 필드로 DBMS를 결정한다 |
| `DB_CONN_CONNECT_TIMEOUT` | const | [db-conn-constants.md](./types/db-conn-constants.md) | 타임아웃 상수나 오류 메시지 상수를 참조할 때 |
| `getDialectFromConfig` | function | [get-dialect-from-config.md](./types/get-dialect-from-config.md) | `DbConnConfig`에서 정규화된 `Dialect`를 추출할 때 |

## Connections

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `MssqlDbConn` | class | [mssql-db-conn.md](./connections/mssql-db-conn.md) | MSSQL/Azure SQL에 저수준으로 연결할 때 |
| `MysqlDbConn` | class | [mysql-db-conn.md](./connections/mysql-db-conn.md) | MySQL에 저수준으로 연결할 때 |
| `PostgresqlDbConn` | class | [postgresql-db-conn.md](./connections/postgresql-db-conn.md) | PostgreSQL에 저수준으로 연결할 때 |

## Core

| API | Kind | 문서 | 언제 쓰나 |
|-----|------|------|-----------|
| `createDbConn` | function | [create-db-conn.md](./core/create-db-conn.md) | dialect 기반으로 DbConn 인스턴스를 자동 생성할 때 |
| `NodeDbContextExecutor` | class | [node-db-context-executor.md](./core/node-db-context-executor.md) | DbContext 내부에서 사용하는 실행자. 직접 사용할 일은 거의 없다 |
| `createOrm` | function | [create-orm.md](./core/create-orm.md) | DbContext 서브클래스와 연결 설정으로 트랜잭션 관리 ORM 인스턴스를 만들 때 |
