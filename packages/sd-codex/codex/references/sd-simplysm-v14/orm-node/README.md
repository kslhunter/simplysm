# @simplysm/orm-node

> Node.js 런타임에서 `@simplysm/orm-common`의 `DbContext`를 실제 데이터베이스 연결로 실행한다. MSSQL/Azure SQL은 `tedious`, MySQL은 `mysql2`, PostgreSQL은 `pg`와 `pg-copy-streams`를 사용한다.

## Installation

```bash
npm install @simplysm/orm-node
```

## 먼저 읽기

- [`@simplysm/orm-common`](../orm-common/README.md) — `DbContext`, `QueryDef`, 스키마 메타데이터를 작성할 때 먼저 확인.

## 하려는 작업 → 읽을 파일

### DbContext 실행하기

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| `DbContext` 서브클래스를 트랜잭션 경계와 함께 실행할 때 | [`createOrm`](./core/create-orm.md) |
| `DbContextExecutor` 구현체를 직접 생성해 `DbContext`에 주입할 때 | [`NodeDbContextExecutor`](./core/node-db-context-executor.md) |

### 저수준 DB 연결 다루기

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 연결 설정만으로 dialect에 맞는 연결 객체를 생성할 때 | [`createDbConn`](./core/create-db-conn.md) |
| DBMS 구현체와 동일한 연결 계약을 맞출 때 | [`DbConn`](./types/db-conn.md) |
| 연결 설정 객체를 작성하거나 dialect별 필드를 구분할 때 | [`DbConnConfig`](./types/db-conn-config.md) |
| 연결 설정에서 쿼리 빌더 dialect를 계산할 때 | [`getDialectFromConfig`](./types/get-dialect-from-config.md) |
| 연결 타임아웃과 공통 오류 메시지를 확인할 때 | [`DB connection constants`](./types/db-conn-constants.md) |

### DBMS별 연결 구현 확인하기

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| MSSQL 또는 Azure SQL 연결 구현의 쿼리·bulk insert 동작을 확인할 때 | [`MssqlDbConn`](./connections/mssql-db-conn.md) |
| MySQL 연결 구현의 multi-statement와 `LOAD DATA LOCAL INFILE` 동작을 확인할 때 | [`MysqlDbConn`](./connections/mysql-db-conn.md) |
| PostgreSQL 연결 구현의 `COPY FROM STDIN` bulk insert 동작을 확인할 때 | [`PostgresqlDbConn`](./connections/postgresql-db-conn.md) |

## 이 패키지를 쓰지 말아야 할 때

- 브라우저 코드에서 ORM 쿼리 타입만 작성할 때는 `@simplysm/orm-common`을 사용한다.
- HTTP/WebSocket 서비스 경계를 만들 때는 `@simplysm/service-server`와 `@simplysm/service-client`를 사용한다.

---

> API 이름으로 검색: [_api-index.md](./_api-index.md)
