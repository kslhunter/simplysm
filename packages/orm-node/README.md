# @simplysm/orm-node

Node.js용 ORM 모듈. MySQL, PostgreSQL, MSSQL(Azure 포함) 데이터베이스를 지원한다.

## 설치

```bash
npm install @simplysm/orm-node
```

사용하는 DB에 따라 드라이버를 추가로 설치한다 (모두 optional peerDependency):

```bash
npm install mysql2                 # MySQL
npm install pg pg-copy-streams     # PostgreSQL
npm install tedious                # MSSQL / Azure SQL
```

**의존성:** `@simplysm/core-common`, `@simplysm/orm-common`, `consola`

## 아키텍처 개요

```
createOrm()                  -- 최상위 팩토리 (ORM 인스턴스)
  └─ NodeDbContextExecutor   -- DbContextExecutor 구현체
       └─ createDbConn()     -- DB 연결 생성
            └─ MysqlDbConn / PostgresqlDbConn / MssqlDbConn  -- 실제 연결
```

- `createOrm` -- `@simplysm/orm-common`의 `DbContext`와 DB 연결을 결합하는 고수준 API
- `NodeDbContextExecutor` -- `QueryDef` -> SQL 변환 및 실행을 담당하는 어댑터
- `createDbConn` -- DB 연결 인스턴스를 생성하는 팩토리
- `MysqlDbConn` / `PostgresqlDbConn` / `MssqlDbConn` -- 각 DBMS별 실제 연결 구현

## 주요 사용법

### ORM 인스턴스 생성 및 트랜잭션

```typescript
import { createOrm } from "@simplysm/orm-node";
import { defineDbContext, Table } from "@simplysm/orm-common";

// 1. 테이블 및 DbContext 정의 (orm-common)
const User = Table("user")
  .columns((c) => ({ id: c.int().autoIncrement(), name: c.varchar(100) }))
  .primaryKey("id");

const Order = Table("order")
  .columns((c) => ({ id: c.int().autoIncrement(), userId: c.int(), amount: c.decimal(10, 2) }))
  .primaryKey("id");

const MyDb = defineDbContext({
  tables: { user: User, order: Order },
});

// 2. ORM 인스턴스 생성
// database는 필수 -- config 또는 options 중 하나에 반드시 지정해야 한다.
const orm = createOrm(MyDb, {
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
});

// 3-a. 자동 트랜잭션 (commit/rollback 자동 처리)
const result = await orm.connect(async (db) => {
  const users = await db.user().execute();
  await db.user().insert([{ name: "Alice" }]);
  return users;
});

// 3-b. 트랜잭션 없이 실행
const users = await orm.connectWithoutTransaction(async (db) => {
  return await db.user().execute();
});

// 3-c. 격리 수준 지정
await orm.connect(async (db) => {
  /* ... */
}, "SERIALIZABLE");
```

### OrmOptions로 database/schema 오버라이드

```typescript
const orm = createOrm(MyDb, config, {
  database: "other_db",    // config.database 대신 사용
  schema: "custom_schema", // config.schema 대신 사용
});
```

### 저수준 DB 연결

```typescript
import { createDbConn } from "@simplysm/orm-node";

// createDbConn은 연결 객체만 생성한다. connect()를 호출해야 실제 연결이 수립된다.
const conn = await createDbConn(config);
await conn.connect();

await conn.beginTransaction();
try {
  const rows = await conn.execute(["SELECT * FROM users"]);
  await conn.executeParametrized("INSERT INTO users (name) VALUES (?)", ["Alice"]);
  await conn.commitTransaction();
} catch {
  await conn.rollbackTransaction();
}

await conn.close();
```

### 벌크 인서트

각 DBMS의 네이티브 벌크 API를 사용하여 최적 성능을 제공한다.

```typescript
await conn.bulkInsert("users", columnMetas, records);
```

| DBMS | 방식 |
|------|------|
| MySQL | `LOAD DATA LOCAL INFILE` (임시 CSV 파일) |
| PostgreSQL | `COPY FROM STDIN` (스트림 기반 CSV) |
| MSSQL | tedious `BulkLoad` API (네이티브) |

## API 레퍼런스

### `createOrm(dbContextDef, config, options?): Orm`

ORM 인스턴스 팩토리. `defineDbContext`로 정의한 DbContext 정의와 연결 설정을 결합한다.

```typescript
function createOrm<TDef extends DbContextDef<any, any, any>>(
  dbContextDef: TDef,
  config: DbConnConfig,
  options?: OrmOptions,
): Orm<TDef>;
```

`database`는 `options.database` -> `config.database` 순서로 결정되며, 둘 다 없으면 에러가 발생한다. `schema`도 같은 우선순위로 결정된다.

**`Orm<TDef>` 인터페이스:**

| 속성/메서드 | 타입 | 설명 |
|---|---|---|
| `dbContextDef` | `TDef` (readonly) | DbContext 정의 |
| `config` | `DbConnConfig` (readonly) | 연결 설정 |
| `options` | `OrmOptions` (readonly, optional) | 옵션 |
| `connect(callback, isolationLevel?)` | `Promise<R>` | 트랜잭션 내에서 콜백 실행 |
| `connectWithoutTransaction(callback)` | `Promise<R>` | 트랜잭션 없이 콜백 실행 |

**`OrmOptions` 인터페이스:**

