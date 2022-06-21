import { IDbConnection, TDbConnectionConfig } from "@simplysm/sd-orm-common";
import { Type } from "@simplysm/sd-core-common";

let SqliteDbConnection: Type<IDbConnection>;
try {
  SqliteDbConnection = require("@simplysm/sd-orm-node-sqlite").SqliteDbConnection;
}
catch (e) {
}

let MysqlDbConnection: Type<IDbConnection>;
try {
  MysqlDbConnection = require("@simplysm/sd-orm-node-mysql").MysqlDbConnection;
}
catch (e) {
}

let MssqlDbConnection: Type<IDbConnection>;
try {
  MssqlDbConnection = require("@simplysm/sd-orm-node-mssql").MssqlDbConnection;
}
catch (e) {
}

export class DbConnectionFactory {
  public static create(config: TDbConnectionConfig): IDbConnection {
    return config.dialect === "sqlite" ? new SqliteDbConnection(config)
      : config.dialect === "mysql" ? new MysqlDbConnection(config)
        : config.dialect === "mssql-azure" ? new MssqlDbConnection(config)
          : new MssqlDbConnection(config);
  }
}
