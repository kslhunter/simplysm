# @simplysm/orm-node

Node.js 환경용 ORM 데이터베이스 연결 모듈

## 설치

```bash
yarn add @simplysm/orm-node
```

### DB 드라이버 설치 (필요한 것만)

```bash
# MySQL
yarn add mysql2

# MSSQL
yarn add tedious

# PostgreSQL
yarn add pg pg-copy-streams
```

## 사용법

### 기본 사용

```typescript
import { SdOrm } from "@simplysm/orm-node";
import { MyDbContext } from "./my-db-context";

const orm = new SdOrm(MyDbContext, {
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
});

// 트랜잭션 내에서 실행
const users = await orm.connectAsync(async (db) => {
  return await db.user().resultAsync();
});

// 트랜잭션 없이 실행
const users = await orm.connectWithoutTransactionAsync(async (db) => {
  return await db.user().resultAsync();
});
```

### 지원 데이터베이스

| DBMS | dialect | 드라이버 |
|------|---------|---------|
| MySQL | `mysql` | mysql2 |
| MSSQL | `mssql` | tedious |
| Azure SQL | `mssql-azure` | tedious |
| PostgreSQL | `postgresql` | pg, pg-copy-streams |

### 연결 설정

```typescript
// MySQL
const mysqlConfig = {
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "mydb",
  defaultIsolationLevel: "READ_UNCOMMITTED", // 기본값
};

// MSSQL
const mssqlConfig = {
  dialect: "mssql",
  host: "localhost",
  port: 1433,
  username: "sa",
  password: "password",
  database: "mydb",
  schema: "dbo",
};

// PostgreSQL
const postgresqlConfig = {
  dialect: "postgresql",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "password",
  database: "mydb",
  schema: "public",
};
```

## 주요 기능

### Bulk Insert

네이티브 벌크 API를 사용한 고성능 대량 삽입:

| DBMS | 방식 |
|------|------|
| MSSQL | tedious BulkLoad |
| MySQL | LOAD DATA LOCAL INFILE |
| PostgreSQL | COPY FROM STDIN |

### 커넥션 풀링

`generic-pool` 라이브러리를 사용한 자동 커넥션 풀 관리:

- 최소 연결: 1
- 최대 연결: 10
- 획득 타임아웃: 30초
- 유휴 타임아웃: 30초

## 의존성

### Dependencies

- `@simplysm/core-common`
- `@simplysm/orm-common`
- `generic-pool`
- `pino`

### Peer Dependencies (선택)

- `mysql2` - MySQL 연결
- `tedious` - MSSQL 연결
- `pg` - PostgreSQL 연결
- `pg-copy-streams` - PostgreSQL COPY 지원

## 라이선스

MIT
