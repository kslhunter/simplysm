import { IDbConn, TDbConnConf } from "@simplysm/sd-orm-common";
import { SqliteDbConn } from "./connections/SqliteDbConn";
import { MysqlDbConn } from "./connections/MysqlDbConn";
import { MssqlDbConn } from "./connections/MssqlDbConn";

export class DbConnFactory {
  static create(config: TDbConnConf): IDbConn {
    if (config.dialect === "sqlite") {
      return new SqliteDbConn(config);
    } else if (config.dialect === "mysql") {
      return new MysqlDbConn(config);
    } else {
      return new MssqlDbConn(config);
    }
  }
}
