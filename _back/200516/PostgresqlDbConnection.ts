import {IDbConnectionConfig} from "./commons";
import {Logger} from "@simplysm/sd-core-node";
import * as pg from "pg";
import {EventEmitter} from "events";
import {SdError} from "@simplysm/sd-core-common";
import {IDbConnection} from "./IDbConnection";

export class PostgresqlDbConnection extends EventEmitter implements IDbConnection {
  private readonly _logger = Logger.get(["simplysm", "sd-orm-node", "PostgresqlDbConnection"]);

  private readonly _timeout = 300000;

  private _conn?: pg.Client;
  private _connTimeout?: NodeJS.Timeout;

  public isConnected = false;
  public isOnTransaction = false;

  public constructor(public readonly config: IDbConnectionConfig) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async connectAsync(): Promise<void> {
    if (this.isConnected) {
      throw new Error("이미 'Connection'이 연결되어있습니다.");
    }

    const conn = new pg.Client({
      host: this.config.host ?? "localhost",
      port: this.config.port,
      user: this.config.username,
      password: this.config.password
    });

    conn.on("error", error => {
      this._logger.error(error.message);
    });

    conn.on("end", () => {
      this.emit("close");
      this.isConnected = false;
      this.isOnTransaction = false;
      delete this._conn;
    });

    await conn.connect();

    this._startTimeout();
    this.isConnected = true;
    this.isOnTransaction = false;

    this._conn = conn;
  }

  public async closeAsync(): Promise<void> {
    this._stopTimeout();

    if (!this._conn || !this.isConnected) {
      return;
    }

    await this._conn.end();

    this.emit("close");
    this.isConnected = false;
    this.isOnTransaction = false;
    delete this._conn;
  }

  public async beginTransactionAsync(): Promise<void> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    const conn = this._conn;

    await conn.query("BEGIN");
    this.isOnTransaction = true;
  }

  public async commitTransactionAsync(): Promise<void> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    const conn = this._conn;

    await conn.query("COMMIT");
    this.isOnTransaction = false;
  }

  public async rollbackTransactionAsync(): Promise<void> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    const conn = this._conn;

    await conn.query("ROLLBACK");
    this.isOnTransaction = false;
  }

  public async executeAsync(queries: string[]): Promise<any[][]> {
    if (!this._conn || !this.isConnected) {
      throw new Error("'Connection'이 연결되어있지 않습니다.");
    }
    this._startTimeout();

    const conn = this._conn;

    const results: any[][] = [];
    for (const query of queries.filter((item: any) => Boolean(item))) {
      const queryStrings = query.split("GO");

      const resultItems: any[] = [];
      for (const queryString of queryStrings) {
        this._logger.debug("쿼리 실행:\n" + queryString);

        try {
          this._startTimeout();
          resultItems.push(...(await conn.query(queryString)).rows);
          this._stopTimeout();
        }
        catch (err) {
          this._stopTimeout();
          throw new SdError(err, "쿼리 수행중 오류발생\n-- query\n" + queryString.trim() + "\n--");
        }
      }

      results.push(resultItems);
    }

    return results;
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
