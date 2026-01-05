import type { TDialect } from "@simplysm/orm-common";

// ============================================
// ISOLATION_LEVEL
// ============================================

export type ISOLATION_LEVEL =
  | "READ_UNCOMMITTED"
  | "READ_COMMITTED"
  | "REPEATABLE_READ"
  | "SERIALIZABLE";

// ============================================
// DB 연결 설정
// ============================================

export type TDbConnConf = IMysqlDbConnConf | IMssqlDbConnConf | IPostgresqlDbConnConf;

export interface IBaseDbConnConf {
  dialect: TDialect;
  host: string;
  port?: number;
  username: string;
  password: string;
  database: string;
  schema?: string;
  defaultIsolationLevel?: ISOLATION_LEVEL;
}

export interface IMysqlDbConnConf extends IBaseDbConnConf {
  dialect: "mysql";
}

export interface IMssqlDbConnConf extends IBaseDbConnConf {
  dialect: "mssql";
}

export interface IPostgresqlDbConnConf extends IBaseDbConnConf {
  dialect: "postgresql";
}
