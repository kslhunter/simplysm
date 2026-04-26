# `getDialectFromConfig`

> **읽어야 하는 상황**: 연결 설정의 `dialect` 값을 `@simplysm/orm-common` 쿼리 빌더용 dialect로 변환할 때. DB 연결 객체 생성은 [`createDbConn`](../core/create-db-conn.md)을 사용.

## When to use

- ✅ `mssql-azure` 연결 설정을 쿼리 빌더가 이해하는 `mssql` dialect로 정규화해야 할 때 사용.
- ❌ 연결 구현체를 선택하려는 목적이면 [`createDbConn`](../core/create-db-conn.md)을 사용.

## Signature

```typescript
export function getDialectFromConfig(config: DbConnConfig): Dialect;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `config` | `DbConnConfig` | dialect별 연결 설정. |

## Returns

`Dialect` — `config.dialect === "mssql-azure"`이면 `"mssql"`, 그 외에는 `config.dialect`.

## Usage

```typescript
import { getDialectFromConfig } from "@simplysm/orm-node";

const dialect = getDialectFromConfig({
  dialect: "mssql-azure",
  host: "example.database.windows.net",
  username: "app",
  password: "secret",
});
// dialect === "mssql"
```
