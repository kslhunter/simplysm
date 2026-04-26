# DB connection constants

> **읽어야 하는 상황**: 연결 수립·쿼리 타임아웃과 공통 연결 오류 메시지 값을 확인할 때. 연결 흐름 자체는 [`DbConn`](./db-conn.md)을 확인.

## Signature

```typescript
export const DB_CONN_CONNECT_TIMEOUT = 10 * 1000;
export const DB_CONN_DEFAULT_TIMEOUT = 10 * 60 * 1000;

export const DB_CONN_ERRORS = {
  NOT_CONNECTED: "'Connection'이 연결되어 있지 않습니다.",
  ALREADY_CONNECTED: "'Connection'이 이미 연결되어 있습니다.",
} as const;
```

## When to use

- ✅ 구현체나 테스트에서 패키지의 연결 타임아웃·오류 메시지와 같은 값을 맞출 때 사용.
- ❌ 애플리케이션의 업무 timeout 정책을 표현하는 상수로 재사용하지 않는다.

## Related Types

### `DB_CONN_CONNECT_TIMEOUT`

`10 * 1000` — 연결 수립 타임아웃이다. MSSQL `connectTimeout`, PostgreSQL `connectionTimeoutMillis`에 사용된다.

### `DB_CONN_DEFAULT_TIMEOUT`

`10 * 60 * 1000` — 쿼리 timeout과 유휴 연결 close timer의 기준값이다.

### `DB_CONN_ERRORS`

| Field | Value |
|-------|-------|
| `NOT_CONNECTED` | `"'Connection'이 연결되어 있지 않습니다."` |
| `ALREADY_CONNECTED` | `"'Connection'이 이미 연결되어 있습니다."` |
