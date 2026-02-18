import type {
  MysqlDbConnConfig,
  MssqlDbConnConfig,
  PostgresqlDbConnConfig,
} from "@simplysm/orm-node";

/**
 * 테스트용 MySQL 연결 설정
 * docker-compose.test.yml 참조
 */
export const mysqlConfig: MysqlDbConnConfig = {
  dialect: "mysql",
  host: "localhost",
  port: 23306,
  username: "root",
  password: "test",
  database: "TestDb",
};

/**
 * 테스트용 PostgreSQL 연결 설정
 * docker-compose.test.yml 참조
 */
export const postgresqlConfig: PostgresqlDbConnConfig = {
  dialect: "postgresql",
  host: "localhost",
  port: 25432,
  username: "test",
  password: "test",
  database: "TestDb",
};

/**
 * 테스트용 MSSQL 연결 설정
 * docker-compose.test.yml 참조
 */
export const mssqlConfig: MssqlDbConnConfig = {
  dialect: "mssql",
  host: "localhost",
  port: 21433,
  username: "sa",
  password: "YourStrong@Passw0rd",
  database: "TestDb",
};
