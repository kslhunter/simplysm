# @simplysm/orm-node

Simplysm ORM의 Node.js 구현 모듈로, MySQL, MSSQL(SQL Server), PostgreSQL에 대한 실제 데이터베이스 연결, 쿼리 실행, 트랜잭션 관리, 커넥션 풀링을 담당한다. `@simplysm/orm-common`에서 정의한 스키마와 쿼리 빌더를 기반으로, Node.js 환경에서 데이터베이스와 직접 통신하는 계층이다.

## 설치

```bash
npm install @simplysm/orm-node
# 또는
pnpm add @simplysm/orm-node
```

### 데이터베이스별 드라이버 설치

사용하는 데이터베이스에 맞는 드라이버를 추가로 설치해야 한다. 사용하지 않는 드라이버는 설치할 필요 없다.

```bash
# MySQL
npm install mysql2

# SQL Server (MSSQL)
npm install tedious

# PostgreSQL
npm install pg pg-copy-streams
```

## 아키텍처

```
SdOrm (최상위 진입점)
  └── NodeDbContextExecutor (DbContext와 실제 DB 사이의 실행기)
        └── DbConnFactory (커넥션 생성 및 풀 관리)
              └── PooledDbConn (커넥션 풀 래퍼)
                    └── MysqlDbConn / MssqlDbConn / PostgresqlDbConn (DBMS별 저수준 연결)
```

- `SdOrm`은 `DbContext` 타입과 연결 설정을 받아 트랜잭션을 관리하는 최상위 클래스이다.
- `NodeDbContextExecutor`는 `DbContext`가 사용하는 실행기로, `QueryDef`를 SQL로 변환하고 실행한다.
- `DbConnFactory`는 커넥션 풀에서 연결을 획득하는 팩토리이다.
- `PooledDbConn`은 `generic-pool` 기반의 커넥션 풀 래퍼로, 사용 후 실제 연결을 종료하지 않고 풀에 반환한다.
- 각 DBMS별 연결 클래스(`MysqlDbConn`, `MssqlDbConn`, `PostgresqlDbConn`)는 저수준 DB 드라이버를 직접 사용한다.

## 주요 모듈

### 클래스

| 클래스 | 설명 |
|--------|------|
| `SdOrm` | ORM 최상위 클래스. `DbContext` 타입과 연결 설정을 받아 트랜잭션 기반 연결을 관리한다. |
| `NodeDbContextExecutor` | `DbContextExecutor` 구현체. `QueryDef`를 SQL로 변환하여 실행하고 결과를 파싱한다. |
| `DbConnFactory` | 커넥션 팩토리. 설정별로 커넥션 풀을 캐싱하여 `PooledDbConn`을 반환한다. |
| `PooledDbConn` | 커넥션 풀 래퍼. `generic-pool`에서 물리 연결을 획득/반환하며, `DbConn` 인터페이스를 구현한다. |
| `MysqlDbConn` | MySQL 연결 클래스. `mysql2/promise` 드라이버를 사용한다. |
| `MssqlDbConn` | MSSQL/Azure SQL 연결 클래스. `tedious` 드라이버를 사용한다. |
| `PostgresqlDbConn` | PostgreSQL 연결 클래스. `pg` 및 `pg-copy-streams` 드라이버를 사용한다. |

### 인터페이스 및 타입

| 타입 | 설명 |
|------|------|
| `DbConn` | 저수준 DB 연결 인터페이스. 모든 DBMS별 연결 클래스가 구현한다. |
| `DbConnConfig` | DB 연결 설정 유니온 타입 (`MysqlDbConnConfig \| MssqlDbConnConfig \| PostgresqlDbConnConfig`). |
| `MysqlDbConnConfig` | MySQL 연결 설정. `dialect: "mysql"`. |
| `MssqlDbConnConfig` | MSSQL 연결 설정. `dialect: "mssql" \| "mssql-azure"`. |
| `PostgresqlDbConnConfig` | PostgreSQL 연결 설정. `dialect: "postgresql"`. |
| `DbPoolConfig` | 커넥션 풀 설정 (`min`, `max`, `acquireTimeoutMillis`, `idleTimeoutMillis`). |
| `SdOrmOptions` | `SdOrm` 옵션. `DbConnConfig`보다 우선 적용되는 `database`, `schema` 설정. |

