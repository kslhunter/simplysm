import { describe, expect, it } from "vitest";
import { DbErrorCode, DbTransactionError } from "../../src/errors/db-transaction-error";

describe("DbTransactionError", () => {
  describe("에러 생성", () => {
    it("NO_ACTIVE_TRANSACTION 에러 생성", () => {
      const originalError = new Error("No transaction in progress");
      const error = new DbTransactionError(
        DbErrorCode.NO_ACTIVE_TRANSACTION,
        "활성 트랜잭션이 없습니다",
        originalError,
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DbTransactionError);
      expect(error.name).toBe("DbTransactionError");
      expect(error.code).toBe(DbErrorCode.NO_ACTIVE_TRANSACTION);
      expect(error.message).toBe("활성 트랜잭션이 없습니다");
      expect(error.originalError).toBe(originalError);
    });

    it("DEADLOCK 에러 생성", () => {
      const originalError = { errno: 1213, message: "Deadlock found" };
      const error = new DbTransactionError(DbErrorCode.DEADLOCK, "데드락이 발생했습니다", originalError);

      expect(error.code).toBe(DbErrorCode.DEADLOCK);
      expect(error.message).toBe("데드락이 발생했습니다");
      expect(error.originalError).toEqual(originalError);
    });

    it("LOCK_TIMEOUT 에러 생성", () => {
      const error = new DbTransactionError(DbErrorCode.LOCK_TIMEOUT, "락 타임아웃");

      expect(error.code).toBe(DbErrorCode.LOCK_TIMEOUT);
      expect(error.originalError).toBeUndefined();
    });

    it("TRANSACTION_ALREADY_STARTED 에러 생성", () => {
      const error = new DbTransactionError(DbErrorCode.TRANSACTION_ALREADY_STARTED, "이미 트랜잭션이 시작되었습니다");

      expect(error.code).toBe(DbErrorCode.TRANSACTION_ALREADY_STARTED);
    });
  });
});
