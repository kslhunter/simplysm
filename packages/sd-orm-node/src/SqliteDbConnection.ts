import { Logger } from "@simplysm/sd-core-node";
import * as sqlite3 from "sqlite3";
import { EventEmitter } from "events";
import { NotImplementError, SdError, StringUtil } from "@simplysm/sd-core-common";
import { IDbConnection } from "./IDbConnection";
import { IDbConnectionConfig, IQueryColumnDef, ISOLATION_LEVEL } from "@simplysm/sd-orm-common";

export class SqliteDbConnection extends EventEmitter implements IDbConnection {
  private readonly _logger = Logger.get(["simplysm", "sd-orm-node", this.constructor.name]);

  private readonly _timeout = 3 * 60 * 1000;

  private _conn?: sqlite3.Database;
  private _connTimeout?: NodeJS.Timeout;

  public isConnected = false;
  public isOnTransaction = false;

  public constructor(public readonly config: IDbConnectionConfig) {
    super();
  }

  public async connectAsync(): Promise<void> {
    if (this.isConnected) {
      throw new Error("이미 'Connection'이 연결되어있습니다.");
    }

    const conn = await new Promise<sqlite3.Database>((resolve, reject) => {
      const db = new sqlite3.Database(this.config.host);
      db.on("open", () => {
        this._startTimeout();
        this.isConnected = true;
        this.isOnTransaction = false;
        resolve(db);
      });
      db.on("error", (err) => {
        reject(err);
      });
    });

    conn.on("close", () => {
      this.emit("close");
      this.isConnected = false;
      this.isOnTransaction = false;
      delete this._conn;
    });

    this._conn = conn;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async closeAsync(): Promise<void> {
    this._stopTimeout();

    if (!this._conn || !this.isConnected) {
      return;
    }

    this._conn.close();

    this.emit("close");
    this.isConnected = false;
    this.isOnTransaction = false;
    delete this._conn;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async beginTransactionAsync(isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    if (!this._conn || !this.isConnected) {
      throw new Error(`'Connection'이 연결되어있지 않습니다.`);
    }
    this._startTimeout();

    this._conn.run("BEGIN;");
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async commitTransactionAsync(): Promise<void> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    this._conn.run("COMMIT;");
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async rollbackTransactionAsync(): Promise<void> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    this._conn.run("ROLLBACK;");
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
        this._logger.debug("쿼리 실행:\n" + queryString);
        await new Promise<void>((resolve, reject) => {
          conn.all(queryString, (err: Error | null, rows: any[]) => {
            this._startTimeout();

            if (err) {
              reject(new SdError(err, "쿼리 수행중 오류발생\n-- query\n" + queryString + "\n--"));
              return;
            }

            resultItems.push(...rows);
            resolve();
          });
        });
      }

      results.push(resultItems);
    }

    return results;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async bulkInsertAsync(tableName: string, columnDefs: IQueryColumnDef[], records: Record<string, any>[]): Promise<void> {
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
