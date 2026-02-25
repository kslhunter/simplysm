/**
 * SELECT - GROUP BY / HAVING test expected SQL
 */
import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

//#region ========== GROUP BY ==========

export const groupSingle: ExpectedSql = {
  mysql: mysql`
    SELECT \`T1\`.\`name\` AS \`name\`, COUNT(\`T1\`.\`id\`) AS \`cnt\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
    GROUP BY \`T1\`.\`name\`
  `,
  mssql: tsql`
    SELECT [T1].[name] AS [name], COUNT([T1].[id]) AS [cnt]
    FROM [TestDb].[TestSchema].[User] AS [T1]
    GROUP BY [T1].[name]
  `,
  postgresql: pgsql`
    SELECT "T1"."name" AS "name", COUNT("T1"."id") AS "cnt"
    FROM "TestSchema"."User" AS "T1"
    GROUP BY "T1"."name"
  `,
};

export const groupMultiple: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`name\` AS \`name\`,
      \`T1\`.\`isActive\` AS \`isActive\`,
      COUNT(\`T1\`.\`id\`) AS \`cnt\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
    GROUP BY \`T1\`.\`name\`, \`T1\`.\`isActive\`
  `,
  mssql: tsql`
    SELECT
      [T1].[name] AS [name],
      [T1].[isActive] AS [isActive],
      COUNT([T1].[id]) AS [cnt]
    FROM [TestDb].[TestSchema].[User] AS [T1]
    GROUP BY [T1].[name], [T1].[isActive]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."name" AS "name",
      "T1"."isActive" AS "isActive",
      COUNT("T1"."id") AS "cnt"
    FROM "TestSchema"."User" AS "T1"
    GROUP BY "T1"."name", "T1"."isActive"
  `,
};

export const groupAggregate: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`name\` AS \`name\`,
      COUNT(\`T1\`.\`id\`) AS \`cnt\`,
      SUM(\`T1\`.\`age\`) AS \`sumAge\`,
      AVG(\`T1\`.\`age\`) AS \`avgAge\`,
      MIN(\`T1\`.\`age\`) AS \`minAge\`,
      MAX(\`T1\`.\`age\`) AS \`maxAge\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
    GROUP BY \`T1\`.\`name\`
  `,
  mssql: tsql`
    SELECT
      [T1].[name] AS [name],
      COUNT([T1].[id]) AS [cnt],
      SUM([T1].[age]) AS [sumAge],
      AVG([T1].[age]) AS [avgAge],
      MIN([T1].[age]) AS [minAge],
      MAX([T1].[age]) AS [maxAge]
    FROM [TestDb].[TestSchema].[User] AS [T1]
    GROUP BY [T1].[name]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."name" AS "name",
      COUNT("T1"."id") AS "cnt",
      SUM("T1"."age") AS "sumAge",
      AVG("T1"."age") AS "avgAge",
      MIN("T1"."age") AS "minAge",
      MAX("T1"."age") AS "maxAge"
    FROM "TestSchema"."User" AS "T1"
    GROUP BY "T1"."name"
  `,
};

//#endregion

//#region ========== HAVING ==========

export const havingSingle: ExpectedSql = {
  mysql: mysql`
    SELECT \`T1\`.\`name\` AS \`name\`, COUNT(\`T1\`.\`id\`) AS \`cnt\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
    GROUP BY \`T1\`.\`name\`
    HAVING COUNT(\`T1\`.\`id\`) > 5
  `,
  mssql: tsql`
    SELECT [T1].[name] AS [name], COUNT([T1].[id]) AS [cnt]
    FROM [TestDb].[TestSchema].[User] AS [T1]
    GROUP BY [T1].[name]
    HAVING COUNT([T1].[id]) > 5
  `,
  postgresql: pgsql`
    SELECT "T1"."name" AS "name", COUNT("T1"."id") AS "cnt"
    FROM "TestSchema"."User" AS "T1"
    GROUP BY "T1"."name"
    HAVING COUNT("T1"."id") > 5
  `,
};

export const havingMultiple: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`name\` AS \`name\`,
      COUNT(\`T1\`.\`id\`) AS \`cnt\`,
      AVG(\`T1\`.\`age\`) AS \`avgAge\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
    GROUP BY \`T1\`.\`name\`
    HAVING COUNT(\`T1\`.\`id\`) > 5 AND AVG(\`T1\`.\`age\`) >= 25
  `,
  mssql: tsql`
    SELECT
      [T1].[name] AS [name],
      COUNT([T1].[id]) AS [cnt],
      AVG([T1].[age]) AS [avgAge]
    FROM [TestDb].[TestSchema].[User] AS [T1]
    GROUP BY [T1].[name]
    HAVING COUNT([T1].[id]) > 5 AND AVG([T1].[age]) >= 25
  `,
  postgresql: pgsql`
    SELECT
      "T1"."name" AS "name",
      COUNT("T1"."id") AS "cnt",
      AVG("T1"."age") AS "avgAge"
    FROM "TestSchema"."User" AS "T1"
    GROUP BY "T1"."name"
    HAVING COUNT("T1"."id") > 5 AND AVG("T1"."age") >= 25
  `,
};

export const havingOrderCombo: ExpectedSql = {
  mysql: mysql`
    SELECT \`T1\`.\`name\` AS \`name\`, COUNT(\`T1\`.\`id\`) AS \`cnt\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
    GROUP BY \`T1\`.\`name\`
    HAVING COUNT(\`T1\`.\`id\`) > 1
    ORDER BY COUNT(\`T1\`.\`id\`) DESC
  `,
  mssql: tsql`
    SELECT [T1].[name] AS [name], COUNT([T1].[id]) AS [cnt]
    FROM [TestDb].[TestSchema].[User] AS [T1]
    GROUP BY [T1].[name]
    HAVING COUNT([T1].[id]) > 1
    ORDER BY COUNT([T1].[id]) DESC
  `,
  postgresql: pgsql`
    SELECT "T1"."name" AS "name", COUNT("T1"."id") AS "cnt"
    FROM "TestSchema"."User" AS "T1"
    GROUP BY "T1"."name"
    HAVING COUNT("T1"."id") > 1
    ORDER BY COUNT("T1"."id") DESC
  `,
};

//#endregion