### 상수 및 유틸 함수

| 이름 | 설명 |
|------|------|
| `DB_CONN_DEFAULT_TIMEOUT` | DB 연결 기본 타임아웃 (10분, 600000ms). |
| `DB_CONN_ERRORS` | DB 연결 에러 메시지 상수 (`NOT_CONNECTED`, `ALREADY_CONNECTED`). |
| `getDialectFromConfig(config)` | `DbConnConfig`에서 `Dialect` 추출. `"mssql-azure"`는 `"mssql"`로 변환된다. |

## 사용법

### SdOrm을 통한 기본 사용

`SdOrm`은 `DbContext`와 함께 사용하는 최상위 진입점이다. 트랜잭션 관리까지 자동으로 처리한다.

```typescript
import { SdOrm } from "@simplysm/orm-node";
import { DbContext, queryable, Table } from "@simplysm/orm-common";

// 1. 테이블 정의
const User = Table("User")
  .database("mydb")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    name: c.varchar(100),
    email: c.varchar(200).nullable(),
  }))
  .primaryKey("id");

// 2. DbContext 정의
class MyDb extends DbContext {
  readonly user = queryable(this, User);
}

// 3. SdOrm 인스턴스 생성
const orm = new SdOrm(MyDb, {
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
});

// 4. 트랜잭션 내에서 쿼리 실행 (성공 시 커밋, 실패 시 롤백)
const users = await orm.connect(async (db) => {
  return await db.user().result();
});
```

### 트랜잭션 관리

```typescript
// 트랜잭션 내 실행 (자동 커밋/롤백)
await orm.connect(async (db) => {
  await db.user().insert([
    { name: "홍길동", email: "hong@example.com" },
    { name: "김철수", email: "kim@example.com" },
  ]);
  // 콜백이 성공적으로 끝나면 커밋
  // 예외 발생 시 자동 롤백
});

// 격리 수준 지정
await orm.connect(async (db) => {
  const users = await db.user().result();
  return users;
}, "SERIALIZABLE");

// 트랜잭션 없이 실행 (DDL 작업 등)
await orm.connectWithoutTransaction(async (db) => {
  const users = await db.user().result();
  return users;
});
```

지원하는 격리 수준 (`IsolationLevel`):
- `"READ_UNCOMMITTED"`
- `"READ_COMMITTED"`
- `"REPEATABLE_READ"`
- `"SERIALIZABLE"`

### SdOrmOptions를 통한 database/schema 오버라이드

`SdOrmOptions`를 사용하면 `DbConnConfig`에 설정된 `database`/`schema` 대신 다른 값을 사용할 수 있다.

```typescript
const orm = new SdOrm(MyDb, {
  dialect: "postgresql",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "password",
  database: "default_db",    // 연결 시 사용하는 기본 DB
  schema: "public",
}, {
  database: "app_db",        // DbContext에서 사용할 DB (우선 적용)
  schema: "app_schema",      // DbContext에서 사용할 스키마 (우선 적용)
});
```

### 커넥션 풀 설정

`DbConnConfig`의 `pool` 필드로 커넥션 풀을 구성한다. 풀은 `generic-pool` 라이브러리 기반이며, 동일한 설정에 대해 풀이 자동으로 캐싱된다.

```typescript
const orm = new SdOrm(MyDb, {
  dialect: "mssql",
  host: "localhost",
  port: 1433,
  username: "sa",
  password: "password",
  database: "mydb",
  pool: {
    min: 2,                      // 최소 연결 수 (기본: 1)
    max: 20,                     // 최대 연결 수 (기본: 10)
    acquireTimeoutMillis: 60000, // 연결 획득 타임아웃 (기본: 30000ms)
    idleTimeoutMillis: 60000,    // 유휴 연결 타임아웃 (기본: 30000ms)
  },
});
```

### DbConnFactory를 통한 저수준 연결

`SdOrm`/`DbContext` 없이 직접 DB에 연결하여 SQL을 실행할 수 있다. `DbConnFactory.create()`는 커넥션 풀에서 `PooledDbConn`을 반환한다.

