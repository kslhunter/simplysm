import { TQueryDef } from "./query/query-builder/BaseQueryBuilder";
import { IQueryResultParseOption } from "./query/query-def";

export type ISOLATION_LEVEL = "READ_UNCOMMITTED" | "READ_COMMITTED" | "REPEATABLE_READ" | "SERIALIZABLE";

export interface IDbContextExecutor {
  // 연결 관리
  connectAsync(): Promise<void>;
  closeAsync(): Promise<void>;

  // 트랜잭션
  beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void>;
  commitTransactionAsync(): Promise<void>;
  rollbackTransactionAsync(): Promise<void>;

  // 쿼리 실행
  executeDefsAsync(
    defs: TQueryDef[],
    options?: (IQueryResultParseOption | undefined)[],
  ): Promise<any[][]>;

  executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]>;
}
