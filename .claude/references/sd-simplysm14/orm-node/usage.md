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

#### `DbConn`

```typescript
interface DbConn extends EventEmitter<{ close: void }> {
  config: DbConnConfig;
  isConnected: boolean;
  isInTransaction: boolean;
  connect(): Promise<void>;
  close(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  execute(queries: string[]): Promise<Record<string, unknown>[][]>;
  executeParametrized(query: string, params?: unknown[]): Promise<Record<string, unknown>[][]>;
  bulkInsert(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `config` | `DbConnConfig` | 연결 설정 |
| `isConnected` | `boolean` | 연결 여부 |
| `isInTransaction` | `boolean` | 트랜잭션 진행 여부 |
| `connect()` | `Promise<void>` | DB 연결을 수립한다 |
| `close()` | `Promise<void>` | DB 연결을 종료한다 |
| `beginTransaction(isolationLevel?)` | `Promise<void>` | 트랜잭션을 시작한다 |
| `commitTransaction()` | `Promise<void>` | 트랜잭션을 커밋한다 |
| `rollbackTransaction()` | `Promise<void>` | 트랜잭션을 롤백한다 |
| `execute(queries)` | `Promise<Record<string, unknown>[][]>` | SQL 쿼리 배열을 실행한다 |
| `executeParametrized(query, params?)` | `Promise<Record<string, unknown>[][]>` | 파라미터화된 쿼리를 실행한다 |
| `bulkInsert(tableName, columnMetas, records)` | `Promise<void>` | 네이티브 bulk API를 사용하여 대량 삽입한다 |

#### `DbConnConfig`

Discriminated union. `dialect` 필드로 분기한다.

```typescript
type DbConnConfig = MysqlDbConnConfig | MssqlDbConnConfig | PostgresqlDbConnConfig;
```

#### `MysqlDbConnConfig`

```typescript
interface MysqlDbConnConfig {
  dialect: "mysql";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  defaultIsolationLevel?: IsolationLevel;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `dialect` | `"mysql"` | Discriminant. 항상 `"mysql"` |
| `host` | `string` | 호스트 주소 |
| `port` | `number?` | 포트 (생략 시 mysql2 기본값 사용) |
| `username` | `string` | 사용자 이름 |
| `password` | `string` | 비밀번호 |
| `database` | `string?` | 데이터베이스 이름 |
| `defaultIsolationLevel` | `IsolationLevel?` | 기본 격리 수준 (미지정 시 `READ_UNCOMMITTED`) |

#### `MssqlDbConnConfig`

```typescript
interface MssqlDbConnConfig {
  dialect: "mssql" | "mssql-azure";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  schema?: string;
  defaultIsolationLevel?: IsolationLevel;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `dialect` | `"mssql" \| "mssql-azure"` | Discriminant. `"mssql-azure"`인 경우 암호화 연결(encrypt)을 사용한다 |
| `host` | `string` | 호스트 주소 |
| `port` | `number?` | 포트 |
| `username` | `string` | 사용자 이름 |
| `password` | `string` | 비밀번호 |
| `database` | `string?` | 데이터베이스 이름 |
| `schema` | `string?` | 스키마 이름 |
| `defaultIsolationLevel` | `IsolationLevel?` | 기본 격리 수준 (미지정 시 `READ_UNCOMMITTED`) |

#### `PostgresqlDbConnConfig`

```typescript
interface PostgresqlDbConnConfig {
  dialect: "postgresql";
  host: string;
  port?: number;
  username: string;
  password: string;
  database?: string;
  schema?: string;
  defaultIsolationLevel?: IsolationLevel;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `dialect` | `"postgresql"` | Discriminant. 항상 `"postgresql"` |
| `host` | `string` | 호스트 주소 |
| `port` | `number?` | 포트 (미지정 시 `5432`) |
| `username` | `string` | 사용자 이름 |
| `password` | `string` | 비밀번호 |
| `database` | `string?` | 데이터베이스 이름 |
| `schema` | `string?` | 스키마 이름 |
| `defaultIsolationLevel` | `IsolationLevel?` | 기본 격리 수준 (미지정 시 `READ_UNCOMMITTED`) |

#### `getDialectFromConfig`

```typescript
function getDialectFromConfig(config: DbConnConfig): Dialect;
```

`DbConnConfig`에서 정규화된 `Dialect`를 추출한다. `"mssql-azure"` → `"mssql"`로 변환하고, 나머지는 `config.dialect`를 그대로 반환한다.

### Connections

| API | Type | Description |
|-----|------|-------------|
| `MssqlDbConn` | class | MSSQL 데이터베이스 연결 클래스. tedious 라이브러리를 사용한다. |
| `MysqlDbConn` | class | MySQL 데이터베이스 연결 클래스. mysql2/promise 라이브러리를 사용한다. |
| `PostgresqlDbConn` | class | PostgreSQL 데이터베이스 연결 클래스. pg + pg-copy-streams 라이브러리를 사용한다. |

#### `MssqlDbConn`

```typescript
class MssqlDbConn extends EventEmitter<{ close: void }> implements DbConn {
  isConnected: boolean;
  isInTransaction: boolean;
  readonly config: MssqlDbConnConfig;

  constructor(
    tedious: typeof import("tedious"),
    config: MssqlDbConnConfig,
  );

  connect(): Promise<void>;
  close(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  execute(queries: string[]): Promise<Record<string, unknown>[][]>;
  executeParametrized(query: string, params?: unknown[]): Promise<Record<string, unknown>[][]>;
  bulkInsert(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void>;
}
```

생성자에서 tedious 라이브러리 모듈을 직접 주입받는다. `bulkInsert()`는 tedious `BulkLoad` API를 사용하며, `Uuid`는 문자열로, `Uint8Array`는 `Buffer`로, `DateTime`/`DateOnly`는 `Date`로 변환한다. `"mssql-azure"` dialect인 경우 암호화 연결(encrypt)을 활성화한다.

#### `MysqlDbConn`

```typescript
class MysqlDbConn extends EventEmitter<{ close: void }> implements DbConn {
  isConnected: boolean;
  isInTransaction: boolean;
  readonly config: MysqlDbConnConfig;

  constructor(
    mysql2: typeof import("mysql2/promise"),
    config: MysqlDbConnConfig,
  );

  connect(): Promise<void>;
  close(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  execute(queries: string[]): Promise<Record<string, unknown>[][]>;
  executeParametrized(query: string, params?: unknown[]): Promise<Record<string, unknown>[][]>;
  bulkInsert(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void>;
}
```

생성자에서 mysql2/promise 라이브러리 모듈을 직접 주입받는다. `username`이 `"root"`인 경우 특정 데이터베이스에 바인딩하지 않고 연결한다. `bulkInsert()`는 `LOAD DATA LOCAL INFILE`을 사용하며, 임시 CSV 파일을 생성한 뒤 삭제한다. UUID/binary 컬럼은 hex 문자열로 기록한 뒤 `UNHEX()` 함수로 변환한다.

#### `PostgresqlDbConn`

```typescript
class PostgresqlDbConn extends EventEmitter<{ close: void }> implements DbConn {
  isConnected: boolean;
  isInTransaction: boolean;
  readonly config: PostgresqlDbConnConfig;

  constructor(
    pg: typeof import("pg"),
    pgCopyStreams: typeof import("pg-copy-streams"),
    config: PostgresqlDbConnConfig,
  );

  connect(): Promise<void>;
  close(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  execute(queries: string[]): Promise<Record<string, unknown>[][]>;
  executeParametrized(query: string, params?: unknown[]): Promise<Record<string, unknown>[][]>;
  bulkInsert(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: Record<string, unknown>[],
  ): Promise<void>;
}
```

생성자에서 pg와 pg-copy-streams 라이브러리 모듈을 직접 주입받는다. 기본 포트는 `5432`. `bulkInsert()`는 `COPY FROM STDIN`(CSV 형식)을 사용하며, `pg-copy-streams`를 통해 스트림으로 데이터를 전송한다. binary 컬럼은 PostgreSQL bytea hex 형식(`\x...`)으로 변환한다.

### Core

| API | Type | Description |
|-----|------|-------------|
| `createDbConn` | function | dialect 기반 DbConn 팩토리. 네이티브 드라이버를 지연 로딩하여 DbConn 인스턴스를 생성한다. |
| `NodeDbContextExecutor` | class | `orm-common`의 `DbContextExecutor` 인터페이스 구현체. DbContext에서 사용하는 실제 DB 연결을 처리한다. |
| `createOrm` | function | Node.js ORM 팩토리 함수. DbContext 서브클래스와 연결 설정을 받아 트랜잭션을 관리하는 Orm 인스턴스를 생성한다. |
| `Orm` | interface | createOrm에서 반환하는 객체의 타입 |
| `OrmOptions` | interface | ORM 옵션. DbConnConfig보다 우선하는 database/schema 설정 |

#### `createDbConn`

```typescript
async function createDbConn(config: DbConnConfig): Promise<DbConn>;
```

`config.dialect`에 따라 적절한 DbConn 구현체를 생성한다. 네이티브 드라이버 패키지(tedious, mysql2, pg, pg-copy-streams)는 최초 호출 시에만 동적 import로 로드하고 모듈 수준 캐시에 보관한다. 반환된 DbConn은 아직 연결되지 않은 상태이므로 `connect()`를 별도로 호출해야 한다.

#### `NodeDbContextExecutor`

```typescript
class NodeDbContextExecutor implements DbContextExecutor {
  constructor(config: DbConnConfig);

  connect(): Promise<void>;
  close(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  executeParametrized(query: string, params?: unknown[]): Promise<Record<string, unknown>[][]>;
  bulkInsert(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: DataRecord[],
  ): Promise<void>;
  executeDefs<T = DataRecord>(
    defs: QueryDef[],
    resultMetas?: (ResultMeta | undefined)[],
  ): Promise<T[][]>;
}
```

`orm-common`의 `DbContextExecutor` 인터페이스를 구현한다. 내부적으로 `createDbConn()`을 사용하여 DB 연결을 생성하고 관리한다. `executeDefs()`는 `QueryDef` 배열을 SQL로 변환(`createQueryBuilder`)하여 실행하고, `ResultMeta`를 사용하여 결과를 파싱(`parseQueryResult`)한다. `resultMetas`가 모두 `undefined`인 경우, 쿼리를 단일 문자열로 결합하여 한 번의 요청으로 실행한다.

#### `createOrm`

```typescript
function createOrm<T extends DbContext>(
  DbClass: new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T,
  config: DbConnConfig,
  options?: OrmOptions,
): Orm<T>;
```

DbContext 서브클래스, DB 연결 설정, 옵션을 받아 `Orm<T>` 인스턴스를 반환한다. `options.database`/`options.schema`는 `config`의 동일 필드보다 우선 적용된다. `database`는 필수이며, 누락 시 에러를 throw한다.

#### `Orm`

```typescript
interface Orm<T extends DbContext> {
  readonly DbClass: new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T;
  readonly config: DbConnConfig;
  readonly options?: OrmOptions;
  connect<R>(callback: (conn: T) => Promise<R>, isolationLevel?: IsolationLevel): Promise<R>;
  connectWithoutTransaction<R>(callback: (conn: T) => Promise<R>): Promise<R>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `DbClass` | constructor | DbContext 서브클래스 생성자 |
| `config` | `DbConnConfig` | DB 연결 설정 |
| `options` | `OrmOptions?` | ORM 옵션 |
| `connect(callback, isolationLevel?)` | `Promise<R>` | 트랜잭션 내에서 콜백을 실행한다 |
| `connectWithoutTransaction(callback)` | `Promise<R>` | 트랜잭션 없이 콜백을 실행한다 |

#### `OrmOptions`

```typescript
interface OrmOptions {
  database?: string;
  schema?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `database` | `string?` | 데이터베이스 이름. `DbConnConfig`의 `database` 대신 사용된다 |
| `schema` | `string?` | 스키마 이름 (MSSQL: dbo, PostgreSQL: public). `DbConnConfig`의 `schema` 대신 사용된다 |

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
