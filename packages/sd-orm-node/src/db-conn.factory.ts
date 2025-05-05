import {IDbConn, TDbConnConf} from "@simplysm/sd-orm-common";

export class DbConnFactory {
  static async createAsync(config: TDbConnConf): Promise<IDbConn> {
    if (config.dialect === "sqlite") {
      const sqlite = await import("@simplysm/sd-orm-node-sqlite");
      return new sqlite.SqliteDbConn(config);
    }
    else if (config.dialect === "mysql") {
      const mysql = await import("@simplysm/sd-orm-node-mysql");
      return new mysql.MysqlDbConn(config);
    }
    else {
      const mssql = await import("@simplysm/sd-orm-node-mssql");
      return new mssql.MssqlDbConn(config);
    }
  }
}
