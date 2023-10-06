import {IDbConnection, TDbConnectionConfig} from "@simplysm/sd-orm-common";

export class DbConnectionFactory {
  public static async createAsync(config: TDbConnectionConfig): Promise<IDbConnection> {
    if (config.dialect === "sqlite") {
      const sqlite = await import("@simplysm/sd-orm-node-sqlite");
      return new sqlite.SqliteDbConnection(config);
    }
    else if (config.dialect === "mysql") {
      const mysql = await import("@simplysm/sd-orm-node-mysql");
      return new mysql.MysqlDbConnection(config);
    }
    else {
      const mssql = await import("@simplysm/sd-orm-node-mssql");
      return new mssql.MssqlDbConnection(config);
    }
  }
}
