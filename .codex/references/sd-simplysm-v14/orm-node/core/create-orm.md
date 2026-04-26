# `createOrm`

> **읽어야 하는 상황**: `@simplysm/orm-common`의 `DbContext` 서브클래스를 Node.js DB 연결과 트랜잭션 경계 안에서 실행할 때. SQL 문자열을 직접 실행하는 저수준 작업은 [`createDbConn`](./create-db-conn.md)을 확인.

## When to use

- ✅ `DbContext` 클래스를 만들었고, 요청·작업 단위로 연결 생성, 트랜잭션 시작, 커밋/롤백, 연결 종료를 위임하려는 경우.
- ❌ 이미 생성된 `DbConn`으로 원시 SQL만 실행하려면 [`createDbConn`](./create-db-conn.md)을 사용.

## Signature

```typescript
export interface OrmOptions {
  database?: string;
  schema?: string;
}

export interface Orm<T extends DbContext> {
  readonly DbClass: new (
    executor: DbContextExecutor,
    opt: { database: string; schema?: string },
  ) => T;
  readonly config: DbConnConfig;
  readonly options?: OrmOptions;

  connect<R>(
    callback: (conn: T) => Promise<R>,
    isolationLevel?: IsolationLevel,
  ): Promise<R>;

  connectWithoutTransaction<R>(callback: (conn: T) => Promise<R>): Promise<R>;
}

export function createOrm<T extends DbContext>(
  DbClass: new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T,
  config: DbConnConfig,
  options?: OrmOptions,
): Orm<T>;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `DbClass` | `new (executor: DbContextExecutor, opt: { database: string; schema?: string }) => T` | 실행할 `DbContext` 서브클래스 생성자. |
| `config` | `DbConnConfig` | DB 연결 설정. |
| `options` | `OrmOptions` | `database`, `schema`를 config보다 우선 적용하는 옵션. |

## Returns

`Orm<T>` — 트랜잭션 실행 메서드와 원본 설정을 가진 ORM 객체.

## Usage

```typescript
import { DbContext } from "@simplysm/orm-common";
import { createOrm } from "@simplysm/orm-node";

class AppDb extends DbContext {
  // queryable 정의는 @simplysm/orm-common 문서를 따른다.
}

const orm = createOrm(AppDb, {
  dialect: "mysql",
  host: "localhost",
  username: "root",
  password: "secret",
  database: "app",
});

const result = await orm.connect(async (db) => {
  return db;
});
```

## Anti-patterns

### database 없이 인스턴스 생성

```typescript
// 잘못된 예: config와 options 모두 database를 제공하지 않음
createOrm(AppDb, {
  dialect: "mysql",
  host: "localhost",
  username: "root",
  password: "secret",
});
```

**근거**: 내부 `_createInstance()`는 `options.database ?? config.database`가 비어 있으면 `"database는 필수입니다"` 오류를 던진다.

## Related Types

### `OrmOptions`

```typescript
export interface OrmOptions {
  database?: string;
  schema?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `database` | `string` | `DbConnConfig.database` 대신 사용할 데이터베이스 이름. |
| `schema` | `string` | `DbConnConfig.schema` 대신 사용할 스키마 이름. |

### `Orm<T extends DbContext>`

`connect`는 트랜잭션 안에서 콜백을 실행하고, `connectWithoutTransaction`은 트랜잭션 없이 콜백을 실행한다.
