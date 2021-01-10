import { Logger } from "@simplysm/sd-core-node";
import * as mysql from "mysql";
import { EventEmitter } from "events";
import { NotImplementError, SdError, StringUtil } from "@simplysm/sd-core-common";
import { IDbConnection } from "./IDbConnection";
import { IDbConnectionConfig, IQueryColumnDef, ISOLATION_LEVEL } from "@simplysm/sd-orm-common";

export class MysqlDbConnection extends EventEmitter implements IDbConnection {
  private readonly _logger = Logger.get(["simplysm", "sd-orm-node", "MysqlDbConnection"]);

  private readonly _timeout = 300000;

  private _conn?: mysql.Connection;
  private _connTimeout?: NodeJS.Timeout;

  public dialect = "mysql" as const;
  public isConnected = false;
  public isOnTransaction = false;

  public constructor(public readonly config: IDbConnectionConfig) {
    super();
  }

  public async connectAsync(): Promise<void> {
    if (this.isConnected) {
      throw new Error("이미 'Connection'이 연결되어있습니다.");
    }

    const conn = mysql.createConnection({
      host: this.config.host ?? "localhost",
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      multipleStatements: true
    });

    conn.on("error", (error) => {
      this._logger.error(error.code + ": " + error.message);
    });

    conn.on("end", () => {
      this.emit("close");
      this.isConnected = false;
      this.isOnTransaction = false;
      delete this._conn;
    });

    await new Promise<void>((resolve) => {
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
      conn.query({ sql: `SET SESSION TRANSACTION ISOLATION LEVEL ` + (isolationLevel ?? this.config.defaultIsolationLevel ?? ISOLATION_LEVEL.REPEATABLE_READ).replace(/_/g, " "), timeout: this._timeout }, (err) => {
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
      const queryStrings = query.split("GO");

      const resultItems: any[] = [];
      for (const queryString of queryStrings) {
        this._logger.debug("쿼리 실행:\n" + queryString);
        await new Promise<void>((resolve, reject) => {
          let rejected = false;
          conn
            .query({ sql: queryString, timeout: this._timeout }, (err, queryResults) => {
              this._startTimeout();

              if (err) {
                rejected = true;
                reject(new SdError(err, "쿼리 수행중 오류발생" + (err.sql !== undefined ? "\n-- query\n" + err.sql.trim() + "\n--" : "")));
                return;
              }

              if (queryResults instanceof Array) {
                resultItems.push(...queryResults);
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

  // eslint-disable-next-line @typescript-eslint/require-await
  public async bulkInsertAsync(tableName: string, columnDefs: IQueryColumnDef[], ...records: Record<string, any>[]): Promise<void> {
    throw new NotImplementError();
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
