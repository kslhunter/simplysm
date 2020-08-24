import { IDbConnectionConfig } from "./commons";
import { MysqlDbConnection } from "./MysqlDbConnection";
import { MssqlDbConnection } from "./MssqlDbConnection";
import { IDbConnection } from "./IDbConnection";

export class DbConnectionFactory {
  public static create(config: IDbConnectionConfig): IDbConnection {
    return config.dialect === "mysql" ?
      new MysqlDbConnection(config) :
      new MssqlDbConnection(config);
  }
}