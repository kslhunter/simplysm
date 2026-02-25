import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

//#region ========== UNPIVOT - Basic ==========

export const unpivotBasic: ExpectedSql = {
  mysql: mysql`
SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`category\` AS \`category\`,
  \`T1.unpvt\`.\`month\` AS \`month\`, \`T1.unpvt\`.\`amount\` AS \`amount\`
FROM \`TestDb\`.\`MonthlySales\` AS \`T1\`
LEFT OUTER JOIN LATERAL (
  SELECT 'jan' AS \`month\`, \`T1\`.\`jan\` AS \`amount\`
  UNION ALL
  SELECT 'feb' AS \`month\`, \`T1\`.\`feb\` AS \`amount\`
  UNION ALL
  SELECT 'mar' AS \`month\`, \`T1\`.\`mar\` AS \`amount\`
) AS \`T1.unpvt\` ON TRUE
  `,
  mssql: tsql`
SELECT [T1].[id] AS [id], [T1].[category] AS [category],
  [T1.unpvt].[month] AS [month], [T1.unpvt].[amount] AS [amount]
FROM [TestDb].[TestSchema].[MonthlySales] AS [T1]
OUTER APPLY (
  SELECT N'jan' AS [month], [T1].[jan] AS [amount]
  UNION ALL
  SELECT N'feb' AS [month], [T1].[feb] AS [amount]
  UNION ALL
  SELECT N'mar' AS [month], [T1].[mar] AS [amount]
) AS [T1.unpvt]
  `,
  postgresql: pgsql`
SELECT "T1"."id" AS "id", "T1"."category" AS "category",
  "T1.unpvt"."month" AS "month", "T1.unpvt"."amount" AS "amount"
FROM "TestSchema"."MonthlySales" AS "T1"
LEFT OUTER JOIN LATERAL (
  SELECT 'jan' AS "month", "T1"."jan" AS "amount"
  UNION ALL
  SELECT 'feb' AS "month", "T1"."feb" AS "amount"
  UNION ALL
  SELECT 'mar' AS "month", "T1"."mar" AS "amount"
) AS "T1.unpvt" ON TRUE
  `,
};

export const unpivotTwoColumns: ExpectedSql = {
  mysql: mysql`
SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`category\` AS \`category\`, \`T1\`.\`mar\` AS \`mar\`,
  \`T1.unpvt\`.\`period\` AS \`period\`, \`T1.unpvt\`.\`value\` AS \`value\`
FROM \`TestDb\`.\`MonthlySales\` AS \`T1\`
LEFT OUTER JOIN LATERAL (
  SELECT 'jan' AS \`period\`, \`T1\`.\`jan\` AS \`value\`
  UNION ALL
  SELECT 'feb' AS \`period\`, \`T1\`.\`feb\` AS \`value\`
) AS \`T1.unpvt\` ON TRUE
  `,
  mssql: tsql`
SELECT [T1].[id] AS [id], [T1].[category] AS [category], [T1].[mar] AS [mar],
  [T1.unpvt].[period] AS [period], [T1.unpvt].[value] AS [value]
FROM [TestDb].[TestSchema].[MonthlySales] AS [T1]
OUTER APPLY (
  SELECT N'jan' AS [period], [T1].[jan] AS [value]
  UNION ALL
  SELECT N'feb' AS [period], [T1].[feb] AS [value]
) AS [T1.unpvt]
  `,
  postgresql: pgsql`
SELECT "T1"."id" AS "id", "T1"."category" AS "category", "T1"."mar" AS "mar",
  "T1.unpvt"."period" AS "period", "T1.unpvt"."value" AS "value"
FROM "TestSchema"."MonthlySales" AS "T1"
LEFT OUTER JOIN LATERAL (
  SELECT 'jan' AS "period", "T1"."jan" AS "value"
  UNION ALL
  SELECT 'feb' AS "period", "T1"."feb" AS "value"
) AS "T1.unpvt" ON TRUE
  `,
};

export const unpivotWithWhere: ExpectedSql = {
  mysql: mysql`
SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`category\` AS \`category\`,
  \`T1.unpvt\`.\`month\` AS \`month\`, \`T1.unpvt\`.\`amount\` AS \`amount\`
FROM \`TestDb\`.\`MonthlySales\` AS \`T1\`
LEFT OUTER JOIN LATERAL (
  SELECT 'jan' AS \`month\`, \`T1\`.\`jan\` AS \`amount\`
  UNION ALL
  SELECT 'feb' AS \`month\`, \`T1\`.\`feb\` AS \`amount\`
  UNION ALL
  SELECT 'mar' AS \`month\`, \`T1\`.\`mar\` AS \`amount\`
) AS \`T1.unpvt\` ON TRUE
WHERE \`T1\`.\`category\`<=>'A'
  `,
  mssql: tsql`
SELECT [T1].[id] AS [id], [T1].[category] AS [category],
  [T1.unpvt].[month] AS [month], [T1.unpvt].[amount] AS [amount]
FROM [TestDb].[TestSchema].[MonthlySales] AS [T1]
OUTER APPLY (
  SELECT N'jan' AS [month], [T1].[jan] AS [amount]
  UNION ALL
  SELECT N'feb' AS [month], [T1].[feb] AS [amount]
  UNION ALL
  SELECT N'mar' AS [month], [T1].[mar] AS [amount]
) AS [T1.unpvt]
WHERE (([T1].[category] IS NULL AND N'A' IS NULL) OR [T1].[category] = N'A')
  `,
  postgresql: pgsql`
SELECT "T1"."id" AS "id", "T1"."category" AS "category",
  "T1.unpvt"."month" AS "month", "T1.unpvt"."amount" AS "amount"
FROM "TestSchema"."MonthlySales" AS "T1"
LEFT OUTER JOIN LATERAL (
  SELECT 'jan' AS "month", "T1"."jan" AS "amount"
  UNION ALL
  SELECT 'feb' AS "month", "T1"."feb" AS "amount"
  UNION ALL
  SELECT 'mar' AS "month", "T1"."mar" AS "amount"
) AS "T1.unpvt" ON TRUE
WHERE "T1"."category" IS NOT DISTINCT FROM 'A'
  `,
};

//#endregion