```typescript
import { DbConnFactory } from "@simplysm/orm-node";

// 커넥션 생성 (풀에서 획득)
const conn = await DbConnFactory.create({
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
});

// 연결
await conn.connect();

try {
  // SQL 실행
  const results = await conn.execute(["SELECT * FROM User WHERE id = 1"]);
  console.log(results); // [[{ id: 1, name: "홍길동", ... }]]

  // 트랜잭션 수동 관리
  await conn.beginTransaction("READ_COMMITTED");
  await conn.execute(["INSERT INTO User (name) VALUES ('김철수')"]);
  await conn.commitTransaction();
} catch (err) {
  if (conn.isOnTransaction) {
    await conn.rollbackTransaction();
  }
  throw err;
} finally {
  // 연결 반환 (풀에 반환, 실제 종료 아님)
  await conn.close();
}
```

### 파라미터화된 쿼리 실행

각 연결 클래스는 `executeParametrized()` 메서드를 통해 파라미터 바인딩을 지원한다.

```typescript
const conn = await DbConnFactory.create({
  dialect: "postgresql",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "password",
  database: "mydb",
});

await conn.connect();

// 파라미터화된 쿼리 ($1, $2 등 DBMS별 플레이스홀더 사용)
const results = await conn.executeParametrized(
  "SELECT * FROM \"User\" WHERE name = $1",
  ["홍길동"],
);

await conn.close();
```

### 벌크 INSERT

각 DBMS별 네이티브 벌크 API를 사용한 대량 데이터 삽입을 지원한다.

| DBMS | 벌크 방식 |
|------|----------|
| MySQL | `LOAD DATA LOCAL INFILE` (임시 CSV 파일) |
| MSSQL | tedious `BulkLoad` API |
| PostgreSQL | `COPY FROM STDIN` (pg-copy-streams) |

```typescript
import type { ColumnMeta } from "@simplysm/orm-common";

const conn = await DbConnFactory.create({
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
});

await conn.connect();

// 컬럼 메타데이터 정의
const columnMetas: Record<string, ColumnMeta> = {
  name: { dataType: { type: "varchar", length: 100 } },
  email: { dataType: { type: "varchar", length: 200 }, nullable: true },
  age: { dataType: { type: "int" } },
};

// 대량 레코드 삽입
const records = [
  { name: "홍길동", email: "hong@example.com", age: 30 },
  { name: "김철수", email: "kim@example.com", age: 25 },
  // ... 수천 건의 레코드
];

await conn.bulkInsert("mydb.User", columnMetas, records);
await conn.close();
```

### DBMS별 연결 설정

#### MySQL

```typescript
const mysqlConfig: MysqlDbConnConfig = {
  dialect: "mysql",
  host: "localhost",
  port: 3306,                                  // 선택 (기본: 3306)
  username: "root",
  password: "password",
  database: "mydb",                            // 선택
  defaultIsolationLevel: "READ_UNCOMMITTED",   // 선택 (기본 격리 수준)
  pool: { min: 1, max: 10 },                   // 선택 (커넥션 풀)
};
```

MySQL 연결 특성:
- `multipleStatements: true` -- 한 번의 요청에 여러 SQL문 실행 가능
- `charset: "utf8mb4"` -- 이모지 등 4바이트 문자 지원
- `LOAD DATA LOCAL INFILE` 지원 (벌크 INSERT용)
- `root` 사용자는 특정 database에 바인딩되지 않고 연결하여 모든 DB에 접근 가능

#### MSSQL / Azure SQL

```typescript
const mssqlConfig: MssqlDbConnConfig = {
  dialect: "mssql",               // 또는 "mssql-azure" (Azure SQL Database용)
  host: "localhost",
  port: 1433,                     // 선택
  username: "sa",
  password: "password",
  database: "mydb",               // 선택
  schema: "dbo",                  // 선택 (MSSQL 스키마)
  defaultIsolationLevel: "READ_UNCOMMITTED",  // 선택
  pool: { min: 1, max: 10 },     // 선택
};
```

MSSQL 연결 특성:
- `"mssql-azure"` dialect 사용 시 `encrypt: true` 자동 설정
- `trustServerCertificate: true` 기본 설정
- `useUTC: false` -- 로컬 시간대 사용

#### PostgreSQL

```typescript
const pgConfig: PostgresqlDbConnConfig = {
  dialect: "postgresql",
  host: "localhost",
  port: 5432,                     // 선택 (기본: 5432)
  username: "postgres",
  password: "password",
  database: "mydb",               // 선택
  schema: "public",               // 선택 (PostgreSQL 스키마)
  defaultIsolationLevel: "READ_UNCOMMITTED",  // 선택
  pool: { min: 1, max: 10 },     // 선택
};
```

