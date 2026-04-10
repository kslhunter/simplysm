import { describe, expect, it, vi } from "vitest";
import { DbContext } from "../../src/db-context";
import { User } from "../setup/models/User";
import type { DbContextExecutor, Migration, ResultMeta } from "../../src/types/db";
import type { QueryDef } from "../../src/types/query-def";
import "../setup/test-utils";

/**
 * initialize() 테스트용 Mock Executor
 *
 * schemaExists → true, _migration 쿼리 → 설정된 결과 반환
 */
class InitMockExecutor implements DbContextExecutor {
  /** _migration SELECT 결과로 반환할 코드 목록 */
  appliedMigrationCodes: string[] | "TABLE_NOT_EXISTS" = [];

  async connect(): Promise<void> {}
  async close(): Promise<void> {}
  async beginTransaction(): Promise<void> {}
  async commitTransaction(): Promise<void> {}
  async rollbackTransaction(): Promise<void> {}

  executeDefs<T>(
    defs: QueryDef[],
    _resultMetas?: (ResultMeta | undefined)[],
  ): Promise<T[][]> {
    const results: T[][] = [];
    for (const def of defs) {
      if (def.type === "schemaExists") {
        // 스키마 존재 확인 → 항상 존재
        results.push([{} as T]);
      } else if (def.type === "select") {
        // _migration 테이블 SELECT
        if (
          def.from != null
          && typeof def.from === "object"
          && "name" in def.from
          && def.from.name === "_migration"
        ) {
          if (this.appliedMigrationCodes === "TABLE_NOT_EXISTS") {
            const err = new Error("Invalid object name '_migration'") as any;
            err.number = 208; // MSSQL error code
            return Promise.reject(err);
          }
          results.push(
            this.appliedMigrationCodes.map((code) => ({ code }) as T),
          );
        } else {
          results.push([{} as T]);
        }
      } else {
        results.push([]);
      }
    }
    return Promise.resolve(results);
  }
}

class TestDb extends DbContext {
  user = this.queryable(User);
  override migrations: Migration[] = [];
}

describe("DbContext.initialize() boolean 반환", () => {
  function createDb(executor: InitMockExecutor) {
    return new TestDb(executor, { database: "TestDb" });
  }

  it("pending migration이 있는 기존 환경 → true 반환", async () => {
    const executor = new InitMockExecutor();
    executor.appliedMigrationCodes = ["001"];

    const upFn = vi.fn();
    const db = createDb(executor);
    db.migrations = [
      { name: "001", up: vi.fn() },
      { name: "002", up: upFn },
    ];

    let result: boolean | undefined;
    await db.connectWithoutTransaction(async () => {
      result = await db.initialize();
    });

    expect(result).toBe(true);
    expect(upFn).toHaveBeenCalledOnce();
  });

  it("pending migration이 없는 기존 환경 → false 반환", async () => {
    const executor = new InitMockExecutor();
    executor.appliedMigrationCodes = ["001", "002"];

    const db = createDb(executor);
    db.migrations = [
      { name: "001", up: vi.fn() },
      { name: "002", up: vi.fn() },
    ];

    let result: boolean | undefined;
    await db.connectWithoutTransaction(async () => {
      result = await db.initialize();
    });

    expect(result).toBe(false);
  });

  it("force=true → false 반환 (up() 미실행)", async () => {
    const executor = new InitMockExecutor();
    executor.appliedMigrationCodes = [];

    const upFn = vi.fn();
    const db = createDb(executor);
    db.migrations = [{ name: "001", up: upFn }];

    let result: boolean | undefined;
    await db.connectWithoutTransaction(async () => {
      result = await db.initialize({ force: true });
    });

    expect(result).toBe(false);
    expect(upFn).not.toHaveBeenCalled();
  });

  it("새 환경 (migration 테이블 없음) → false 반환", async () => {
    const executor = new InitMockExecutor();
    executor.appliedMigrationCodes = "TABLE_NOT_EXISTS";

    const upFn = vi.fn();
    const db = createDb(executor);
    db.migrations = [{ name: "001", up: upFn }];

    let result: boolean | undefined;
    await db.connectWithoutTransaction(async () => {
      result = await db.initialize();
    });

    expect(result).toBe(false);
    expect(upFn).not.toHaveBeenCalled();
  });
});
