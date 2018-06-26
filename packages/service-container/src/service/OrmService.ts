import {SocketServiceBase} from "@simplism/socket-server";
import {IDbConnectionConfig} from "@simplism/orm-common";
import {DbConnection} from "@simplism/orm-connector";

export class OrmService extends SocketServiceBase {
  private static readonly _connections = new Map<number, DbConnection>();

  public async connectAsync(config: IDbConnectionConfig): Promise<number> {
    const conn = new DbConnection(config);

    const lastId = Array.from(OrmService._connections.keys()).max() || 0;
    const newId = lastId + 1;
    OrmService._connections.set(newId, conn);

    await conn.connectAsync();

    return newId;
  }

  public async closeAsync(connId: number): Promise<void> {
    const conn = OrmService._connections.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    await conn.closeAsync();
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

  public async executeAsync(connId: number, query: string): Promise<any[][]> {
    const conn = OrmService._connections.get(connId);
    if (!conn) {
      throw new Error("DB에 연결되어있지 않습니다.");
    }

    return await conn.executeAsync(query);
  }
}