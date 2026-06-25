import { SdError } from "@simplysm/core-common";

/**
 * 트랜잭션 관련 에러 코드
 *
 * DBMS별 네이티브 에러 코드를 추상화하여 DBMS 독립적인 에러 처리를 지원한다
 */
export enum DbErrorCode {
  /** 활성 트랜잭션 없음 (ROLLBACK 시 트랜잭션 없음) */
  NO_ACTIVE_TRANSACTION = "NO_ACTIVE_TRANSACTION",

  /** 트랜잭션 이미 시작됨 */
  TRANSACTION_ALREADY_STARTED = "TRANSACTION_ALREADY_STARTED",

  /** 데드락 발생 */
  DEADLOCK = "DEADLOCK",

  /** 잠금 타임아웃 */
  LOCK_TIMEOUT = "LOCK_TIMEOUT",
}

/**
 * 데이터베이스 트랜잭션 에러
 *
 * DBMS별 네이티브 에러를 표준화된 에러 코드로 래핑하여
 * DBMS 독립적인 에러 처리를 지원한다
 */
export class DbTransactionError extends SdError {
  override readonly name = "DbTransactionError";

  constructor(
    /** 표준화된 에러 코드 */
    public readonly code: DbErrorCode,
    /** 에러 메시지 */
    message: string,
    /** 원본 DBMS 에러 (cause 체인으로 보존) */
    cause?: Error,
  ) {
    super(cause as Error, message);
  }
}
