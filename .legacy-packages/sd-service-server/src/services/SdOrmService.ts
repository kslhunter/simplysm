import { DbConnFactory } from "@simplysm/sd-orm-node";
import {
  type IDbConn,
  type IQueryColumnDef,
  type IQueryResultParseOption,
  type ISOLATION_LEVEL,
  QueryBuilder,
  SdOrmUtils,
  type TDbConnConf,
  type TDbContextOption,
  type TQueryDef,
} from "@simplysm/sd-orm-common";
import { SdLogger } from "@simplysm/sd-core-node";
import { SdServiceBase } from "../core/SdServiceBase";
import type { ISdOrmService, TDbConnOptions } from "@simplysm/sd-service-common";
import { SdServiceSocketV1 } from "../legacy/SdServiceSocketV1";
import { SdServiceSocket } from "../transport/socket/SdServiceSocket";
import { Authorize } from "../auth/auth.decorators";

@Authorize()
export class SdOrmService extends SdServiceBase implements ISdOrmService {
  private readonly _logger = SdLogger.get(["simplysm", "sd-service-server", this.constructor.name]);

  private static readonly _socketConns = new WeakMap<
    SdServiceSocketV1 | SdServiceSocket,
    Map<number, IDbConn>
  >();

  private async _getConf(opt: TDbConnOptions & { configName: string }): Promise<TDbConnConf> {
    const config = (await this.getConfigAsync<Record<string, TDbConnConf | undefined>>("orm"))[
      opt.configName
    ];
    if (config == null) {
      throw new Error(`ORM 설정을 찾을 수 없습니다: ${opt.configName}`);
    }
    return { ...config, ...opt.config };
  }

  get sock(): SdServiceSocketV1 | SdServiceSocket {
    const socket = this.socket ?? this.v1?.socket;
    if (!socket) throw new Error("소켓 연결 필요");
    return socket;
  }

  private _getConn(connId: number): IDbConn {
    const myConns = SdOrmService._socketConns.get(this.sock);
    const conn = myConns?.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다. (Invalid Connection ID)");
    }

    return conn;
  }

  async getInfo(opt: TDbConnOptions & { configName: string }): Promise<{
    dialect: TDbContextOption["dialect"];
    database?: string;
    schema?: string;
  }> {
    const config = await this._getConf(opt);
    return {
      dialect: config.dialect,
      ...(config.dialect === "sqlite"
        ? {}
        : {
            database: config.database,
            schema: config.schema,
          }),
    };
  }

  async connect(opt: TDbConnOptions & { configName: string }): Promise<number> {
    // 1. 현재 소켓에 매핑된 DB 연결 목록 가져오기 (없으면 생성)
    let myConns = SdOrmService._socketConns.get(this.sock);
    if (!myConns) {
      myConns = new Map<number, IDbConn>();
      SdOrmService._socketConns.set(this.sock, myConns);

      // [수정] 소켓당 '단 한 번'만 close 리스너를 등록합니다.
      // 소켓이 끊어지면, 해당 소켓이 가진 모든 DB 연결을 일괄 종료(반납)합니다.
      this.sock.on("close", async () => {
        if (!myConns) return;

        this._logger.debug("소켓 연결 종료 감지: 열려있는 모든 DB 연결을 정리합니다.");
        const conns = Array.from(myConns.values());

        // 병렬로 빠르게 닫기
        await Promise.all(
          conns.map(async (conn) => {
            try {
              if (conn.isConnected) {
                await conn.closeAsync();
              }
            } catch (err) {
              this._logger.warn("DB 연결 강제 종료 중 오류 무시됨", err);
            }
          }),
        );

        myConns.clear();
      });
    }

    // 2. 연결 생성 (이제 내부적으로 Pool에서 가져옴)
    const config = await this._getConf(opt);
    const dbConn = await DbConnFactory.createAsync(config);
    await dbConn.connectAsync();

    // 3. ID 발급 및 목록에 저장
    const lastConnId = Array.from(myConns.keys()).max() ?? 0;
    const connId = lastConnId + 1;
    myConns.set(connId, dbConn);

    // 4. 개별 연결이 (로직에 의해) 닫혔을 때, 목록에서만 제거
    // (소켓 리스너는 제거하지 않음 - 다른 연결이 있을 수 있으므로)
    dbConn.on("close", () => {
      myConns.delete(connId);
    });

    return connId;
  }

  async close(connId: number): Promise<void> {
    try {
      const conn = this._getConn(connId);
      await conn.closeAsync();
    } catch (err) {
      this._logger.warn("DB 연결 종료 중 오류 무시됨", err);
    }
  }

  async beginTransaction(connId: number, isolationLevel?: ISOLATION_LEVEL): Promise<void> {
    const conn = this._getConn(connId);
    await conn.beginTransactionAsync(isolationLevel);
  }

  async commitTransaction(connId: number): Promise<void> {
    const conn = this._getConn(connId);
    await conn.commitTransactionAsync();
  }

  async rollbackTransaction(connId: number): Promise<void> {
    const conn = this._getConn(connId);
    await conn.rollbackTransactionAsync();
  }

  /*async execute(connId: number, queries: string[]): Promise<any[][]> {
    const conn = this.#getConn(connId);
    return await conn.executeAsync(queries);
  }*/

  async executeParametrized(connId: number, query: string, params?: any[]): Promise<any[][]> {
    const conn = this._getConn(connId);
    return await conn.executeParametrizedAsync(query, params);
  }

  async executeDefs(
    connId: number,
    defs: TQueryDef[],
    options?: (IQueryResultParseOption | undefined)[],
  ): Promise<any[][]> {
    const conn = this._getConn(connId);

    // 가져올데이터가 없는것으로 옵션 설정을 했을때, 하나의 쿼리로 한번의 요청보냄
    if (options && options.every((item) => item == null)) {
      return await conn.executeAsync([
        defs.map((def) => new QueryBuilder(conn.config.dialect).query(def)).join("\n"),
      ]);
    } else {
      const queries = defs.mapMany((def) => {
        const query = new QueryBuilder(conn.config.dialect).query(def);
        return Array.isArray(query) ? query : [query];
      });
      const result = await conn.executeAsync(queries);

      // parseQueryResultAsync를 사용하여 주기적으로 이벤트 루프에 양보
      const parsed: any[][] = [];
      for (let i = 0; i < result.length; i++) {
        parsed.push(
          await SdOrmUtils.parseQueryResultAsync(result[i], options ? options[i] : undefined),
        );
      }
      return parsed;
    }
  }

  async bulkInsert(
    connId: number,
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    const conn = this._getConn(connId);
    await conn.bulkInsertAsync(tableName, columnDefs, records);
  }

  async bulkUpsert(
    connId: number,
    tableName: string,
    columnDefs: IQueryColumnDef[],
    records: Record<string, any>[],
  ): Promise<void> {
    const conn = this._getConn(connId);
    await conn.bulkUpsertAsync(tableName, columnDefs, records);
  }
}
