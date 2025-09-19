import { IDbConn, TDbConnConf } from "@simplysm/sd-orm-common";

export class DbConnFactory {
  static async createAsync(config: TDbConnConf): Promise<IDbConn> {
    if (config.dialect === "sqlite") {
      const { SqliteDbConn } = await import("./connections/SqliteDbConn");
      return new SqliteDbConn(config);
    } else if (config.dialect === "mysql") {
      const { MysqlDbConn } = await import("./connections/MysqlDbConn");
      return new MysqlDbConn(config);
    } else {
      const { MssqlDbConn } = await import("./connections/MssqlDbConn");
      return new MssqlDbConn(config);
    }
  }
}
