import { SdError } from "@simplysm/core-common";
import type {
  DbContextExecutor,
  IsolationLevel,
  QueryDef,
  ResultMeta,
  Dialect,
  ColumnMeta,
  DataRecord,
} from "@simplysm/orm-common";
import { createQueryBuilder, parseQueryResult, pickResultSets } from "@simplysm/orm-common";
import type { DbConn, DbConnConfig } from "./types/db-conn";
import { DB_CONN_ERRORS, getDialectFromConfig } from "./types/db-conn";
import { createDbConn } from "./create-db-conn";

/**
 * Node.js 환경용 DbContextExecutor
 *
 * DbContext에서 사용하는 실제 DB 연결을 처리하는 실행자.
 */
export class NodeDbContextExecutor implements DbContextExecutor {
  private _conn?: DbConn;
  private readonly _dialect: Dialect;

  constructor(private readonly _config: DbConnConfig) {
    this._dialect = getDialectFromConfig(_config);
  }

  /**
   * DB 연결을 수립한다
   */
  async connect(): Promise<void> {
    this._conn = await createDbConn(this._config);
    await this._conn.connect();
  }

  /**
   * DB 연결을 종료한다
   *
   * @throws {Error} 연결되지 않은 경우
   */
  async close(): Promise<void> {
    const conn = this._requireConn();
    await conn.close();
    this._conn = undefined;
  }

  /**
   * 트랜잭션을 시작한다
   *
   * @param isolationLevel - 트랜잭션 격리 수준
   * @throws {Error} 연결되지 않은 경우
   */
  async beginTransaction(isolationLevel?: IsolationLevel): Promise<void> {
    const conn = this._requireConn();
    await conn.beginTransaction(isolationLevel);
  }

  /**
   * 트랜잭션을 커밋한다
   *
   * @throws {Error} 연결되지 않은 경우
   */
  async commitTransaction(): Promise<void> {
    const conn = this._requireConn();
    await conn.commitTransaction();
  }

  /**
   * 트랜잭션을 롤백한다
   *
   * @throws {Error} 연결되지 않은 경우
   */
  async rollbackTransaction(): Promise<void> {
    const conn = this._requireConn();
    await conn.rollbackTransaction();
  }

  /**
   * 파라미터화된 쿼리를 실행한다
   *
   * @param query - SQL 쿼리 문자열
   * @param params - 쿼리 파라미터 배열
   * @returns 쿼리 결과 배열
   * @throws {Error} 연결되지 않은 경우
   */
  async executeParametrized(
    query: string,
    params?: unknown[],
  ): Promise<Record<string, unknown>[][]> {
    const conn = this._requireConn();
    return conn.executeParametrized(query, params);
  }

  /**
   * 대량 데이터 삽입 (네이티브 bulk API 사용)
   *
   * @param tableName - 대상 테이블 이름
   * @param columnMetas - 컬럼 메타데이터
   * @param records - 삽입할 레코드 배열
   * @throws {Error} 연결되지 않은 경우
   */
  async bulkInsert(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: DataRecord[],
  ): Promise<void> {
    const conn = this._requireConn();
    await conn.bulkInsert(tableName, columnMetas, records);
  }

  /**
   * QueryDef 배열을 실행한다
   *
   * QueryDef를 SQL로 변환하여 실행하고, ResultMeta를 사용하여 결과를 파싱한다.
   *
   * @param defs - 실행할 QueryDef 배열
   * @param resultMetas - 결과 파싱 메타데이터 배열 (타입 변환에 사용)
   * @returns 각 QueryDef의 실행 결과 배열
   * @throws {Error} 연결되지 않은 경우
   */
  async executeDefs<T = DataRecord>(
    defs: QueryDef[],
    resultMetas?: (ResultMeta | undefined)[],
  ): Promise<T[][]> {
    const conn = this._requireConn();

    const builder = createQueryBuilder(this._dialect);

    // 데이터를 가져올 필요가 없도록 설정된 경우, 단일 쿼리로 한 번의 요청을 보낸다
    // 결과가 필요 없으므로 인터페이스 계약을 유지하기 위해 defs.length에 맞는 빈 배열을 반환
    if (resultMetas != null && resultMetas.every((item) => item == null)) {
      const combinedSql = defs.map((def) => builder.build(def).sql).join("\n");
      await conn.execute([combinedSql]);
      return defs.map(() => []) as T[][];
    }

    // 각 def를 개별적으로 실행
    const results: T[][] = [];
    for (let i = 0; i < defs.length; i++) {
      const def = defs[i];
      const meta = resultMetas?.[i];
      const buildResult = builder.build(def);

      const rawResults = await conn.execute([buildResult.sql]);

      const targetResultSet = pickResultSets(rawResults, buildResult);

      if (meta != null) {
        const parsed = await parseQueryResult<T>(targetResultSet, meta);
        results.push(parsed ?? []);
      } else {
        results.push(targetResultSet as T[]);
      }
    }

    return results;
  }

  private _requireConn(): DbConn {
    if (this._conn == null) {
      throw new SdError(DB_CONN_ERRORS.NOT_CONNECTED);
    }
    return this._conn;
  }
}
