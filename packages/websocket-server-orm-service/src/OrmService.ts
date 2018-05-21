import {WebSocketServiceBase} from "@simplism/websocket-server";
import {DateOnly, DateTime, Logger} from "@simplism/core";
import * as tedious from "tedious";

export class OrmService extends WebSocketServiceBase {
  private static readonly _connMap = new Map<number, tedious.Connection>();
  private static _lastConnId = 0;

  private readonly _logger = new Logger("@simplism/websocket-server-orm-service", "OrmService");

  public async connect(configs: { server: string; userName: string; password: string }): Promise<number> {
    const conn = new tedious.Connection({
      server: configs.server,
      userName: configs.userName,
      password: configs.password,
      options: {
        rowCollectionOnDone: true,
        useUTC: false,
        encrypt: false
      }
    });

    conn.on("infoMessage", async info => {
      this._logger.log(info.message);
    });

    conn.on("errorMessage", async error => {
      this._logger.error(error.message);
    });

    conn.on("error", async error => {
      this._logger.error(error.message);
    });

    return await new Promise<number>((resolve, reject) => {
      conn.on("connect", err => {
        if (err) {
          reject(err);
          return;
        }

        const connId = OrmService._lastConnId++;
        OrmService._connMap.set(connId, conn);
        resolve(connId);
      });
    });
  }

  public async close(connId: number): Promise<void> {
    const conn = OrmService._connMap.get(connId);
    if (!conn) throw new Error("디비 커넥션을 찾을 수 없습니다.");

    await new Promise<void>((resolve, reject) => {
      conn.on("end", async err => {
        if (err) {
          reject(err);
          return;
        }

        OrmService._connMap.delete(connId);
        resolve();
      });

      conn.close();
    });
  }

  public async execute(connId: number, query: string): Promise<any[][]> {
    const conn = OrmService._connMap.get(connId);
    if (!conn) throw new Error("디비 커넥션을 찾을 수 없습니다.");

    const results: any[][] = [];
    const queries = query.split("GO;");

    for (const currQuery of queries) {
      this._logger.log("쿼리를 수행합니다.", currQuery);
      await new Promise<void>((resolve, reject) => {
        const queryRequest = new tedious
          .Request(currQuery, err => {
            if (err) reject(err);
          })
          .on("done", (rowCount, more, rows) => {
            const result = rows.map((item: tedious.ColumnValue[]) => {
              const resultItem = {};
              for (const col of item) {
                resultItem[col.metadata.colName] = col.value;
              }
              return resultItem;
            });

            results.push(result);
          })
          .on("error", err => reject(err))
          .on("requestCompleted", () => {
            resolve();
          });

        conn.execSqlBatch(queryRequest);
      });
    }

    return results;
  }

  public async bulkInsert(connId: number,
                          def: {
                            table: string;
                            columns: {
                              name: string;
                              dataType: string;
                              nullable: boolean;
                            }[];
                          },
                          items: any[]): Promise<void> {
    const conn = OrmService._connMap.get(connId);
    if (!conn) throw new Error("디비 커넥션을 찾을 수 없습니다.");

    await new Promise<void>((resolve, reject) => {
      const bulkLoad = conn.newBulkLoad(def.table, async err => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });

      for (const column of def.columns) {
        const tediousType = this._getTediousTypeFromDataType(column.dataType);
        bulkLoad.addColumn(column.name, tediousType.type, {length: tediousType.length, nullable: column.nullable});
      }

      for (const item of Object.clone(items)) {
        for (const key of Object.keys(item)) {
          if (item[key] instanceof DateOnly || item[key] instanceof DateTime) {
            item[key] = item[key]["_date"];
          }
        }
        bulkLoad.addRow(item);
      }

      conn.execBulkLoad(bulkLoad);
    });
  }

  private _getTediousTypeFromDataType(dataType: string): { type: tedious.TediousType; length?: number } {
    if (dataType.startsWith("NVARCHAR")) {
      const lengthMatch = dataType.match(/\(([0-9]*)\)/) || undefined;
      return {type: tedious.TYPES.NVarChar, length: lengthMatch && Number(lengthMatch[1])};
    }
    else if (dataType === "INT") {
      return {type: tedious.TYPES.Int};
    }
    else if (dataType === "BIT") {
      return {type: tedious.TYPES.Bit};
    }
    else if (dataType === "UNIQUEIDENTIFIER") {
      return {type: tedious.TYPES.UniqueIdentifier};
    }
    else if (dataType === "VARBINARY") {
      return {type: tedious.TYPES.VarBinary};
    }
    else if (dataType === "DATE") {
      return {type: tedious.TYPES.Date};
    }
    else if (dataType === "DATETIME") {
      return {type: tedious.TYPES.DateTime};
    }

    throw new TypeError(dataType);
  }
}