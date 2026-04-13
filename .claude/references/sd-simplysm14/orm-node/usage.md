# @simplysm/orm-node

Node.js 환경에서 MSSQL, MySQL, PostgreSQL에 대한 저수준 DB 연결 및 ORM 실행자를 제공하는 패키지.

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

## API Overview

### Types

| API | Type | Description |
|-----|------|-------------|
| `DbConn` | interface | 저수준 DB 연결 인터페이스. 각 DBMS 구현체가 이 인터페이스를 구현한다. `EventEmitter<{ close: void }>`를 상속한다. |
| `DbConnConfig` | type | DB 연결 설정 discriminated union (`MysqlDbConnConfig \| MssqlDbConnConfig \| PostgresqlDbConnConfig`). `dialect` 필드로 분기한다. |
| `MysqlDbConnConfig` | interface | MySQL 연결 설정 |
| `MssqlDbConnConfig` | interface | MSSQL/Azure SQL 연결 설정 |
| `PostgresqlDbConnConfig` | interface | PostgreSQL 연결 설정 |
| `DB_CONN_CONNECT_TIMEOUT` | const | DB 연결 수립 타임아웃 (10초, `10_000`ms) |
| `DB_CONN_DEFAULT_TIMEOUT` | const | DB 쿼리 기본 타임아웃 (10분, `600_000`ms) |
| `DB_CONN_ERRORS` | const | DB 연결 오류 메시지 상수 (`NOT_CONNECTED`, `ALREADY_CONNECTED`) |
| `getDialectFromConfig` | function | `DbConnConfig`에서 정규화된 `Dialect`를 추출한다. `"mssql-azure"` → `"mssql"`로 변환한다. |

→ See [docs/types.md](./docs/types.md) for details.

### Connections

| API | Type | Description |
|-----|------|-------------|
| `MssqlDbConn` | class | MSSQL 데이터베이스 연결 클래스. tedious 라이브러리를 사용한다. |
| `MysqlDbConn` | class | MySQL 데이터베이스 연결 클래스. mysql2/promise 라이브러리를 사용한다. |
| `PostgresqlDbConn` | class | PostgreSQL 데이터베이스 연결 클래스. pg + pg-copy-streams 라이브러리를 사용한다. |

→ See [docs/connections.md](./docs/connections.md) for details.

### Core

| API | Type | Description |
|-----|------|-------------|
| `createDbConn` | function | dialect 기반 DbConn 팩토리. 네이티브 드라이버를 지연 로딩하여 DbConn 인스턴스를 생성한다. |
| `NodeDbContextExecutor` | class | `orm-common`의 `DbContextExecutor` 인터페이스 구현체. DbContext에서 사용하는 실제 DB 연결을 처리한다. |
| `createOrm` | function | Node.js ORM 팩토리 함수. DbContext 서브클래스와 연결 설정을 받아 트랜잭션을 관리하는 Orm 인스턴스를 생성한다. |
| `Orm` | interface | `createOrm`에서 반환하는 객체의 타입 |
| `OrmOptions` | interface | ORM 옵션. `DbConnConfig`보다 우선하는 `database`/`schema` 설정 |

→ See [docs/core.md](./docs/core.md) for details.

## Usage Examples

### createOrm을 사용한 ORM 연결

```typescript
import { DbContext } from "@simplysm/orm-common";
import { createOrm } from "@simplysm/orm-node";

class MyDb extends DbContext {
  user = this.queryable(User);
}

const orm = createOrm(MyDb, {
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
});

// 트랜잭션 내에서 실행
await orm.connect(async (db) => {
  const users = await db.user().execute();
  return users;
});

// 트랜잭션 없이 실행
await orm.connectWithoutTransaction(async (db) => {
  const users = await db.user().execute();
  return users;
});
```

### createDbConn을 사용한 저수준 연결

```typescript
import { createDbConn } from "@simplysm/orm-node";

const conn = await createDbConn({
  dialect: "postgresql",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "password",
  database: "mydb",
});

await conn.connect();

try {
  await conn.beginTransaction();
  await conn.execute(["INSERT INTO users (name) VALUES ('Alice')"]);
  await conn.commitTransaction();
} catch {
  await conn.rollbackTransaction();
} finally {
  await conn.close();
}
```

### DbConn 클래스 직접 생성 (테스트용)

```typescript
import { MysqlDbConn } from "@simplysm/orm-node";

const mysql2 = await import("mysql2/promise");
const conn = new MysqlDbConn(mysql2, {
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "testdb",
});

await conn.connect();
const results = await conn.execute(["SELECT 1 AS val"]);
await conn.close();
```
