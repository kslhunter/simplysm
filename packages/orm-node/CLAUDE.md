# orm-node 개발 가이드

> SimplySM 프레임워크의 Node.js ORM 패키지 - Claude Code 참고 문서
>
> **주의:** `sd-orm-node`(구버전)은 참고 금지.

**이 문서는 Claude Code가 orm-node 패키지를 개발/수정할 때 참고하는 가이드입니다.**

## 아키텍처

```
Application
    ↓
SdOrm / NodeDbContextExecutor
    ↓
DbConnFactory (커넥션 풀)
    ↓
PooledDbConn (풀 래퍼)
    ↓
MysqlDbConn / MssqlDbConn / PostgresqlDbConn (물리 연결)
```

**핵심**: 커넥션 풀링으로 DB 연결 재사용. dialect별로 별도 Connection 클래스.

## 의존성

```
orm-node
    ↓
orm-common (QueryBuilder, parseQueryResultAsync, 타입)
    ↓
core-common
    +
pino (로깅)
generic-pool (커넥션 풀링)
```

**peer dependencies**: mysql2, tedious, pg (선택 설치)

## 모듈 구조

```
src/
├── connections/
│   ├── mssql-db-conn.ts      # MSSQL/Azure SQL (tedious)
│   ├── mysql-db-conn.ts      # MySQL (mysql2/promise)
│   └── postgresql-db-conn.ts # PostgreSQL (pg)
├── types/
│   └── db-conn.ts            # IDbConn, DbConnConfig 타입
├── db-conn-factory.ts        # 팩토리 + 풀 관리
├── node-db-context-executor.ts # IDbContextExecutor 구현
├── pooled-db-conn.ts         # 풀 래퍼
├── sd-orm.ts                 # 최상위 진입점
└── index.ts
```

## 주요 컴포넌트

### IDbConn 인터페이스

저수준 DB 연결 인터페이스. EventEmitter 상속.

```typescript
interface IDbConn extends EventEmitter {
  config: DbConnConfig;
  isConnected: boolean;
  isOnTransaction: boolean;

  connectAsync(): Promise<void>;
  closeAsync(): Promise<void>;
  beginTransactionAsync(isolationLevel?: IsolationLevel): Promise<void>;
  commitTransactionAsync(): Promise<void>;
  rollbackTransactionAsync(): Promise<void>;

  executeAsync(queries: string[]): Promise<unknown[][]>;
  executeParametrizedAsync(query: string, params?: unknown[]): Promise<unknown[][]>;

  bulkInsertAsync(tableName: string, columnMetas: Record<string, ColumnMeta>, records: Record<string, unknown>[]): Promise<void>;
}
```

### DbConnConfig 타입

dialect별로 분기되는 연결 설정.

```typescript
type DbConnConfig = MysqlDbConnConfig | MssqlDbConnConfig | PostgresqlDbConnConfig;

interface MysqlDbConnConfig {
  dialect: "mysql";
  host: string;
  port?: number;      // default: 3306
  username: string;
  password: string;
  database: string;
  defaultIsolationLevel?: IsolationLevel;
}

interface MssqlDbConnConfig {
  dialect: "mssql" | "mssql-azure";
  host: string;
  port?: number;      // default: 1433
  username: string;
  password: string;
  database: string;
  schema?: string;    // default: dbo
  defaultIsolationLevel?: IsolationLevel;
}

interface PostgresqlDbConnConfig {
  dialect: "postgresql";
  host: string;
  port?: number;      // default: 5432
  username: string;
  password: string;
  database: string;
  schema?: string;    // default: public
  defaultIsolationLevel?: IsolationLevel;
}
```

### SdOrm 클래스

최상위 진입점. DbContext와 DB 연결을 관리.

```typescript
const orm = new SdOrm(MyDb, {
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
});

// 트랜잭션 내에서 실행
await orm.connectAsync(async (db) => {
  const users = await db.user().resultAsync();
  return users;
});

// 트랜잭션 없이 실행
await orm.connectWithoutTransactionAsync(async (db) => {
  const users = await db.user().resultAsync();
  return users;
});
```

### 커넥션 풀링

DbConnFactory가 generic-pool을 사용하여 커넥션 풀 관리.

