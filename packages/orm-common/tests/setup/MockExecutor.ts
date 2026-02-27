import type { DbContextExecutor, ResultMeta } from "../../src/types/db";
import type { QueryDef } from "../../src/types/query-def";

export class MockExecutor implements DbContextExecutor {
  // connection management (Mock - no-op)
  async connect(): Promise<void> {}
  async close(): Promise<void> {}

  // transactions (Mock - no-op)
  async beginTransaction(): Promise<void> {}
  async commitTransaction(): Promise<void> {}
  async rollbackTransaction(): Promise<void> {}

  // query execution
  executeDefs(_defs: QueryDef[], _resultMetas?: (ResultMeta | undefined)[]): Promise<any[][]> {
    return Promise.resolve([[]]);
  }
}
