import {SocketServiceBase} from "@simplism/socket-server";
import {IDbConnectionConfig} from "@simplism/orm-common";
import {DbConnection} from "@simplism/orm-connector";
import {DateOnly, DateTime, Logger, Time} from "@simplism/core";
import {IQueryDef} from "@simplism/orm-query";

export class OrmService extends SocketServiceBase {
  private readonly _logger = new Logger("@simplism/orm-service");
  private static readonly _connections = new Map<number, DbConnection>();

  public async connectAsync(config: IDbConnectionConfig): Promise<number> {
    const conn = new DbConnection(config);

    const lastId = Array.from(OrmService._connections.keys()).max() || 0;
    const newId = lastId + 1;
    OrmService._connections.set(newId, conn);

    await conn.connectAsync();

    if (this.server.isConnected) {
      this.server.addCloseListener("orm." + newId, async () => {
        if (conn.isConnected) {
          await conn.closeAsync();
        }
        this.server.removeCloseListener("orm." + newId);
        this._logger.warn("서버가 종료되어, DB 연결이 끊었습니다.");
      });

      this.server.addClientCloseListener(this.clientId, async () => {
        if (conn.isConnected) {
          await conn.closeAsync();
        }
        this._logger.warn("클라이언트와의 연결이 종료되어, DB 연결이 끊었습니다.");
      });
    }
    else {
      await conn.closeAsync();
      this._logger.warn("서버가 종료되어, DB 연결이 끊었습니다.");
    }

    return newId;
  }

  public async closeAsync(connId: number): Promise<void> {
    this.server.removeCloseListener("orm." + connId);

    const conn = OrmService._connections.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await conn.closeAsync();
    OrmService._connections.delete(connId);
  }

  public async beginTransactionAsync(connId: number): Promise<void> {
    const conn = OrmService._connections.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await conn.beginTransactionAsync();
  }

  public async commitTransactionAsync(connId: number): Promise<void> {
    const conn = OrmService._connections.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await conn.commitTransactionAsync();
  }

  public async rollbackTransactionAsync(connId: number): Promise<void> {
    const conn = OrmService._connections.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await conn.rollbackTransactionAsync();
  }

  public async executeAsync(connId: number, queries: (string | IQueryDef)[], colDefs?: { name: string; dataType: string | undefined }[], joinDefs?: { as: string; isSingle: boolean }[]): Promise<any[][]> {
    const conn = OrmService._connections.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    const result = await conn.executeAsync(queries);
    return (colDefs && joinDefs) ? this._generateResult(result[0], colDefs, joinDefs) : result;
  }

  private _generateResult(arr: any[] | undefined, colDefs: { name: string; dataType: string | undefined }[], joinDefs: { as: string; isSingle: boolean }[]): any[] {
    if (!arr) return [];

    let result: any[] = arr;

    for (const item of result) {
      for (const key of Object.keys(item)) {
        const colDef = colDefs.single(item1 => item1.name === key)!;
        if (item[key] && colDef.dataType === "DateTime") {
          item[key] = DateTime.parse(item[key]);
        }
        else if (item[key] && colDef.dataType === "DateOnly") {
          item[key] = DateOnly.parse(item[key]);
        }
        else if (item[key] && colDef.dataType === "Time") {
          item[key] = Time.parse(item[key]);
        }
      }
    }

    for (const joinDef of joinDefs) {
      const grouped: { key: any; values: any[] }[] = [];
      for (const item of result) {
        const keys = Object.keys(item)
          .filter(key => !key.startsWith(joinDef.as + "."));

        const valueKeys = Object.keys(item)
          .filter(valueKey => valueKey.startsWith(joinDef.as + "."))
          .distinct();

        const keyObj = {};
        for (const key of keys) {
          keyObj[key] = item[key];
        }

        const valueObj = {};
        for (const valueKey of valueKeys) {
          valueObj[valueKey.slice(joinDef.as.length + 1)] = item[valueKey];
        }

        const exists = grouped.single(g => Object.equal(g.key, keyObj));
        if (exists) {
          exists.values.push(valueObj);
        }
        else {
          grouped.push({
            key: keyObj,
            values: [valueObj]
          });
        }
      }

      result = grouped.map(item => ({
        ...item.key,
        [joinDef.as]: item.values
      }));

      if (joinDef.isSingle) {
        result = result.map(item => ({
          ...item,
          [joinDef.as]: item[joinDef.as][0]
        }));
      }
    }

    const clearEmpty = (item: any) => {
      if (item instanceof DateTime || item instanceof DateOnly || item instanceof Time) {
        return item;
      }
      if (item instanceof Array) {
        for (let i = 0; i < item.length; i++) {
          item[i] = clearEmpty(item[i]);
        }

        if (item.every(itemItem => itemItem == undefined)) {
          return undefined;
        }
      }
      else if (item instanceof Object) {
        for (const key of Object.keys(item)) {
          item[key] = clearEmpty(item[key]);
        }

        if (Object.keys(item).every(key => item[key] == undefined)) {
          return undefined;
        }
      }

      return item;
    };

    return clearEmpty(result) || [];
  }
}
