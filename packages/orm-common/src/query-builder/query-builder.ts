import type { Dialect } from "../types/db";
import type { QueryBuilderBase } from "./base/query-builder-base";
import { MssqlQueryBuilder } from "./mssql/mssql-query-builder";
import { MysqlQueryBuilder } from "./mysql/mysql-query-builder";
import { PostgresqlQueryBuilder } from "./postgresql/postgresql-query-builder";

/**
 * Dialect에 맞는 QueryBuilder instance Generate
 */
export function createQueryBuilder(dialect: Dialect): QueryBuilderBase {
  switch (dialect) {
    case "mysql":
      return new MysqlQueryBuilder();
    case "mssql":
      return new MssqlQueryBuilder();
    case "postgresql":
      return new PostgresqlQueryBuilder();
  }
}
