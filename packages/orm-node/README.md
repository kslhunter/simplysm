# @simplysm/orm-node

@simplysm ORM의 Node.js 모듈로, 실제 데이터베이스 연결 및 쿼리 실행을 담당한다.

## 설치

```bash
npm install @simplysm/orm-node
# or
pnpm add @simplysm/orm-node
```

### 데이터베이스별 드라이버 설치

사용하는 데이터베이스에 맞는 드라이버를 추가로 설치한다.

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

ORM 초기화 및 데이터베이스 연결을 관리한다. `SdOrm`은 DbContext 타입과 연결 설정을 인자로 받는다.

```typescript
import { SdOrm } from "@simplysm/orm-node";
import { DbContext, queryable } from "@simplysm/orm-common";

// DbContext 정의
class MyDb extends DbContext {
  readonly user = queryable(this, User);
  readonly order = queryable(this, Order);
}

// SdOrm 인스턴스 생성 (DbContext 타입을 첫 번째 인자로 전달)
const orm = new SdOrm(MyDb, {
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  database: "mydb",
  username: "root",
  password: "password",
});

// 트랜잭션 내에서 실행
await orm.connect(async (db) => {
  const users = await db.user().result();
  return users;
});
```

### 트랜잭션

`connect`는 트랜잭션 내에서 콜백을 실행한다. 콜백이 성공하면 커밋, 예외 발생 시 롤백된다.

```typescript
await orm.connect(async (db) => {
  await db.user()
    .insert({ name: "John", email: "john@example.com" })
    .execute();

  await db.order()
    .insert({ userId: 1, amount: 100 })
    .execute();

  // 모든 쿼리가 성공하면 커밋, 실패하면 롤백
});

// 트랜잭션 없이 실행
await orm.connectWithoutTransaction(async (db) => {
  const users = await db.user().result();
  return users;
});
```

### 커넥션 풀

`PooledDbConn`을 사용하여 커넥션 풀을 관리할 수 있다. 풀 설정은 `DbConnConfig` 내부의 `pool` 필드로 지정한다.

```typescript
import { SdOrm } from "@simplysm/orm-node";

const orm = new SdOrm(MyDb, {
  dialect: "mssql",
  host: "localhost",
  database: "mydb",
  username: "sa",
  password: "password",
  pool: {        // DbConnConfig 내부의 pool 설정
    min: 2,      // 최소 연결 수
    max: 10,     // 최대 연결 수
  },
});
```

### 개별 커넥션 사용

`DbConnFactory`를 통해 개별 커넥션을 생성할 수 있다.

```typescript
import { DbConnFactory } from "@simplysm/orm-node";

// MySQL
const mysqlConn = await DbConnFactory.create({
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  database: "mydb",
  username: "root",
  password: "password",
});

// MSSQL
const mssqlConn = await DbConnFactory.create({
  dialect: "mssql",
  host: "localhost",
  port: 1433,
  database: "mydb",
  username: "sa",
  password: "password",
});

// PostgreSQL
const pgConn = await DbConnFactory.create({
  dialect: "postgresql",
  host: "localhost",
  port: 5432,
  database: "mydb",
  username: "postgres",
  password: "password",
});

// 연결 및 사용
await mysqlConn.connect();
const results = await mysqlConn.execute(["SELECT * FROM users"]);
await mysqlConn.close();
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
