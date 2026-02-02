/**
 * 트랜잭션 관련 에러 코드
 *
 * DBMS별 native 에러 코드를 추상화하여 DBMS 독립적인 에러 처리 가능
 */
export enum DbErrorCode {
  /** 활성 트랜잭션이 없음 (ROLLBACK 시 트랜잭션 없음) */
  NO_ACTIVE_TRANSACTION = "NO_ACTIVE_TRANSACTION",

  /** 트랜잭션이 이미 시작됨 */
  TRANSACTION_ALREADY_STARTED = "TRANSACTION_ALREADY_STARTED",

  /** 데드락 발생 */
  DEADLOCK = "DEADLOCK",

  /** 락 타임아웃 */
  LOCK_TIMEOUT = "LOCK_TIMEOUT",
}

/**
 * 데이터베이스 트랜잭션 에러
 *
 * DBMS별 native 에러를 표준화된 에러 코드로 래핑하여
 * DBMS 독립적인 에러 처리 가능
 *
 * @example
 * ```typescript
 * try {
 *   await db.rollbackTransaction();
 * } catch (err) {
 *   if (err instanceof DbTransactionError) {
 *     if (err.code === DbErrorCode.NO_ACTIVE_TRANSACTION) {
 *       // 이미 롤백된 경우 무시
 *       return;
 *     }
 *   }
 *   throw err;
 * }
 * ```
 */
export class DbTransactionError extends Error {
  override readonly name = "DbTransactionError";

  constructor(
    /** 표준화된 에러 코드 */
    public readonly code: DbErrorCode,
    /** 에러 메시지 */
    message: string,
    /** 원본 DBMS 에러 (디버깅용) */
    public readonly originalError?: unknown,
  ) {
    super(message);
  }
}
