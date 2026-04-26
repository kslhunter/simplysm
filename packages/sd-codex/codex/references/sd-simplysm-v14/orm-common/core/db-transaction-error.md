# `DbTransactionError`

> **읽어야 하는 상황**: 트랜잭션 롤백/커밋 실패 시 DBMS 독립적으로 에러를 분류하고 처리할 때. 연결/트랜잭션 관리 자체는 [`DbContext`](./db-context.md) 참조.

DBMS별 네이티브 트랜잭션 에러를 표준화된 에러 코드로 래핑하는 에러 클래스. DBMS 독립적인 에러 처리를 지원한다.

```typescript
export class DbTransactionError extends Error {
  override readonly name = "DbTransactionError";

  constructor(
    public readonly code: DbErrorCode,
    message: string,
    public readonly originalError?: unknown,
  );
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `name` | property | `"DbTransactionError"` | 에러 이름 |
| `code` | property | `DbErrorCode` | 표준화된 에러 코드 |
| `originalError` | property | `unknown \| undefined` | 원본 DBMS 에러 (디버깅용) |

## Related Types

### `DbErrorCode`

트랜잭션 관련 에러 코드. DBMS별 네이티브 에러 코드를 추상화한다.

```typescript
export enum DbErrorCode {
  NO_ACTIVE_TRANSACTION = "NO_ACTIVE_TRANSACTION",
  TRANSACTION_ALREADY_STARTED = "TRANSACTION_ALREADY_STARTED",
  DEADLOCK = "DEADLOCK",
  LOCK_TIMEOUT = "LOCK_TIMEOUT",
}
```

| 값 | 설명 |
|----|------|
| `NO_ACTIVE_TRANSACTION` | 활성 트랜잭션 없음 (ROLLBACK 시 트랜잭션 없음) |
| `TRANSACTION_ALREADY_STARTED` | 트랜잭션 이미 시작됨 |
| `DEADLOCK` | 데드락 발생 |
| `LOCK_TIMEOUT` | 잠금 타임아웃 |

## Usage

```typescript
try {
  await executor.rollbackTransaction();
} catch (err) {
  if (err instanceof DbTransactionError) {
    if (err.code === DbErrorCode.NO_ACTIVE_TRANSACTION) {
      // 이미 롤백된 경우 무시
      return;
    }
    if (err.code === DbErrorCode.DEADLOCK) {
      // 데드락 재시도 로직
    }
  }
  throw err;
}
```
