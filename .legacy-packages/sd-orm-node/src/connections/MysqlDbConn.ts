import { SdLogger } from "@simplysm/sd-core-node";
import type { Connection } from "mysql2/promise";
import { EventEmitter } from "events";
import { SdError, StringUtils } from "@simplysm/sd-core-common";
import type {
  IDbConn,
  IDefaultDbConnConf,
  IQueryColumnDef,
  ISOLATION_LEVEL,
} from "@simplysm/sd-orm-common";
import { QueryHelper } from "@simplysm/sd-orm-common";

export class MysqlDbConn extends EventEmitter implements IDbConn {
  private static readonly ERR_NOT_CONNECTED = "'Connection'이 연결되어있지 않습니다.";
  private static readonly ERR_ALREADY_CONNECTED = "이미 'Connection'이 연결되어있습니다.";

  private readonly _logger = SdLogger.get(["simplysm", "sd-orm-node", this.constructor.name]);
  private readonly _timeout = 5 * 60 * 1000;

  private _conn?: Connection;
  private _connTimeout?: NodeJS.Timeout;

  isConnected = false;
  isOnTransaction = false;

  constructor(
    private readonly _mysql2: typeof import("mysql2/promise"),
    readonly config: IDefaultDbConnConf,
  ) {
    super();
  }

  async connectAsync(): Promise<void> {
    if (this.isConnected) {
      throw new Error(MysqlDbConn.ERR_ALREADY_CONNECTED);
    }

    const conn = await this._mysql2.createConnection({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.username === "root" ? undefined : this.config.database,
      multipleStatements: true,
      charset: "utf8mb4",
    });

    conn.on("end", () => {
      this.emit("close");
      this._resetState();
    });

    conn.on("error", (error) => {
      this._logger.error("error: " + error.message);
    });

    this._conn = conn;
    this._startTimeout();
    this.isConnected = true;
  }

  async closeAsync(): Promise<void> {
    this._stopTimeout();

    if (!this._conn || !this.isConnected) {
      return;
    }

    await this._conn.end();

    this.emit("close");
    this._resetState();
  }

  async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    const conn = this._assertConnected();

    await conn.beginTransaction();

    const level = (
      isolationLevel ??
      this.config.defaultIsolationLevel ??
      "REPEATABLE_READ"
    ).replace(/_/g, " ");
    await conn.query({
      sql: `SET SESSION TRANSACTION ISOLATION LEVEL ${level}`,
      timeout: this._timeout,
    });

    this.isOnTransaction = true;
  }

  async commitTransactionAsync(): Promise<void> {
    const conn = this._assertConnected();
    await conn.commit();
    this.isOnTransaction = false;
  }

  async rollbackTransactionAsync(): Promise<void> {
    const conn = this._assertConnected();
    await conn.rollback();
    this.isOnTransaction = false;
  }

  async executeAsync(queries: string[]): Promise<any[][]> {
    const results: any[][] = [];
    for (const query of queries.filter((item) => !StringUtils.isNullOrEmpty(item))) {
      const resultItems = await this.executeParametrizedAsync(query);
      results.push(...resultItems);
    }
    return results;
  }

  async executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]> {
    const conn = this._assertConnected();

    this._logger.debug(`쿼리 실행(${query.length.toLocaleString()}): ${query}, ${params}`);

    try {
      const [queryResults] = await conn.query({
        sql: query,
        timeout: this._timeout,
        values: params,
      });

      this._startTimeout();

      const result: any[] = [];
      if (queryResults instanceof Array) {
        for (const queryResult of queryResults.filter(
          (item: any) => !("affectedRows" in item && "fieldCount" in item),
        )) {
          result.push(queryResult);
        }
      }

      return [result];
    } catch (err: any) {
      this._startTimeout();
      throw new SdError(
        err,
        "쿼리 수행중 오류발생" + (err.sql != null ? "\n-- query\n" + err.sql.trim() + "\n--" : ""),
      );
    }
  }

  async bulkInsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    const q = this._buildBulkValuesQuery(tableName, columnDefs, records) + ";";
    await this.executeAsync([q]);
  }

  async bulkUpsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    let q = this._buildBulkValuesQuery(tableName, columnDefs, records);

    q += "\nON DUPLICATE KEY UPDATE\n";
    const updateCols = columnDefs
      .filter((item) => !item.autoIncrement)
      .map((item) => `${item.name} = VALUES(${item.name})`);
    q += updateCols.join(",\n") + ";";

    await this.executeAsync([q]);
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  private _assertConnected(): Connection {
    if (!this._conn || !this.isConnected) {
      throw new Error(MysqlDbConn.ERR_NOT_CONNECTED);
    }
    this._startTimeout();
    return this._conn;
  }

  private _resetState(): void {
    this.isConnected = false;
    this.isOnTransaction = false;
    this._conn = undefined;
  }

  private _buildBulkValuesQuery(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): string {
    const qh = new QueryHelper("mysql");
    const colNames = columnDefs.map((def) => def.name);

    let q = `INSERT INTO ${tableName} (${colNames.map((c) => "\`" + c + "\`").join(", ")})\n          VALUES\n`;
    for (const record of records) {
      q += `(${colNames.map((c) => qh.getQueryValue(record[c])).join(", ")}),\n`;
    }
    return q.slice(0, -2);
  }

  private _stopTimeout(): void {
    if (this._connTimeout) {
      clearTimeout(this._connTimeout);
    }
  }

  private _startTimeout(): void {
    this._stopTimeout();
    this._connTimeout = setTimeout(async () => {
      await this.closeAsync();
    }, this._timeout * 2);
  }
}
