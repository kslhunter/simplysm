import type {
  DbContextExecutor,
  IsolationLevel,
  QueryDef,
  ResultMeta,
  Dialect,
  ColumnMeta,
  DataRecord,
} from "@simplysm/orm-common";
import { createQueryBuilder, parseQueryResultAsync } from "@simplysm/orm-common";
import type { DbConn, DbConnConfig } from "./types/db-conn";
import { getDialectFromConfig } from "./types/db-conn";
import { DbConnFactory } from "./db-conn-factory";

/**
 * Node.js 환경용 DbContextExecutor
 *
 * DbContext에서 사용하는 실행기로, 실제 DB 연결을 담당한다.
 */
export class NodeDbContextExecutor implements DbContextExecutor {
  private _conn?: DbConn;
  private readonly _dialect: Dialect;

  constructor(private readonly _config: DbConnConfig) {
    this._dialect = getDialectFromConfig(_config);
  }

  /**
   * DB 연결 수립
   *
   * 커넥션 풀에서 연결을 획득하고 연결 상태를 활성화한다.
   */
  async connectAsync(): Promise<void> {
    this._conn = await DbConnFactory.createAsync(this._config);
    await this._conn.connectAsync();
  }

  /**
   * DB 연결 종료
   *
   * 커넥션 풀에 연결을 반환한다.
   *
   * @throws {Error} 연결되지 않은 상태일 때
   */
  async closeAsync(): Promise<void> {
    const conn = this._requireConn();
    await conn.closeAsync();
    this._conn = undefined;
  }

  /**
   * 트랜잭션 시작
   *
   * @param isolationLevel - 트랜잭션 격리 수준
   * @throws {Error} 연결되지 않은 상태일 때
   */
  async beginTransactionAsync(isolationLevel?: IsolationLevel): Promise<void> {
    const conn = this._requireConn();
    await conn.beginTransactionAsync(isolationLevel);
  }

  /**
   * 트랜잭션 커밋
   *
   * @throws {Error} 연결되지 않은 상태일 때
   */
  async commitTransactionAsync(): Promise<void> {
    const conn = this._requireConn();
    await conn.commitTransactionAsync();
  }

  /**
   * 트랜잭션 롤백
   *
   * @throws {Error} 연결되지 않은 상태일 때
   */
  async rollbackTransactionAsync(): Promise<void> {
    const conn = this._requireConn();
    await conn.rollbackTransactionAsync();
  }

  /**
   * 파라미터화된 쿼리 실행
   *
   * @param query - SQL 쿼리 문자열
   * @param params - 쿼리 파라미터 배열
   * @returns 쿼리 결과 배열
   * @throws {Error} 연결되지 않은 상태일 때
   */
  async executeParametrizedAsync(query: string, params?: unknown[]): Promise<unknown[][]> {
    const conn = this._requireConn();
    return conn.executeParametrizedAsync(query, params);
  }

  /**
   * 대량 데이터 삽입 (네이티브 벌크 API 사용)
   *
   * @param tableName - 대상 테이블명
   * @param columnMetas - 컬럼 메타데이터
   * @param records - 삽입할 레코드 배열
   * @throws {Error} 연결되지 않은 상태일 때
   */
  async bulkInsertAsync(
    tableName: string,
    columnMetas: Record<string, ColumnMeta>,
    records: DataRecord[],
  ): Promise<void> {
    const conn = this._requireConn();
    await conn.bulkInsertAsync(tableName, columnMetas, records);
  }

  /**
   * QueryDef 배열 실행
   *
   * QueryDef를 SQL로 변환하여 실행하고, ResultMeta를 사용하여 결과를 파싱한다.
   *
   * @param defs - 실행할 QueryDef 배열
   * @param resultMetas - 결과 파싱용 메타데이터 배열 (타입 변환에 사용)
   * @returns 각 QueryDef의 실행 결과 배열
   * @throws {Error} 연결되지 않은 상태일 때
   */
  async executeDefsAsync<T = DataRecord>(
    defs: QueryDef[],
    resultMetas?: (ResultMeta | undefined)[],
  ): Promise<T[][]> {
    const conn = this._requireConn();

    const builder = createQueryBuilder(this._dialect);

    // 가져올 데이터가 없는 것으로 옵션 설정을 했을 때, 하나의 쿼리로 한번의 요청 보냄
    // 결과가 필요 없으므로 defs.length개의 빈 배열을 반환하여 인터페이스 계약 유지
    if (resultMetas != null && resultMetas.every((item) => item == null)) {
      const combinedSql = defs.map((def) => builder.build(def).sql).join("\n");
      await conn.executeAsync([combinedSql]);
      return defs.map(() => []) as T[][];
    }

    // 각 def를 개별 실행
    const results: T[][] = [];
    for (let i = 0; i < defs.length; i++) {
      const def = defs[i];
      const meta = resultMetas?.[i];
      const buildResult = builder.build(def);

      const rawResults = await conn.executeAsync([buildResult.sql]);

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

  private _requireConn(): DbConn {
    if (this._conn == null) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }
    return this._conn;
  }
}
