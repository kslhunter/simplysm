import {Logger} from "@simplysm/sd-core-node";
import mysql from "mysql";
import {EventEmitter} from "events";
import {SdError, StringUtil} from "@simplysm/sd-core-common";
import {
  type IDbConnection,
  type IDefaultDbConnectionConfig,
  type IQueryColumnDef,
  type ISOLATION_LEVEL,
  QueryHelper
} from "@simplysm/sd-orm-common";

export class MysqlDbConnection extends EventEmitter implements IDbConnection {
  private readonly _logger = Logger.get(["simplysm", "sd-orm-node", this.constructor.name]);

  private readonly _timeout = 5 * 60 * 1000;

  private _conn?: mysql.Connection;
  private _connTimeout?: NodeJS.Timeout;

  public isConnected = false;
  public isOnTransaction = false;

  public constructor(public readonly config: IDefaultDbConnectionConfig) {
    super();
  }

  public async connectAsync(): Promise<void> {
    if (this.isConnected) {
      throw new Error("이미 'Connection'이 연결되어있습니다.");
    }

    const conn = mysql.createConnection({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.username === "root" ? undefined : this.config.database,
      multipleStatements: true
    });

    conn.on("end", () => {
      this.emit("close");
      this.isConnected = false;
      this.isOnTransaction = false;
      delete this._conn;
    });

    await new Promise<void>((resolve, reject) => {
      conn.on("error", (error) => {
        if (this.isConnected) {
          this._logger.error("error: " + error.message);
        }
        else {
          reject(new Error(error.message));
        }
      });

      conn.on("connect", () => {
        this._startTimeout();
        this.isConnected = true;
        this.isOnTransaction = false;
        resolve();
      });

      conn.connect();
    });
    this._conn = conn;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async closeAsync(): Promise<void> {
    this._stopTimeout();

    if (!this._conn || !this.isConnected) {
      return;
    }

    this._conn.destroy();

    this.emit("close");
    this.isConnected = false;
    this.isOnTransaction = false;
    delete this._conn;
  }

  public async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    const conn = this._conn;

    await new Promise<void>((resolve, reject) => {
      conn.beginTransaction((err: mysql.MysqlError | null) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      conn.query({
        sql: "SET SESSION TRANSACTION ISOLATION LEVEL " + (isolationLevel ?? this.config.defaultIsolationLevel ?? "REPEATABLE_READ").replace(/_/g, " "),
        timeout: this._timeout
      }, (err) => {
        if (err) {
          reject(new Error(err.message));
          return;
        }

        this.isOnTransaction = true;
        resolve();
      });
    });
  }

  public async commitTransactionAsync(): Promise<void> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    const conn = this._conn;

    await new Promise<void>((resolve, reject) => {
      conn.commit((err: mysql.MysqlError | null) => {
        if (err != null) {
          reject(new Error(err.message));
          return;
        }

        this.isOnTransaction = false;
        resolve();
      });
    });
  }

  public async rollbackTransactionAsync(): Promise<void> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    const conn = this._conn;

    await new Promise<void>((resolve, reject) => {
      conn.rollback((err: mysql.MysqlError | null) => {
        if (err != null) {
          reject(new Error(err.message));
          return;
        }

        this.isOnTransaction = false;
        resolve();
      });
    });
  }

  public async executeAsync(queries: string[]): Promise<any[][]> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    const conn = this._conn;

    const results: any[][] = [];
    for (const query of queries.filter((item) => !StringUtil.isNullOrEmpty(item))) {
      const queryStrings = query.split(/\r?\nGO(\r?\n|$)/g);

      const resultItems: any[] = [];
      for (const queryString of queryStrings) {
        this._logger.debug(`쿼리 실행(${queryString.length.toLocaleString()}): ${queryString}`);
        await new Promise<void>((resolve, reject) => {
          let rejected = false;
          conn
            .query({sql: queryString, timeout: this._timeout}, (err, queryResults) => {
              this._startTimeout();

              if (err) {
                rejected = true;
                reject(new SdError(err, "쿼리 수행중 오류발생" + (err.sql !== undefined ? "\n-- query\n" + err.sql.trim() + "\n--" : "")));
                return;
              }

              if (queryResults instanceof Array) {
                for (const queryResult of queryResults.filter((item) => !("affectedRows" in item && "fieldCount" in item))) {
                  resultItems.push(queryResult);
                }
              }
            })
            .on("error", (err) => {
              this._startTimeout();
              if (rejected) return;

              rejected = true;
              reject(new SdError(err, "쿼리 수행중 오류발생" + (err.sql !== undefined ? "\n-- query\n" + err.sql.trim() + "\n--" : "")));
            })
            .on("end", () => {
              this._startTimeout();
              if (rejected) return;

              resolve();
            });
        });
      }

      results.push(resultItems);
    }

    return results;
  }

  public async bulkInsertAsync(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void> {
    const qh = new QueryHelper("mysql");

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


  public async bulkUpsertAsync(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void> {
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
    for (const colName of columnDefs.filter(item => !item.autoIncrement).map(item => item.name)) {
      q += `${colName} = VALUES(${colName}),\n`;
    }
    q = q.slice(0, -2) + ";";

    await this.executeAsync([q]);
  }

  private _stopTimeout(): void {
    if (this._connTimeout) {
      clearTimeout(this._connTimeout);
    }
  }

  private _startTimeout(): void {
    if (this._connTimeout) {
      clearTimeout(this._connTimeout);
    }
    this._connTimeout = setTimeout(
      async () => {
        await this.closeAsync();
      },
      this._timeout * 2
    );
  }
}
