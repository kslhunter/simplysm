import { createDbConn, type DbConnConfig, type DbConn } from "@simplysm/orm-node";
import {
  type ColumnMeta,
  createQueryBuilder,
  type Dialect,
  type IsolationLevel,
  parseQueryResult,
  type QueryDef,
  type ResultMeta,
} from "@simplysm/orm-common";
import { defineService, auth, type ServiceMethods } from "../core/define-service";
import type { DbConnOptions } from "@simplysm/service-common";
import type { ServiceSocket } from "../transport/socket/service-socket";
import consola from "consola";

const logger = consola.withTag("service-server:OrmService");

// Static state needs to live outside the factory (shared across calls)
const socketConns = new WeakMap<ServiceSocket, Map<number, DbConn>>();

export const OrmService = defineService(
  "Orm",
  auth((ctx) => {
    const sock = (): ServiceSocket => {
      const socket = ctx.socket;
      if (socket == null) {
        throw new Error("WebSocket 연결이 필요합니다. HTTP로는 ORM 서비스를 사용할 수 없습니다.");
      }
      return socket;
    };

    const getConf = async (opt: DbConnOptions & { configName: string }): Promise<DbConnConfig> => {
      const config = (await ctx.getConfig<Record<string, DbConnConfig | undefined>>("orm"))[
        opt.configName
      ];
      if (config == null) {
        throw new Error(`ORM 설정을 찾을 수 없습니다: ${opt.configName}`);
      }
      return { ...config, ...opt.config } as DbConnConfig;
    };

    const getConn = (connId: number): DbConn => {
      const myConns = socketConns.get(sock());
      const conn = myConns?.get(connId);
      if (conn == null) {
        throw new Error("DB에 연결되어있지 않습니다. (Invalid Connection ID)");
      }
      return conn;
    };

    return {
      async getInfo(opt: DbConnOptions & { configName: string }): Promise<{
        dialect: Dialect;
        database?: string;
        schema?: string;
      }> {
        const config = await getConf(opt);
        return {
          dialect: config.dialect === "mssql-azure" ? "mssql" : config.dialect,
          database: config.database,
          schema: "schema" in config ? config.schema : undefined,
        };
      },

      async connect(opt: DbConnOptions & { configName: string }): Promise<number> {
        let myConns = socketConns.get(sock());
        if (myConns == null) {
          myConns = new Map<number, DbConn>();
          socketConns.set(sock(), myConns);

          sock().on("close", async () => {
            if (myConns == null) return;

            logger.debug("소켓 연결 종료 감지: 열려있는 모든 DB 연결을 정리합니다.");
            const conns = Array.from(myConns.values());

            await Promise.all(
              conns.map(async (conn) => {
                try {
                  if (conn.isConnected) {
                    await conn.close();
                  }
                } catch (err) {
                  logger.warn("DB 연결 강제 종료 중 오류 무시됨", err);
                }
              }),
            );

            myConns.clear();
          });
        }

        const config = await getConf(opt);
        const dbConn = await createDbConn(config);
        await dbConn.connect();

        const lastConnId = Math.max(0, ...Array.from(myConns.keys()));
        const connId = lastConnId + 1;
        myConns.set(connId, dbConn);

        dbConn.on("close", () => {
          myConns.delete(connId);
        });

        return connId;
      },

      async close(connId: number): Promise<void> {
        try {
          const conn = getConn(connId);
          await conn.close();
        } catch (err) {
          logger.warn("DB 연결 종료 중 오류 무시됨", err);
        }
      },

      async beginTransaction(connId: number, isolationLevel?: IsolationLevel): Promise<void> {
        const conn = getConn(connId);
        await conn.beginTransaction(isolationLevel);
      },

      async commitTransaction(connId: number): Promise<void> {
        const conn = getConn(connId);
        await conn.commitTransaction();
      },

      async rollbackTransaction(connId: number): Promise<void> {
        const conn = getConn(connId);
        await conn.rollbackTransaction();
      },

      async executeParametrized(
        connId: number,
        query: string,
        params?: unknown[],
      ): Promise<unknown[][]> {
        const conn = getConn(connId);
        return conn.executeParametrized(query, params);
      },

      async executeDefs(
        connId: number,
        defs: QueryDef[],
        options?: (ResultMeta | undefined)[],
      ): Promise<unknown[][]> {
        const conn = getConn(connId);
        const dialect: Dialect =
          conn.config.dialect === "mssql-azure" ? "mssql" : conn.config.dialect;
        const queryBuilder = createQueryBuilder(dialect);

        if (options != null && options.every((item) => item == null)) {
          return conn.execute([defs.map((def) => queryBuilder.build(def).sql).join("\n")]);
        }

        const queries = defs.map((def) => queryBuilder.build(def).sql);
        const result = await conn.execute(queries);

        const parsed: unknown[][] = [];
        for (let i = 0; i < result.length; i++) {
          const opt = options?.[i];
          if (opt != null) {
            const parsedResult = await parseQueryResult(
              result[i] as Record<string, unknown>[],
              opt,
            );
            parsed.push(parsedResult ?? []);
          } else {
            parsed.push(result[i]);
          }
        }
        return parsed;
      },

      async bulkInsert(
        connId: number,
        tableName: string,
        columnDefs: Record<string, ColumnMeta>,
        records: Record<string, unknown>[],
      ): Promise<void> {
        const conn = getConn(connId);
        await conn.bulkInsert(tableName, columnDefs, records);
      },
    };
  }),
);

export type OrmServiceType = ServiceMethods<typeof OrmService>;
