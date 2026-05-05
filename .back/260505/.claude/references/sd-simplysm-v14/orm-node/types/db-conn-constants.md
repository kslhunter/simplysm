# `DB_CONN_CONNECT_TIMEOUT`

> **읽어야 하는 상황**: 타임아웃 상수나 오류 메시지 상수의 값을 참조할 때.

DB 연결 수립 타임아웃 (10초).

```typescript
const DB_CONN_CONNECT_TIMEOUT = 10 * 1000; // 10_000ms
```

## Related Types

### `DB_CONN_DEFAULT_TIMEOUT`

DB 쿼리 기본 타임아웃 (10분). 유휴 연결 자동 종료 타이머는 이 값의 2배 후 `close()`를 호출한다.

```typescript
const DB_CONN_DEFAULT_TIMEOUT = 10 * 60 * 1000; // 600_000ms
```

### `DB_CONN_ERRORS`

DB 연결 관련 오류 메시지 상수.

```typescript
const DB_CONN_ERRORS = {
  NOT_CONNECTED: "'Connection'이 연결되어 있지 않습니다.",
  ALREADY_CONNECTED: "'Connection'이 이미 연결되어 있습니다.",
} as const;
```

| Key | Value |
|-----|-------|
| `NOT_CONNECTED` | `"'Connection'이 연결되어 있지 않습니다."` |
| `ALREADY_CONNECTED` | `"'Connection'이 이미 연결되어 있습니다."` |
