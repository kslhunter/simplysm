import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

//#region ========== Procedure Execution ==========

export const execProcNoParams: ExpectedSql = {
  mysql: mysql`CALL \`TestDb\`.\`GetUserById\`()`,
  mssql: tsql`EXEC [TestDb].[TestSchema].[GetUserById]`,
  postgresql: pgsql`SELECT "TestSchema"."GetUserById"()`,
};

export const execProcWithParams: ExpectedSql = {
  mysql: mysql`CALL \`TestDb\`.\`GetUserById\`(123)`,
  mssql: tsql`EXEC [TestDb].[TestSchema].[GetUserById] 123`,
  postgresql: pgsql`SELECT "TestSchema"."GetUserById"(123)`,
};

//#endregion
