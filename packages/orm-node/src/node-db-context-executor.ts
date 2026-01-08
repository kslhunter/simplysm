import type {
  IDbContextExecutor,
  IsolationLevel,
  QueryDef,
  ResultMeta,
  Dialect,
  ColumnMeta,
  DataRecord,
} from "@simplysm/orm-common";
import { createQueryBuilder, parseQueryResultAsync } from "@simplysm/orm-common";
import type { DbConnConfig, IDbConn } from "./types/db-conn";
import { getDialectFromConfig } from "./types/db-conn";
import { DbConnFactory } from "./db-conn-factory";

/**
 * Node.js 환경용 DbContextExecutor
 *
 * DbContext에서 사용하는 실행기로, 실제 DB 연결을 담당합니다.
 */
export class NodeDbContextExecutor implements IDbContextExecutor {
  private _conn?: IDbConn;
  private readonly _dialect: Dialect;

  constructor(private readonly _config: DbConnConfig) {
    this._dialect = getDialectFromConfig(_config);
  }

  /**
   * DB 연결 수립
   */
  async connectAsync(): Promise<void> {
    this._conn = await DbConnFactory.createAsync(this._config);
    await this._conn.connectAsync();
  }

  /**
   * DB 연결 종료
   */
  async closeAsync(): Promise<void> {
    this._assertConnected();
    await this._conn!.closeAsync();
    this._conn = undefined;
  }

  /**
   * 트랜잭션 시작
   */
  async beginTransactionAsync(isolationLevel?: IsolationLevel): Promise<void> {
    this._assertConnected();
    await this._conn!.beginTransactionAsync(isolationLevel);
  }

  /**
   * 트랜잭션 커밋
   */
  async commitTransactionAsync(): Promise<void> {
    this._assertConnected();
    await this._conn!.commitTransactionAsync();
  }

  /**
   * 트랜잭션 롤백
   */
  async rollbackTransactionAsync(): Promise<void> {
    this._assertConnected();
    await this._conn!.rollbackTransactionAsync();
  }

  /**
   * 파라미터화된 쿼리 실행
   */
  async executeParametrizedAsync(query: string, params?: unknown[]): Promise<unknown[][]> {
    this._assertConnected();
    return await this._conn!.executeParametrizedAsync(query, params);
  }

  /**
   * Bulk Insert (네이티브 벌크 API 사용)
   */
  async bulkInsertAsync(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: DataRecord[],
  ): Promise<void> {
    this._assertConnected();
    await this._conn!.bulkInsertAsync(tableName, columnMetas, records);
  }

  /**
   * QueryDef 배열 실행
   *
   * QueryDef를 SQL로 변환하여 실행하고, ResultMeta를 사용하여 결과를 파싱합니다.
   */
  async executeDefsAsync<T = DataRecord>(
    defs: QueryDef[],
    resultMetas?: (ResultMeta | undefined)[],
  ): Promise<T[][]> {
    this._assertConnected();

    const builder = createQueryBuilder(this._dialect);

    // 가져올 데이터가 없는 것으로 옵션 설정을 했을 때, 하나의 쿼리로 한번의 요청 보냄
    if (resultMetas != null && resultMetas.every((item) => item == null)) {
      const combinedSql = defs.map((def) => builder.build(def).sql).join("\n");
      const results = await this._conn!.executeAsync([combinedSql]);
      return results as T[][];
    }

    // 각 def를 개별 실행
    const results: T[][] = [];
    for (let i = 0; i < defs.length; i++) {
      const def = defs[i];
      const meta = resultMetas?.[i];
      const buildResult = builder.build(def);

      const rawResults = await this._conn!.executeAsync([buildResult.sql]);

      // resultSetIndex가 지정된 경우 해당 인덱스의 결과셋 사용
      const targetResultSet =
        buildResult.resultSetIndex != null ? rawResults[buildResult.resultSetIndex] : rawResults[0];

      if (meta != null) {
        const parsed = await parseQueryResultAsync<T>(
          targetResultSet as Record<string, unknown>[],
          meta,
        );
        results.push(parsed ?? []);
      } else {
        results.push(targetResultSet as T[]);
      }
    }

    return results;
  }

  private _assertConnected(): void {
    if (this._conn == null) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }
  }
}
