/**
 * Transaction-related error codes
 *
 * Abstracts DBMS-specific native error codes for DBMS-independent error handling
 */
export enum DbErrorCode {
  /** No active transaction (no transaction during ROLLBACK) */
  NO_ACTIVE_TRANSACTION = "NO_ACTIVE_TRANSACTION",

  /** Transaction already started */
  TRANSACTION_ALREADY_STARTED = "TRANSACTION_ALREADY_STARTED",

  /** Deadlock occurred */
  DEADLOCK = "DEADLOCK",

  /** Lock timeout */
  LOCK_TIMEOUT = "LOCK_TIMEOUT",
}

/**
 * Database transaction error
 *
 * Wraps DBMS-specific native errors with standardized error codes for
 * DBMS-independent error handling
 *
 * @example
 * ```typescript
 * try {
 *   await db.rollbackTransaction();
 * } catch (err) {
 *   if (err instanceof DbTransactionError) {
 *     if (err.code === DbErrorCode.NO_ACTIVE_TRANSACTION) {
 *       // Ignore if already rolled back
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
    /** Standardized error code */
    public readonly code: DbErrorCode,
    /** Error message */
    message: string,
    /** Original DBMS error (for debugging) */
    public readonly originalError?: unknown,
  ) {
    super(message);
  }
}
