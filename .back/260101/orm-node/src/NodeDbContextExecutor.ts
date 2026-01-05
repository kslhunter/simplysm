import type {
  IDbContextExecutor,
  IQueryResultParseOption,
  TDialect,
  BaseQueryBuilder,
  TQueryDef} from "@simplysm/orm-common";
import {
  MysqlQueryBuilder,
  MssqlQueryBuilder,
  PostgresqlQueryBuilder,
  MysqlQueryHelper,
  MssqlQueryHelper,
  PostgresqlQueryHelper,
  parseQueryResult,
} from "@simplysm/orm-common";
import type { IDbConn } from "./IDbConn";
import type { TDbConnConf, ISOLATION_LEVEL } from "./types";
import { DbConnFactory } from "./DbConnFactory";

/**
 * Node.js 환경용 DB Context Executor
 *
 * IDbContextExecutor 인터페이스를 구현하여 DbContext에서 사용됩니다.
 * TQueryDef를 받아서 SQL로 변환 후 실행합니다.
 */
export class NodeDbContextExecutor implements IDbContextExecutor {
  private _conn?: IDbConn;
  private readonly _qb: BaseQueryBuilder;

  constructor(private readonly _config: TDbConnConf) {
    this._qb = this._createQueryBuilder(_config.dialect);
  }

  // ============================================
  // 연결 관리
  // ============================================

  async connectAsync(): Promise<void> {
    this._conn = await DbConnFactory.createAsync(this._config);
    await this._conn.connectAsync();
  }

  async closeAsync(): Promise<void> {
    if (!this._conn) {
      throw new Error("DB에 연결되어 있지 않습니다.");
    }
    await this._conn.closeAsync();
    this._conn = undefined;
  }

  // ============================================
  // 트랜잭션
  // ============================================

  async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    const conn = this._getConnection();
    await conn.beginTransactionAsync(isolationLevel);
  }

  async commitTransactionAsync(): Promise<void> {
    const conn = this._getConnection();
    await conn.commitTransactionAsync();
  }

  async rollbackTransactionAsync(): Promise<void> {
    const conn = this._getConnection();
    await conn.rollbackTransactionAsync();
  }

  // ======================root=====================
  // IDbContextExecutor 구현
  // ============================================

  async executeDefsAsync(
    defs: TQueryDef[],
    options?: (IQueryResultParseOption | undefined)[],
  ): Promise<any[][]> {
    const conn = this._getConnection();

    // 옵션이 모두 undefined인 경우 - 결과값이 필요 없음 → 하나의 쿼리로 실행
    if (options?.every((opt) => opt == null)) {
      const combinedQuery = defs.map((def) => this._buildQuery(def)).join("\n");
      return await conn.executeAsync([combinedQuery]);
    }

    // 각 def를 개별 쿼리로 실행
    const queries = defs.flatMap((def) => {
      const query = this._buildQuery(def);
      return Array.isArray(query) ? query : [query];
    });

    const results = await conn.executeAsync(queries);

    // 결과 파싱 (옵션 적용)
    return results.map((rows, i) => {
      const opt = options?.[i];
      return opt != null ? parseQueryResult(rows, opt) : rows;
    });
  }

  // ============================================
  // 추가 편의 메서드
  // ============================================

  /**
   * 연결 정보 조회
   */
  getInfo(): {
    dialect: TDialect;
    database?: string;
    schema?: string;
  } {
    return {
      dialect: this._config.dialect,
      database: this._config.database,
      schema: this._config.schema,
    };
  }

  /**
   * 파라미터화된 쿼리 직접 실행
   */
  async executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]> {
    const conn = this._getConnection();
    return await conn.executeParametrizedAsync(query, params);
  }

  // ============================================
  // Private 헬퍼
  // ============================================

  private _getConnection(): IDbConn {
    if (!this._conn) {
      throw new Error("DB에 연결되어 있지 않습니다.");
    }
    return this._conn;
  }

  private _createQueryBuilder(dialect: TDialect): BaseQueryBuilder {
    switch (dialect) {
      case "mysql": {
        const qh = new MysqlQueryHelper();
        return new MysqlQueryBuilder(qh);
      }
      case "mssql": {
        const qh = new MssqlQueryHelper();
        return new MssqlQueryBuilder(qh);
      }
      case "postgresql": {
        const qh = new PostgresqlQueryHelper();
        return new PostgresqlQueryBuilder(qh);
      }
    }
  }

  private _buildQuery(def: TQueryDef): string | string[] {
    // TQueryDef는 { type: K } & Parameters<BaseQueryBuilder[K]>[0] 형태
    // type에 해당하는 QueryBuilder 메서드 호출
    const { type, ...rest } = def as any;
    const method = this._qb[type as keyof BaseQueryBuilder];

    if (typeof method !== "function") {
      throw new Error(`Unknown query type: ${type}`);
    }

    return (method as Function).call(this._qb, rest);
  }
}
