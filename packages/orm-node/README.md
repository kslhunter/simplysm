# @simplysm/orm-node

심플리즘 ORM의 Node.js 모듈입니다. 실제 데이터베이스 연결 및 쿼리 실행을 담당합니다.

## 설치

```bash
npm install @simplysm/orm-node
# or
pnpm add @simplysm/orm-node
```

### 데이터베이스별 드라이버 설치

사용하는 데이터베이스에 맞는 드라이버를 추가로 설치해야 합니다.

```bash
# MySQL
npm install mysql2

# SQL Server (MSSQL)
npm install tedious

# PostgreSQL
npm install pg pg-copy-streams
```

## 주요 기능

### SdOrm

ORM 초기화 및 데이터베이스 연결을 관리합니다.

```typescript
import { SdOrm } from "@simplysm/orm-node";
import { DbContext } from "@simplysm/orm-common";

const orm = new SdOrm({
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  database: "mydb",
  user: "root",
  password: "password",
});

await orm.connectAsync(async (db: DbContext) => {
  // 쿼리 실행
  const users = await db.from(User).resultAsync();
});
```

### 트랜잭션

```typescript
await orm.transAsync(async (db) => {
  await db.from(User)
    .insert({ name: "John", email: "john@example.com" })
    .executeAsync();

  await db.from(Order)
    .insert({ userId: 1, amount: 100 })
    .executeAsync();

  // 모든 쿼리가 성공하면 커밋, 실패하면 롤백
});
```

### 커넥션 풀

자동으로 커넥션 풀을 관리합니다.

```typescript
import { SdOrm } from "@simplysm/orm-node";

const orm = new SdOrm({
  dialect: "mssql",
  host: "localhost",
  database: "mydb",
  user: "sa",
  password: "password",
  pool: {
    min: 2,
    max: 10,
  },
});
```

### 개별 커넥션 사용

```typescript
import { MysqlDbConn, MssqlDbConn, PostgresqlDbConn } from "@simplysm/orm-node";

// MySQL
const mysqlConn = new MysqlDbConn({
  host: "localhost",
  port: 3306,
  database: "mydb",
  user: "root",
  password: "password",
});

// MSSQL
const mssqlConn = new MssqlDbConn({
  host: "localhost",
  port: 1433,
  database: "mydb",
  user: "sa",
  password: "password",
});

// PostgreSQL
const pgConn = new PostgresqlDbConn({
  host: "localhost",
  port: 5432,
  database: "mydb",
  user: "postgres",
  password: "password",
});
```

## 클래스 구조

| 클래스 | 설명 |
|-------|------|
| `SdOrm` | ORM 메인 클래스 |
| `DbConnFactory` | 커넥션 팩토리 |
| `PooledDbConn` | 풀링된 커넥션 |
| `NodeDbContextExecutor` | Node.js용 쿼리 실행기 |
| `MysqlDbConn` | MySQL 커넥션 |
| `MssqlDbConn` | MSSQL 커넥션 |
| `PostgresqlDbConn` | PostgreSQL 커넥션 |

## 지원 데이터베이스

| 데이터베이스 | 드라이버 | 최소 버전 |
|-------------|---------|----------|
| MySQL | `mysql2` | 8.0.14+ |
| SQL Server | `tedious` | 2012+ |
| PostgreSQL | `pg` | 9.0+ |

## 선택 의존성 (Optional Peer Dependencies)

- `mysql2`: MySQL 드라이버
- `tedious`: MSSQL 드라이버
- `pg`: PostgreSQL 드라이버
- `pg-copy-streams`: PostgreSQL 벌크 복사

## 라이선스

Apache-2.0