```typescript
// 내부 동작
const pool = createPool<IDbConn>({
  create: async () => {
    const conn = await createRawConnection(config);
    await conn.connectAsync();
    return conn;
  },
  destroy: async (conn) => {
    await conn.closeAsync();
  },
  validate: (conn) => Promise.resolve(conn.isConnected),
}, {
  min: 1,
  max: 10,
  acquireTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  testOnBorrow: true,
});
```

## Cross-Dialect 일관성

모든 DBMS에서 동일한 동작을 보장하기 위한 설정:

| 항목 | MySQL | MSSQL | PostgreSQL |
|------|-------|-------|------------|
| **Timeout** | 10분 | 10분 | 10분 |
| **Isolation Level 기본값** | `READ_UNCOMMITTED` | `READ_UNCOMMITTED` | `READ_UNCOMMITTED` |
| **nullable 기본값 (bulkInsert)** | N/A | `false` | N/A |

> **중요**: 모든 dialect가 동일한 기본값을 사용해야 함. 단독으로 변경 금지.

## Dialect별 특징

### MySQL

- **라이브러리**: mysql2/promise
- **트랜잭션**: `BEGIN`, `COMMIT`, `ROLLBACK`
- **Bulk Insert**: LOAD DATA LOCAL INFILE (임시 파일 사용)

### MSSQL

- **라이브러리**: tedious
- **트랜잭션**: `beginTransaction()`, `commitTransaction()`, `rollbackTransaction()` (tedious API)
- **Bulk Insert**: tedious BulkLoad API (네이티브)

### PostgreSQL

- **라이브러리**: pg (node-postgres), pg-copy-streams
- **트랜잭션**: `BEGIN`, `COMMIT`, `ROLLBACK`
- **Bulk Insert**: COPY FROM STDIN (pg-copy-streams 사용)

## Logger 사용

pino 라이브러리 사용.

```typescript
import pino from "pino";

const logger = pino({ name: "mssql-db-conn" });

// 사용
logger.debug({ queryLength: query.length, params }, "쿼리 실행");
logger.error({ err: error.message }, "DB 연결 오류");
logger.info({ rowCount }, "쿼리 완료");
```

## 타입 변환 (MSSQL)

tedious Bulk Insert 시 DataType → TediousDataType 변환 필요.

```typescript
private _convertDataTypeToTediousBulkColumnType(dataType: DataType): {
  type: TediousDataType;
  length?: number;
  precision?: number;
  scale?: number;
} {
  switch (dataType.type) {
    case "int": return { type: TYPES.Int };
    case "bigint": return { type: TYPES.BigInt };
    case "varchar": return { type: TYPES.NVarChar, length: dataType.length };
    case "datetime": return { type: TYPES.DateTime2 };
    // ...
  }
}
```

## 에러 처리

모든 Connection 클래스에서 발생 가능한 에러:

| 에러 | 원인 |
|------|------|
| `이미 'Connection'이 연결되어있습니다.` | 중복 connectAsync() 호출 |
| `'Connection'이 연결되어있지 않습니다.` | 연결 없이 쿼리 실행 |
| `DB에 연결되어있지 않습니다.` | NodeDbContextExecutor에서 연결 없음 |

## 검증 명령

```bash
# 타입 체크
npx tsc --noEmit -p packages/orm-node/tsconfig.json 2>&1 | grep "^packages/orm-node/"

# ESLint
npx eslint "packages/orm-node/**/*.ts"

# 테스트 (Docker 필요)
npx vitest run packages/orm-node
```

## sd-orm-node과의 차이

### 제거됨

| 항목 | 이유 |
|------|------|
| `SqliteDbConn` | SQLite 미지원 (orm-common에 QueryBuilder 없음) |
| `SdLogger` | pino로 대체 |
| `NeverEntryError` | Error로 대체 |

### 추가됨

| 항목 | 설명 |
|------|------|
| `PostgresqlDbConn` | PostgreSQL 지원 (pg + pg-copy-streams) |
| `pino` | 구조화된 JSON 로깅 |
| 네이티브 Bulk Insert | MSSQL: BulkLoad, MySQL: LOAD DATA INFILE, PostgreSQL: COPY |

### 개선됨

| 항목 | 변경 내용 |
|------|----------|
| `any` | → `unknown` 또는 구체적 타입 |
| Bulk 메서드 | `IQueryColumnDef[]` → `Record<string, ColumnMeta>` |
| Import 경로 | `@simplysm/sd-*` → `@simplysm/*` |
