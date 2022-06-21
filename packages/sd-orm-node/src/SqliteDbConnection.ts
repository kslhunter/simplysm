import { EventEmitter } from "events";
import { IDbConnection } from "./IDbConnection";
import { SdError, StringUtil } from "@simplysm/sd-core-common";
import { IQueryColumnDef, ISOLATION_LEVEL, ISqliteDbConnectionConfig, QueryHelper } from "@simplysm/sd-orm-common";
import { Logger } from "@simplysm/sd-core-node";
import sqlite3 from "sqlite3";

export class SqliteDbConnection extends EventEmitter implements IDbConnection {
  private readonly _logger = Logger.get(["simplysm", "sd-orm-node", this.constructor.name]);

  private readonly _timeout = 300000;

  private _conn?: sqlite3.Database;
  private _connTimeout?: NodeJS.Timeout;

  public isConnected = false;
  public isOnTransaction = false;

  public constructor(public readonly config: ISqliteDbConnectionConfig) {
    super();
  }

  public async connectAsync(): Promise<void> {
    if (this.isConnected) {
      throw new Error("이미 'Connection'이 연결되어있습니다.");
    }

    const conn = new sqlite3.Database(this.config.filePath);

    conn.on("close", () => {
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

  public async closeAsync(): Promise<void> {
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
        delete this._conn;
        resolve();
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void> {
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

  // eslint-disable-next-line @typescript-eslint/require-await
  public async commitTransactionAsync(): Promise<void> {
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

  // eslint-disable-next-line @typescript-eslint/require-await
  public async rollbackTransactionAsync(): Promise<void> {
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

  public async executeAsync(queries: string[]): Promise<any[][]> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    const conn = this._conn;

    const results: any[][] = [];
    for (const query of queries.filter((item) => !StringUtil.isNullOrEmpty(item))) {
      // const queryStrings = query.split(/;\r?\n/g);
      const queryStrings = [query];

      const resultItems: any[] = [];
      for (const queryString of queryStrings) {
        this._logger.debug("쿼리 실행:\n" + queryString);
        await new Promise<void>((resolve, reject) => {
          conn.all(queryString, (err, queryResults) => {
            this._startTimeout();

            if (err) {
              reject(new SdError(err, "쿼리 수행중 오류발생\n-- query\n" + queryString.trim() + "\n--"));
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

  public async bulkInsertAsync(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void> {
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
