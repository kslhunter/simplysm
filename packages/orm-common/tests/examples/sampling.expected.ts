import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

//#region ========== Random Sampling ==========

export const samplingBasic: ExpectedSql = {
  mysql: mysql`
SELECT *
FROM \`TestDb\`.\`User\` AS \`T1\`
ORDER BY RAND()
LIMIT 5
  `,
  mssql: tsql`
SELECT TOP 5 *
FROM [TestDb].[TestSchema].[User] AS [T1]
ORDER BY NEWID()
  `,
  postgresql: pgsql`
SELECT *
FROM "TestSchema"."User" AS "T1"
ORDER BY RANDOM()
LIMIT 5
  `,
};

export const samplingWithWhere: ExpectedSql = {
  mysql: mysql`
SELECT *
FROM \`TestDb\`.\`User\` AS \`T1\`
WHERE \`T1\`.\`age\` >= 20
ORDER BY RAND()
LIMIT 3
  `,
  mssql: tsql`
SELECT TOP 3 *
FROM [TestDb].[TestSchema].[User] AS [T1]
WHERE [T1].[age] >= 20
ORDER BY NEWID()
  `,
  postgresql: pgsql`
SELECT *
FROM "TestSchema"."User" AS "T1"
WHERE "T1"."age" >= 20
ORDER BY RANDOM()
LIMIT 3
  `,
};

export const samplingWithSelect: ExpectedSql = {
  mysql: mysql`
SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`name\` AS \`name\`
FROM \`TestDb\`.\`User\` AS \`T1\`
ORDER BY RAND()
LIMIT 10
  `,
  mssql: tsql`
SELECT TOP 10 [T1].[id] AS [id], [T1].[name] AS [name]
FROM [TestDb].[TestSchema].[User] AS [T1]
ORDER BY NEWID()
  `,
  postgresql: pgsql`
SELECT "T1"."id" AS "id", "T1"."name" AS "name"
FROM "TestSchema"."User" AS "T1"
ORDER BY RANDOM()
LIMIT 10
  `,
};

//#endregion
