import { MysqlDbConnection } from "./MysqlDbConnection";
import { MssqlDbConnection } from "./MssqlDbConnection";
import { IDbConnection } from "./IDbConnection";
import { IDbConnectionConfig } from "@simplysm/sd-orm-common";

export class DbConnectionFactory {
  public static create(config: IDbConnectionConfig, database: string): IDbConnection {
    return config.dialect === "mysql"
      ? new MysqlDbConnection(config, database)
      : config.dialect === "mssql-azure"
        ? new MssqlDbConnection(config, database)
        : new MssqlDbConnection(config, database);
  }
}
