import type { DbContextExecutor, ResultMeta } from "../../src/types/db";
import type { QueryDef } from "../../src/types/query-def";

export class MockExecutor implements DbContextExecutor {
  // 연결 관리 (Mock - 아무것도 안 함)
  async connectAsync(): Promise<void> {}
  async closeAsync(): Promise<void> {}

  // 트랜잭션 (Mock - 아무것도 안 함)
  async beginTransactionAsync(): Promise<void> {}
  async commitTransactionAsync(): Promise<void> {}
  async rollbackTransactionAsync(): Promise<void> {}

  // 쿼리 실행
  executeDefsAsync(
    _defs: QueryDef[],
    _resultMetas?: (ResultMeta | undefined)[],
  ): Promise<any[][]> {
    return Promise.resolve([[]]);
  }
}
