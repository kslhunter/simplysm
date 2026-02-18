import { EventEmitter } from "events";
import { SdError, StringUtils } from "@simplysm/sd-core-common";
import type {
  IDbConn,
  IQueryColumnDef,
  ISOLATION_LEVEL,
  ISqliteDbConnConf,
} from "@simplysm/sd-orm-common";
import { QueryHelper } from "@simplysm/sd-orm-common";
import { SdLogger } from "@simplysm/sd-core-node";
import type sqlite3Type from "sqlite3";

export class SqliteDbConn extends EventEmitter implements IDbConn {
  private readonly _logger = SdLogger.get(["simplysm", "sd-orm-node", this.constructor.name]);

  private readonly _timeout = 300000;

  private _conn?: sqlite3Type.Database;
  private _connTimeout?: NodeJS.Timeout;

  isConnected = false;
  isOnTransaction = false;

  constructor(
    private readonly _sqlite3: typeof import("sqlite3"),
    readonly config: ISqliteDbConnConf,
  ) {
    super();
  }

  async connectAsync() {
    if (this.isConnected) {
      throw new Error("이미 'Connection'이 연결되어있습니다.");
    }

    const conn = new this._sqlite3.Database(this.config.filePath);

    conn.on("close", () => {
      this.emit("close");
      this.isConnected = false;
      this.isOnTransaction = false;
      this._conn = undefined;
    });

    await new Promise<void>((resolve, reject) => {
      conn.on("error", (error) => {
        if (this.isConnected) {
          this._logger.error("error: " + error.message);
        } else {
          reject(new Error(error.message));
        }
      });

      conn.on("open", () => {
        this._startTimeout();
        this.isConnected = true;
        this.isOnTransaction = false;
        resolve();
      });

      conn.serialize();
    });

    this._conn = conn;
  }

  async closeAsync() {
    this._stopTimeout();

    await new Promise<void>((resolve, reject) => {
      if (!this._conn || !this.isConnected) {
        return;
      }

      this._conn.close((err) => {
        if (err) {
          reject(err);
          return;
        }

        this.emit("close");
        this.isConnected = false;
        this.isOnTransaction = false;
        this._conn = undefined;
        resolve();
      });
    });
  }

  async beginTransactionAsync(_isolationLevel?: ISOLATION_LEVEL) {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    const conn = this._conn;

    await new Promise<void>((resolve, reject) => {
      conn.run("BEGIN;", (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }

  async commitTransactionAsync() {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    const conn = this._conn;

    await new Promise<void>((resolve, reject) => {
      conn.run("COMMIT;", (err) => {
        if (err != null) {
          reject(new Error(err.message));
          return;
        }

        this.isOnTransaction = false;
        resolve();
      });
    });
  }

  async rollbackTransactionAsync() {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    const conn = this._conn;

    await new Promise<void>((resolve, reject) => {
      conn.run("ROLLBACK;", (err: Error | null) => {
        if (err != null) {
          reject(new Error(err.message));
          return;
        }

        this.isOnTransaction = false;
        resolve();
      });
    });
  }

  async executeAsync(queries: string[]): Promise<any[][]> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    const conn = this._conn;

    const results: any[][] = [];
    for (const query of queries.filter((item) => !StringUtils.isNullOrEmpty(item))) {
      // const queryStrings = query.split(/;\r?\n/g);
      const queryStrings = [query];

      const resultItems: any[] = [];
      for (const queryString of queryStrings) {
        this._logger.debug("쿼리 실행:\n" + queryString);
        await new Promise<void>((resolve, reject) => {
          conn.all(queryString, (err, queryResults) => {
            this._startTimeout();

            if (err) {
              reject(
                new SdError(err, "쿼리 수행중 오류발생\n-- query\n" + queryString.trim() + "\n--"),
              );
              return;
            }

            resultItems.push(...queryResults);
            resolve();
          });
        });
      }

      results.push(resultItems);
    }

    return results;
  }

  async executeParametrizedAsync(query: string, params?: any[]): Promise<any[][]> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }

    const conn = this._conn;

    const results: any[][] = [];
    this._logger.debug(`쿼리 실행(${query.length.toLocaleString()}): ${query}, ${params}`);
    await new Promise<void>((resolve, reject) => {
      conn.all(query, params ?? [], (err, queryResults) => {
        this._startTimeout();

        if (err) {
          reject(new SdError(err, "쿼리 수행중 오류발생\n-- query\n" + query.trim() + "\n--"));
          return;
        }

        results.push(queryResults);
        resolve();
      });
    });

    return results;
  }

  async bulkInsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ) {
    const qh = new QueryHelper("sqlite");

    const colNames = columnDefs.map((def) => def.name);

    let q = "";
    q += `INSERT INTO ${tableName} (${colNames.map((item) => "`" + item + "`").join(", ")})
          VALUES`;
    q += "\n";
    for (const record of records) {
      q += `(${colNames.map((colName) => qh.getQueryValue(record[colName])).join(", ")}),\n`;
    }
    q = q.slice(0, -2) + ";";

    await this.executeAsync([q]);
  }

  async bulkUpsertAsync(
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ) {
    const qh = new QueryHelper("mysql");

    const colNames = columnDefs.map((def) => def.name);

    let q = "";
    q += `INSERT INTO ${tableName} (${colNames.map((item) => "`" + item + "`").join(", ")})
          VALUES`;
    q += "\n";
    for (const record of records) {
      q += `(${colNames.map((colName) => qh.getQueryValue(record[colName])).join(", ")}),\n`;
    }
    q = q.slice(0, -2);

    q += "\n";
    q += "ON DUPLICATE KEY UPDATE\n";
    for (const colName of columnDefs
      .filter((item) => !item.autoIncrement)
      .map((item) => item.name)) {
      q += `${colName} = VALUES(${colName}),\n`;
    }
    q = q.slice(0, -2) + ";";

    await this.executeAsync([q]);
  }

  private _stopTimeout() {
    if (this._connTimeout) {
      clearTimeout(this._connTimeout);
    }
  }

  private _startTimeout() {
    if (this._connTimeout) {
      clearTimeout(this._connTimeout);
    }
    this._connTimeout = setTimeout(async () => {
      await this.closeAsync();
    }, this._timeout * 2);
  }
}
