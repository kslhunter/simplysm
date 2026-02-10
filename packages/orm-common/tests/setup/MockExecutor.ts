import type { DbContextExecutor, ResultMeta } from "../../src/types/db";
import type { QueryDef } from "../../src/types/query-def";

export class MockExecutor implements DbContextExecutor {
  // 연결 관리 (Mock - 아무것도 안 함)
  async connect(): Promise<void> {}
  async close(): Promise<void> {}

  // 트랜잭션 (Mock - 아무것도 안 함)
  async beginTransaction(): Promise<void> {}
  async commitTransaction(): Promise<void> {}
  async rollbackTransaction(): Promise<void> {}

  // 쿼리 실행
  executeDefs(_defs: QueryDef[], _resultMetas?: (ResultMeta | undefined)[]): Promise<any[][]> {
    return Promise.resolve([[]]);
  }
}
