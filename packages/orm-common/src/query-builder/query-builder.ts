import type { Dialect } from "../types/db";
import type { QueryBuilderBase } from "./base/QueryBuilderBase";
import { MssqlQueryBuilder } from "./mssql/MssqlQueryBuilder";
import { MysqlQueryBuilder } from "./mysql/MysqlQueryBuilder";
import { PostgresqlQueryBuilder } from "./postgresql/PostgresqlQueryBuilder";

/**
 * Dialect에 맞는 QueryBuilder 인스턴스 생성
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
