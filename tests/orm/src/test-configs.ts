import type {
  MysqlDbConnConfig,
  MssqlDbConnConfig,
  PostgresqlDbConnConfig,
} from "@simplysm/orm-node";

/**
 * MySQL connection configuration for testing
 * See docker-compose.test.yml
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
 * PostgreSQL connection configuration for testing
 * See docker-compose.test.yml
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
 * MSSQL connection configuration for testing
 * See docker-compose.test.yml
 */
export const mssqlConfig: MssqlDbConnConfig = {
  dialect: "mssql",
  host: "localhost",
  port: 21433,
  username: "sa",
  password: "YourStrong@Passw0rd",
  database: "TestDb",
};
