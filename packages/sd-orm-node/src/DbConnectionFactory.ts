import { MysqlDbConnection } from "./MysqlDbConnection";
import { MssqlDbConnection } from "./MssqlDbConnection";
import { IDbConnection } from "./IDbConnection";
import { TDbConnectionConfig } from "@simplysm/sd-orm-common";
import { SqliteDbConnection } from "./SqliteDbConnection";

export class DbConnectionFactory {
  public static create(config: TDbConnectionConfig): IDbConnection {
    return config.dialect === "sqlite" ? new SqliteDbConnection(config)
      : config.dialect === "mysql" ? new MysqlDbConnection(config)
        : config.dialect === "mssql-azure" ? new MssqlDbConnection(config)
          : new MssqlDbConnection(config);
  }
}
