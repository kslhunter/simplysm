# @simplysm/orm-node

> Node.js 환경에서 MSSQL, MySQL, PostgreSQL에 대한 저수준 DB 연결 및 ORM 실행자를 제공한다.
> `@simplysm/orm-common`의 `DbContext`와 함께 사용하며, 네이티브 드라이버(tedious, mysql2, pg)를 선택적 peerDependency로 지연 로딩한다.

## Installation

```bash
npm install @simplysm/orm-node
```

Peer dependencies (사용하는 DBMS에 따라 선택적 설치):

```bash
# MySQL
npm install mysql2

# PostgreSQL
npm install pg pg-copy-streams

# MSSQL
npm install tedious
```

## 하려는 작업 → 먼저 읽을 파일

| 작업 | 먼저 읽을 파일 |
|------|----------------|
| DbContext로 ORM 쿼리 실행 | [createOrm](./core/create-orm.md) |
| 저수준 SQL 직접 실행 | [createDbConn](./core/create-db-conn.md) |
| 연결 설정 구성 | [DbConnConfig](./types/db-conn-config.md) |
| 특정 DBMS의 bulk insert 동작 확인 | [MssqlDbConn](./connections/mssql-db-conn.md), [MysqlDbConn](./connections/mysql-db-conn.md), [PostgresqlDbConn](./connections/postgresql-db-conn.md) |
| DbConn 인터페이스 확인 | [DbConn](./types/db-conn.md) |

## API Overview

### Types

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`DbConn`](./types/db-conn.md) | interface | DbConn 구현체의 공통 인터페이스를 확인할 때 |
| [`DbConnConfig`](./types/db-conn-config.md) | type | DB 연결 설정을 구성할 때. `dialect` 필드로 DBMS를 결정한다 |
| [`DB_CONN_CONNECT_TIMEOUT`](./types/db-conn-constants.md) | const | 타임아웃 상수나 오류 메시지 상수를 참조할 때 |
| [`getDialectFromConfig`](./types/get-dialect-from-config.md) | function | `DbConnConfig`에서 정규화된 `Dialect`를 추출할 때 (`"mssql-azure"` → `"mssql"`) |

### Connections

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`MssqlDbConn`](./connections/mssql-db-conn.md) | class | MSSQL/Azure SQL에 저수준으로 연결할 때 (tedious 사용) |
| [`MysqlDbConn`](./connections/mysql-db-conn.md) | class | MySQL에 저수준으로 연결할 때 (mysql2/promise 사용) |
| [`PostgresqlDbConn`](./connections/postgresql-db-conn.md) | class | PostgreSQL에 저수준으로 연결할 때 (pg + pg-copy-streams 사용) |

### Core

| Entry | Kind | 언제 쓰나 |
|-------|------|-----------|
| [`createDbConn`](./core/create-db-conn.md) | function | dialect 기반으로 DbConn 인스턴스를 자동 생성할 때 |
| [`NodeDbContextExecutor`](./core/node-db-context-executor.md) | class | DbContext 내부에서 사용하는 실행자. 직접 사용할 일은 거의 없다 |
| [`createOrm`](./core/create-orm.md) | function | DbContext 서브클래스와 연결 설정으로 트랜잭션 관리 ORM 인스턴스를 만들 때 |

## 이 패키지를 쓰지 말아야 할 때

- 브라우저/클라이언트에서 DB 접근 → `@simplysm/service-client`로 서버를 경유한다.
- ORM 쿼리빌더·스키마 정의만 필요 → `@simplysm/orm-common`을 직접 사용한다.
