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

## 하려는 작업 → 읽을 파일

### ORM 쿼리 실행

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| DbContext 기반으로 트랜잭션 관리하며 ORM 쿼리를 실행할 때 | [createOrm](./core/create-orm.md) |

### SQL 직접 실행

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| ORM 없이 생 SQL을 직접 실행하거나 연결 생명주기를 직접 제어할 때 | [createDbConn](./core/create-db-conn.md) |
| 특정 DBMS의 bulk insert 동작이나 내부 구현을 확인할 때 (MSSQL) | [MssqlDbConn](./connections/mssql-db-conn.md) |
| 특정 DBMS의 bulk insert 동작이나 내부 구현을 확인할 때 (MySQL) | [MysqlDbConn](./connections/mysql-db-conn.md) |
| 특정 DBMS의 bulk insert 동작이나 내부 구현을 확인할 때 (PostgreSQL) | [PostgresqlDbConn](./connections/postgresql-db-conn.md) |

### 연결 설정 및 타입

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| DB 연결 설정을 구성할 때 (`dialect`별 필드 확인) | [DbConnConfig](./types/db-conn-config.md) |
| DBMS에 무관한 연결 인터페이스를 확인할 때 | [DbConn](./types/db-conn.md) |
| 타임아웃 상수나 오류 메시지 상수를 참조할 때 | [DB_CONN_CONNECT_TIMEOUT](./types/db-conn-constants.md) |
| `DbConnConfig`에서 정규화된 `Dialect`를 추출할 때 | [getDialectFromConfig](./types/get-dialect-from-config.md) |

### 내부 구현

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| DbContext 내부 실행자의 동작을 확인하거나 커스텀 실행 파이프라인을 구성할 때 | [NodeDbContextExecutor](./core/node-db-context-executor.md) |

## 이 패키지를 쓰지 말아야 할 때

- 브라우저/클라이언트에서 DB 접근 → `@simplysm/service-client`로 서버를 경유한다.
- ORM 쿼리빌더·스키마 정의만 필요 → `@simplysm/orm-common`을 직접 사용한다.

---

> API 이름으로 검색: [_api-index.md](./_api-index.md)
