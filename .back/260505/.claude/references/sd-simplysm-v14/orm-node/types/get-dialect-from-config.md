# `getDialectFromConfig`

> **읽어야 하는 상황**: `DbConnConfig`에서 정규화된 `Dialect` 값을 추출할 때 (`"mssql-azure"` → `"mssql"` 변환).

`DbConnConfig`에서 정규화된 `Dialect`를 추출한다.

```typescript
function getDialectFromConfig(config: DbConnConfig): Dialect;
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `config` | `DbConnConfig` | DB 연결 설정 |

## Returns

`Dialect` — 정규화된 dialect 값. `"mssql-azure"` → `"mssql"`로 변환하고, 나머지(`"mysql"`, `"mssql"`, `"postgresql"`)는 `config.dialect`를 그대로 반환한다.
