# CLAUDE.md

> 이 패키지의 사용법 및 지침은 `.claude/references/sd-simplysm-v14/orm-node/README.md`를 참조한다.

## Package Overview

`@simplysm/orm-node` — Node.js 환경에서 MSSQL, MySQL, PostgreSQL에 대한 저수준 DB 연결 및 ORM 실행자를 제공하는 패키지. 8개 TypeScript 소스 파일.

## Architecture

```
src/
├── connections/
│   ├── mssql-db-conn.ts      ← MSSQL 연결 (tedious)
│   ├── mysql-db-conn.ts      ← MySQL 연결 (mysql2/promise)
│   └── postgresql-db-conn.ts ← PostgreSQL 연결 (pg + pg-copy-streams)
├── types/
│   └── db-conn.ts            ← DbConn 인터페이스, DbConnConfig 타입, 공통 상수
├── create-db-conn.ts         ← dialect 기반 DbConn 팩토리 (지연 로딩)
├── create-orm.ts             ← Orm 인터페이스 및 createOrm() 팩토리
├── node-db-context-executor.ts ← orm-common의 DbContextExecutor 구현체
└── index.ts                  ← public API re-exports
```

### 계층 구조

`createOrm()` → `NodeDbContextExecutor` → `createDbConn()` → `{Mssql|Mysql|Postgresql}DbConn`

- `createOrm()`은 사용자 진입점. DbContextDef와 연결 설정을 받아 `connect()`/`connectWithoutTransaction()`을 제공한다.
- `NodeDbContextExecutor`는 `orm-common`의 `DbContextExecutor` 인터페이스를 구현하며 실제 DB 연결을 관리한다.
- 각 `*DbConn` 클래스는 `DbConn` 인터페이스를 구현하고 `EventEmitter<{ close: void }>`를 상속한다.

## Key Patterns

### DbConn 구현체 공통 구조

세 연결 클래스(`MssqlDbConn`, `MysqlDbConn`, `PostgresqlDbConn`)는 동일한 패턴을 따른다:

```typescript
export class XxxDbConn extends EventEmitter<{ close: void }> implements DbConn {
  private readonly _timeout = DB_CONN_DEFAULT_TIMEOUT;
  private _conn?: NativeConnType;
  private _connTimeout?: ReturnType<typeof setTimeout>;

  isConnected = false;
  isInTransaction = false;

  constructor(
    private readonly _nativeLib: typeof import("native-lib"),
    readonly config: XxxDbConnConfig,
  ) {
    super();
  }
  // connect, close, beginTransaction, commitTransaction, rollbackTransaction,
  // execute, executeParametrized, bulkInsert 구현
}
```

- 생성자에서 네이티브 라이브러리를 직접 주입받는다 (`createDbConn()`이 동적 import 후 전달).
- `_startTimeout()` / `_stopTimeout()`으로 유휴 연결을 자동 종료한다 (기본 타임아웃의 2배 후 `close()` 호출).
- 에러는 반드시 `SdError`로 래핑하여 throw한다.
- 연결 없이 메서드 호출 시 `DB_CONN_ERRORS.NOT_CONNECTED`를 throw하는 `_assertConnected()` 내부 헬퍼를 사용한다.

### 지연 로딩 (create-db-conn.ts)

드라이버 패키지(tedious, mysql2, pg, pg-copy-streams)는 peerDependency이며 선택적이다.
`createDbConn()`은 최초 호출 시에만 동적 import로 로드하고 모듈 수준 캐시에 보관한다:

```typescript
const modules: { tedious?: ...; mysql?: ...; pg?: ...; pgCopyStreams?: ... } = {};

export async function createDbConn(config: DbConnConfig): Promise<DbConn> {
  if (config.dialect === "mysql") {
    const mysql = await ensureModule("mysql");
    return new MysqlDbConn(mysql, config);
  }
  // ...
}
```

### Bulk Insert 전략

각 DBMS는 네이티브 대량 삽입 API를 사용한다. 구현 방식이 다르므로 반드시 각 클래스의 `bulkInsert()`를 참조한다:

| DBMS       | 방식                            | 비고                                   |
|------------|---------------------------------|----------------------------------------|
| MSSQL      | tedious `BulkLoad`              | `Uint8Array` → `Buffer` 변환 필요 (tedious 요구사항) |
| MySQL      | `LOAD DATA LOCAL INFILE`        | 임시 CSV 파일 생성 후 삭제, UUID/binary는 `UNHEX()` 변환 |
| PostgreSQL | `COPY FROM STDIN` (CSV 스트림)  | `pg-copy-streams` 사용                 |

MSSQL `bulkInsert()`에서 `Buffer` 사용은 tedious 라이브러리 요구사항으로 인한 예외적 허용이며, eslint-disable 주석이 명시되어 있다.

### createOrm() 사용법

```typescript
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

// 트랜잭션 포함 (기본)
await orm.connect(async (db) => {
  const users = await db.user().execute();
  return users;
});

// 트랜잭션 없이 실행
await orm.connectWithoutTransaction(async (db) => { ... });
```

`OrmOptions`의 `database`/`schema`는 `DbConnConfig`보다 우선 적용된다.

### 타입 구조

- `DbConnConfig` = `MysqlDbConnConfig | MssqlDbConnConfig | PostgresqlDbConnConfig` (discriminated union, `dialect` 필드로 분기)
- `dialect: "mssql-azure"`는 `MssqlDbConnConfig`에 속하며, `getDialectFromConfig()`로 `"mssql"`로 정규화된다.
- 기본 격리 수준: 모든 DBMS에서 `READ_UNCOMMITTED` (설정 미지정 시).

## 테스트

통합 테스트는 패키지 내부가 아닌 `tests/orm/` (모노레포 루트 기준)에 위치한다.
Docker가 필요하며 `tests/docker-compose.test.yml`에 MySQL(23306), PostgreSQL(25432), MSSQL(21433) 컨테이너 정의가 있다.

```
tests/orm/src/
├── db-conn/
│   └── db-conn.spec.ts       ← 3개 DBMS(MSSQL/MySQL/PostgreSQL) DbConn 통합 테스트
├── db-context/
│   └── db-context.spec.ts    ← 3개 DBMS DbContext + ORM 통합 테스트
├── escape/
│   └── escape.spec.ts        ← SQL 이스케이프 단위 테스트
├── test-configs.ts           ← DBMS별 연결 설정 상수
└── test-fixtures.ts          ← 공통 테스트 픽스처 (컬럼 메타, 레코드)
```

테스트는 `DbDialectDef` 인터페이스로 DBMS별 SQL 방언을 추상화하여 하나의 spec 파일에서 3개 DBMS를 반복 테스트한다. `*DbConn` 클래스를 직접 생성할 때는 네이티브 라이브러리를 동적 import하여 생성자에 전달한다:

```typescript
const mysql2 = await import("mysql2/promise");
const conn = new MysqlDbConn(mysql2, mysqlConfig);
```