| 필드 | 타입 | 설명 |
|---|---|---|
| `database?` | `string` | config.database 대신 사용할 DB 이름 |
| `schema?` | `string` | config.schema 대신 사용할 스키마 이름 |

### `createDbConn(config): Promise<DbConn>`

DB 연결 인스턴스를 생성하여 반환한다. 반환된 객체에 `connect()`를 호출해야 실제 연결이 수립된다. 드라이버 모듈은 호출 시 lazy import된다.

```typescript
function createDbConn(config: DbConnConfig): Promise<DbConn>;
```

### `DbConn` 인터페이스

모든 DB 연결 구현체의 공통 인터페이스. `EventEmitter<{ close: void }>`를 상속한다.

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

### `DbConnConfig` 타입

`dialect` 필드로 분기되는 유니온 타입이다.

```typescript
type DbConnConfig = MysqlDbConnConfig | MssqlDbConnConfig | PostgresqlDbConnConfig;
```

**공통 필드:**

| 필드 | 타입 | 설명 |
|---|---|---|
| `dialect` | `"mysql"` \| `"mssql"` \| `"mssql-azure"` \| `"postgresql"` | DBMS 종류 |
| `host` | `string` | 호스트 |
| `port?` | `number` | 포트 |
| `username` | `string` | 사용자명 |
| `password` | `string` | 비밀번호 |
| `database?` | `string` | 데이터베이스명 |
| `defaultIsolationLevel?` | `IsolationLevel` | 기본 격리 수준 |

**MSSQL/PostgreSQL 전용:**

| 필드 | 타입 | 설명 |
|---|---|---|
| `schema?` | `string` | 스키마 (MSSQL 기본: `dbo`, PostgreSQL 기본: `public`) |

**MSSQL 특수 dialect:**
- `"mssql-azure"`: Azure SQL용. `encrypt: true`가 자동 적용됨.

### `NodeDbContextExecutor`

`@simplysm/orm-common`의 `DbContextExecutor` 인터페이스 구현체. `DbContext`가 내부적으로 사용한다.

```typescript
class NodeDbContextExecutor implements DbContextExecutor {
  constructor(config: DbConnConfig);

  connect(): Promise<void>;
  close(): Promise<void>;
  beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  executeParametrized(query: string, params?: unknown[]): Promise<Record<string, unknown>[][]>;
  bulkInsert(tableName: string, columnMetas: Record<string, ColumnMeta>, records: DataRecord[]): Promise<void>;
  executeDefs<T = DataRecord>(defs: QueryDef[], resultMetas?: (ResultMeta | undefined)[]): Promise<T[][]>;
}
```

**`executeDefs` 동작:**
- `QueryDef`를 dialect에 맞는 SQL로 변환 (`createQueryBuilder`)
- `resultMetas`가 모두 `undefined`이면 -> 결과 없는 쿼리로 판단하여 단일 배치 실행
- `ResultMeta`가 있으면 -> `parseQueryResult`로 타입 변환 적용

### DB 연결 구현 클래스

| 클래스 | 드라이버 | dialect |
|---|---|---|
| `MysqlDbConn` | `mysql2/promise` | `"mysql"` |
| `PostgresqlDbConn` | `pg` + `pg-copy-streams` | `"postgresql"` |
| `MssqlDbConn` | `tedious` | `"mssql"`, `"mssql-azure"` |

모두 `EventEmitter<{ close: void }>`를 상속하고 `DbConn`을 구현한다. 드라이버 모듈은 `createDbConn` 호출 시 lazy import된다.

**DBMS별 참고 사항:**
- MySQL: `username`이 `"root"`인 경우 특정 database에 바인딩하지 않고 연결한다 (관리 작업용).
- MySQL: `charset`은 `utf8mb4`로 고정, `multipleStatements`가 활성화되어 있다.
- PostgreSQL: 기본 포트 `5432`가 자동 적용된다.
- MSSQL: `trustServerCertificate: true`로 설정된다.

### `getDialectFromConfig(config): Dialect`

config에서 `Dialect`를 추출한다. `"mssql-azure"` -> `"mssql"`로 변환된다.

```typescript
function getDialectFromConfig(config: DbConnConfig): Dialect;
```

### 상수

| 상수 | 값 | 설명 |
|---|---|---|
| `DB_CONN_CONNECT_TIMEOUT` | 10초 (10,000ms) | 연결 타임아웃 |
| `DB_CONN_DEFAULT_TIMEOUT` | 10분 (600,000ms) | 쿼리 기본 타임아웃 |
| `DB_CONN_ERRORS.NOT_CONNECTED` | `"'Connection' is not connected."` | 미연결 에러 메시지 |
| `DB_CONN_ERRORS.ALREADY_CONNECTED` | `"'Connection' is already connected."` | 중복 연결 에러 메시지 |

연결 유휴 시 자동 종료: 마지막 쿼리 실행 후 `DB_CONN_DEFAULT_TIMEOUT * 2` (20분) 동안 활동이 없으면 연결이 자동으로 닫힌다.

### IsolationLevel 타입

`@simplysm/orm-common`에서 제공하는 트랜잭션 격리 수준이다. `isolationLevel`을 지정하지 않으면 `config.defaultIsolationLevel`이 사용되고, 이것도 없으면 `READ_UNCOMMITTED`가 기본값이다.

```typescript
type IsolationLevel = "READ_UNCOMMITTED" | "READ_COMMITTED" | "REPEATABLE_READ" | "SERIALIZABLE";
```