## DbConn 인터페이스

모든 DBMS별 연결 클래스(`MysqlDbConn`, `MssqlDbConn`, `PostgresqlDbConn`)와 `PooledDbConn`이 구현하는 공통 인터페이스이다.

| 메서드/속성 | 시그니처 | 설명 |
|------------|----------|------|
| `config` | `DbConnConfig` | 연결 설정 (읽기 전용) |
| `isConnected` | `boolean` | 연결 상태 |
| `isOnTransaction` | `boolean` | 트랜잭션 진행 여부 |
| `connect()` | `() => Promise<void>` | DB 연결 수립 |
| `close()` | `() => Promise<void>` | DB 연결 종료 (PooledDbConn은 풀에 반환) |
| `beginTransaction()` | `(isolationLevel?: IsolationLevel) => Promise<void>` | 트랜잭션 시작 |
| `commitTransaction()` | `() => Promise<void>` | 트랜잭션 커밋 |
| `rollbackTransaction()` | `() => Promise<void>` | 트랜잭션 롤백 |
| `execute()` | `(queries: string[]) => Promise<unknown[][]>` | SQL 쿼리 배열 실행 |
| `executeParametrized()` | `(query: string, params?: unknown[]) => Promise<unknown[][]>` | 파라미터화된 쿼리 실행 |
| `bulkInsert()` | `(tableName: string, columnMetas: Record<string, ColumnMeta>, records: Record<string, unknown>[]) => Promise<void>` | 네이티브 벌크 INSERT |

`DbConn`은 `EventEmitter<{ close: void }>`를 상속하므로 `on("close", handler)` / `off("close", handler)`로 연결 종료 이벤트를 수신할 수 있다.

## 지원 데이터베이스

| 데이터베이스 | 드라이버 패키지 | dialect 값 | 최소 버전 |
|-------------|----------------|------------|----------|
| MySQL | `mysql2` | `"mysql"` | 8.0.14+ |
| SQL Server | `tedious` | `"mssql"` | 2012+ |
| Azure SQL Database | `tedious` | `"mssql-azure"` | - |
| PostgreSQL | `pg`, `pg-copy-streams` | `"postgresql"` | 9.0+ |

## 주의사항

### 타임아웃

- 기본 연결 타임아웃은 10분(`DB_CONN_DEFAULT_TIMEOUT = 600000ms`)이다.
- 유휴 상태가 타임아웃의 2배(20분)를 초과하면 연결이 자동으로 종료된다.
- 커넥션 풀의 `acquireTimeoutMillis`(기본 30초)와 `idleTimeoutMillis`(기본 30초)는 별도로 동작한다.

### SQL 인젝션 보안

`@simplysm/orm-common`은 동적 쿼리 특성상 파라미터 바인딩 대신 문자열 이스케이프 방식을 사용한다. 따라서 사용자 입력을 ORM 쿼리에 전달할 때는 반드시 애플리케이션 레벨에서 입력 검증을 수행해야 한다. 자세한 내용은 프로젝트 루트의 `CLAUDE.md`에 있는 "ORM 보안 가이드"를 참고한다.

### 드라이버 지연 로딩

DBMS별 드라이버(`mysql2`, `tedious`, `pg`)는 `DbConnFactory` 내부에서 지연 로딩(lazy loading)된다. 따라서 사용하지 않는 드라이버를 설치하지 않아도 import 에러가 발생하지 않는다.

### PooledDbConn의 close 동작

`PooledDbConn.close()`는 실제 물리 연결을 종료하지 않고 커넥션 풀에 반환한다. 트랜잭션이 진행 중인 상태에서 `close()`를 호출하면, 풀에 반환하기 전에 자동으로 롤백을 시도한다.

## 선택 의존성 (Optional Peer Dependencies)

| 패키지 | 용도 |
|--------|------|
| `mysql2` | MySQL 드라이버 |
| `tedious` | MSSQL 드라이버 |
| `pg` | PostgreSQL 드라이버 |
| `pg-copy-streams` | PostgreSQL 벌크 COPY 지원 |

## 라이선스

Apache-2.0
