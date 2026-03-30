import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

//#region ========== PIVOT - Basic Aggregate Functions ==========

export const pivotSum: ExpectedSql = {
  mysql: mysql`
SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`category\` AS \`category\`,
  SUM(IF(\`T1\`.\`year\`<=>2020,\`T1\`.\`amount\`,NULL)) AS \`y2020\`,
  SUM(IF(\`T1\`.\`year\`<=>2021,\`T1\`.\`amount\`,NULL)) AS \`y2021\`
FROM \`TestDb\`.\`Sales\` AS \`T1\`
GROUP BY \`T1\`.\`id\`, \`T1\`.\`category\`
  `,
  mssql: tsql`
SELECT [T1].[id] AS [id], [T1].[category] AS [category],
  SUM(CASE WHEN (([T1].[year] IS NULL AND 2020 IS NULL) OR [T1].[year] = 2020) THEN [T1].[amount] ELSE NULL END) AS [y2020],
  SUM(CASE WHEN (([T1].[year] IS NULL AND 2021 IS NULL) OR [T1].[year] = 2021) THEN [T1].[amount] ELSE NULL END) AS [y2021]
FROM [TestDb].[TestSchema].[Sales] AS [T1]
GROUP BY [T1].[id], [T1].[category]
  `,
  postgresql: pgsql`
SELECT "T1"."id" AS "id", "T1"."category" AS "category",
  SUM(CASE WHEN "T1"."year" IS NOT DISTINCT FROM 2020 THEN "T1"."amount" ELSE NULL END) AS "y2020",
  SUM(CASE WHEN "T1"."year" IS NOT DISTINCT FROM 2021 THEN "T1"."amount" ELSE NULL END) AS "y2021"
FROM "TestSchema"."Sales" AS "T1"
GROUP BY "T1"."id", "T1"."category"
  `,
};

export const pivotCount: ExpectedSql = {
  mysql: mysql`
SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`category\` AS \`category\`,
  COUNT(IF(\`T1\`.\`year\`<=>2020,\`T1\`.\`amount\`,NULL)) AS \`y2020\`,
  COUNT(IF(\`T1\`.\`year\`<=>2021,\`T1\`.\`amount\`,NULL)) AS \`y2021\`
FROM \`TestDb\`.\`Sales\` AS \`T1\`
GROUP BY \`T1\`.\`id\`, \`T1\`.\`category\`
  `,
  mssql: tsql`
SELECT [T1].[id] AS [id], [T1].[category] AS [category],
  COUNT(CASE WHEN (([T1].[year] IS NULL AND 2020 IS NULL) OR [T1].[year] = 2020) THEN [T1].[amount] ELSE NULL END) AS [y2020],
  COUNT(CASE WHEN (([T1].[year] IS NULL AND 2021 IS NULL) OR [T1].[year] = 2021) THEN [T1].[amount] ELSE NULL END) AS [y2021]
FROM [TestDb].[TestSchema].[Sales] AS [T1]
GROUP BY [T1].[id], [T1].[category]
  `,
  postgresql: pgsql`
SELECT "T1"."id" AS "id", "T1"."category" AS "category",
  COUNT(CASE WHEN "T1"."year" IS NOT DISTINCT FROM 2020 THEN "T1"."amount" ELSE NULL END) AS "y2020",
  COUNT(CASE WHEN "T1"."year" IS NOT DISTINCT FROM 2021 THEN "T1"."amount" ELSE NULL END) AS "y2021"
FROM "TestSchema"."Sales" AS "T1"
GROUP BY "T1"."id", "T1"."category"
  `,
};

export const pivotAvg: ExpectedSql = {
  mysql: mysql`
SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`category\` AS \`category\`,
  AVG(IF(\`T1\`.\`year\`<=>2020,\`T1\`.\`amount\`,NULL)) AS \`y2020\`,
  AVG(IF(\`T1\`.\`year\`<=>2021,\`T1\`.\`amount\`,NULL)) AS \`y2021\`
FROM \`TestDb\`.\`Sales\` AS \`T1\`
GROUP BY \`T1\`.\`id\`, \`T1\`.\`category\`
  `,
  mssql: tsql`
SELECT [T1].[id] AS [id], [T1].[category] AS [category],
  AVG(CASE WHEN (([T1].[year] IS NULL AND 2020 IS NULL) OR [T1].[year] = 2020) THEN [T1].[amount] ELSE NULL END) AS [y2020],
  AVG(CASE WHEN (([T1].[year] IS NULL AND 2021 IS NULL) OR [T1].[year] = 2021) THEN [T1].[amount] ELSE NULL END) AS [y2021]
FROM [TestDb].[TestSchema].[Sales] AS [T1]
GROUP BY [T1].[id], [T1].[category]
  `,
  postgresql: pgsql`
SELECT "T1"."id" AS "id", "T1"."category" AS "category",
  AVG(CASE WHEN "T1"."year" IS NOT DISTINCT FROM 2020 THEN "T1"."amount" ELSE NULL END) AS "y2020",
  AVG(CASE WHEN "T1"."year" IS NOT DISTINCT FROM 2021 THEN "T1"."amount" ELSE NULL END) AS "y2021"
FROM "TestSchema"."Sales" AS "T1"
GROUP BY "T1"."id", "T1"."category"
  `,
};

export const pivotMax: ExpectedSql = {
  mysql: mysql`
SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`category\` AS \`category\`,
  MAX(IF(\`T1\`.\`year\`<=>2020,\`T1\`.\`amount\`,NULL)) AS \`y2020\`,
  MAX(IF(\`T1\`.\`year\`<=>2021,\`T1\`.\`amount\`,NULL)) AS \`y2021\`
FROM \`TestDb\`.\`Sales\` AS \`T1\`
GROUP BY \`T1\`.\`id\`, \`T1\`.\`category\`
  `,
  mssql: tsql`
SELECT [T1].[id] AS [id], [T1].[category] AS [category],
  MAX(CASE WHEN (([T1].[year] IS NULL AND 2020 IS NULL) OR [T1].[year] = 2020) THEN [T1].[amount] ELSE NULL END) AS [y2020],
  MAX(CASE WHEN (([T1].[year] IS NULL AND 2021 IS NULL) OR [T1].[year] = 2021) THEN [T1].[amount] ELSE NULL END) AS [y2021]
FROM [TestDb].[TestSchema].[Sales] AS [T1]
GROUP BY [T1].[id], [T1].[category]
  `,
  postgresql: pgsql`
SELECT "T1"."id" AS "id", "T1"."category" AS "category",
  MAX(CASE WHEN "T1"."year" IS NOT DISTINCT FROM 2020 THEN "T1"."amount" ELSE NULL END) AS "y2020",
  MAX(CASE WHEN "T1"."year" IS NOT DISTINCT FROM 2021 THEN "T1"."amount" ELSE NULL END) AS "y2021"
FROM "TestSchema"."Sales" AS "T1"
GROUP BY "T1"."id", "T1"."category"
  `,
};

export const pivotMin: ExpectedSql = {
  mysql: mysql`
SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`category\` AS \`category\`,
  MIN(IF(\`T1\`.\`year\`<=>2020,\`T1\`.\`amount\`,NULL)) AS \`y2020\`,
  MIN(IF(\`T1\`.\`year\`<=>2021,\`T1\`.\`amount\`,NULL)) AS \`y2021\`
FROM \`TestDb\`.\`Sales\` AS \`T1\`
GROUP BY \`T1\`.\`id\`, \`T1\`.\`category\`
  `,
  mssql: tsql`
SELECT [T1].[id] AS [id], [T1].[category] AS [category],
  MIN(CASE WHEN (([T1].[year] IS NULL AND 2020 IS NULL) OR [T1].[year] = 2020) THEN [T1].[amount] ELSE NULL END) AS [y2020],
  MIN(CASE WHEN (([T1].[year] IS NULL AND 2021 IS NULL) OR [T1].[year] = 2021) THEN [T1].[amount] ELSE NULL END) AS [y2021]
FROM [TestDb].[TestSchema].[Sales] AS [T1]
GROUP BY [T1].[id], [T1].[category]
  `,
  postgresql: pgsql`
SELECT "T1"."id" AS "id", "T1"."category" AS "category",
  MIN(CASE WHEN "T1"."year" IS NOT DISTINCT FROM 2020 THEN "T1"."amount" ELSE NULL END) AS "y2020",
  MIN(CASE WHEN "T1"."year" IS NOT DISTINCT FROM 2021 THEN "T1"."amount" ELSE NULL END) AS "y2021"
FROM "TestSchema"."Sales" AS "T1"
GROUP BY "T1"."id", "T1"."category"
  `,
};

//#endregion

//#region ========== PIVOT - Multiple Pivot Values ==========

export const pivotMultipleYears: ExpectedSql = {
  mysql: mysql`
SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`category\` AS \`category\`,
  SUM(IF(\`T1\`.\`year\`<=>2019,\`T1\`.\`amount\`,NULL)) AS \`y2019\`,
  SUM(IF(\`T1\`.\`year\`<=>2020,\`T1\`.\`amount\`,NULL)) AS \`y2020\`,
  SUM(IF(\`T1\`.\`year\`<=>2021,\`T1\`.\`amount\`,NULL)) AS \`y2021\`,
  SUM(IF(\`T1\`.\`year\`<=>2022,\`T1\`.\`amount\`,NULL)) AS \`y2022\`
FROM \`TestDb\`.\`Sales\` AS \`T1\`
GROUP BY \`T1\`.\`id\`, \`T1\`.\`category\`
  `,
  mssql: tsql`
SELECT [T1].[id] AS [id], [T1].[category] AS [category],
  SUM(CASE WHEN (([T1].[year] IS NULL AND 2019 IS NULL) OR [T1].[year] = 2019) THEN [T1].[amount] ELSE NULL END) AS [y2019],
  SUM(CASE WHEN (([T1].[year] IS NULL AND 2020 IS NULL) OR [T1].[year] = 2020) THEN [T1].[amount] ELSE NULL END) AS [y2020],
  SUM(CASE WHEN (([T1].[year] IS NULL AND 2021 IS NULL) OR [T1].[year] = 2021) THEN [T1].[amount] ELSE NULL END) AS [y2021],
  SUM(CASE WHEN (([T1].[year] IS NULL AND 2022 IS NULL) OR [T1].[year] = 2022) THEN [T1].[amount] ELSE NULL END) AS [y2022]
FROM [TestDb].[TestSchema].[Sales] AS [T1]
GROUP BY [T1].[id], [T1].[category]
  `,
  postgresql: pgsql`
SELECT "T1"."id" AS "id", "T1"."category" AS "category",
  SUM(CASE WHEN "T1"."year" IS NOT DISTINCT FROM 2019 THEN "T1"."amount" ELSE NULL END) AS "y2019",
  SUM(CASE WHEN "T1"."year" IS NOT DISTINCT FROM 2020 THEN "T1"."amount" ELSE NULL END) AS "y2020",
  SUM(CASE WHEN "T1"."year" IS NOT DISTINCT FROM 2021 THEN "T1"."amount" ELSE NULL END) AS "y2021",
  SUM(CASE WHEN "T1"."year" IS NOT DISTINCT FROM 2022 THEN "T1"."amount" ELSE NULL END) AS "y2022"
FROM "TestSchema"."Sales" AS "T1"
GROUP BY "T1"."id", "T1"."category"
  `,
};

export const pivotStringColumn: ExpectedSql = {
  mysql: mysql`
SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`year\` AS \`year\`,
  SUM(IF(\`T1\`.\`category\`<=>'Food',\`T1\`.\`amount\`,NULL)) AS \`food\`,
  SUM(IF(\`T1\`.\`category\`<=>'Electronics',\`T1\`.\`amount\`,NULL)) AS \`electronics\`
FROM \`TestDb\`.\`Sales\` AS \`T1\`
GROUP BY \`T1\`.\`id\`, \`T1\`.\`year\`
  `,
  mssql: tsql`
SELECT [T1].[id] AS [id], [T1].[year] AS [year],
  SUM(CASE WHEN (([T1].[category] IS NULL AND N'Food' IS NULL) OR [T1].[category] = N'Food') THEN [T1].[amount] ELSE NULL END) AS [food],
  SUM(CASE WHEN (([T1].[category] IS NULL AND N'Electronics' IS NULL) OR [T1].[category] = N'Electronics') THEN [T1].[amount] ELSE NULL END) AS [electronics]
FROM [TestDb].[TestSchema].[Sales] AS [T1]
GROUP BY [T1].[id], [T1].[year]
  `,
  postgresql: pgsql`
SELECT "T1"."id" AS "id", "T1"."year" AS "year",
  SUM(CASE WHEN "T1"."category" IS NOT DISTINCT FROM 'Food' THEN "T1"."amount" ELSE NULL END) AS "food",
  SUM(CASE WHEN "T1"."category" IS NOT DISTINCT FROM 'Electronics' THEN "T1"."amount" ELSE NULL END) AS "electronics"
FROM "TestSchema"."Sales" AS "T1"
GROUP BY "T1"."id", "T1"."year"
  `,
};

export const pivotWithWhere: ExpectedSql = {
  mysql: mysql`
SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`category\` AS \`category\`,
  SUM(IF(\`T1\`.\`year\`<=>2020,\`T1\`.\`amount\`,NULL)) AS \`y2020\`,
  SUM(IF(\`T1\`.\`year\`<=>2021,\`T1\`.\`amount\`,NULL)) AS \`y2021\`
FROM \`TestDb\`.\`Sales\` AS \`T1\`
WHERE \`T1\`.\`category\`<=>'Food'
GROUP BY \`T1\`.\`id\`, \`T1\`.\`category\`
  `,
  mssql: tsql`
SELECT [T1].[id] AS [id], [T1].[category] AS [category],
  SUM(CASE WHEN (([T1].[year] IS NULL AND 2020 IS NULL) OR [T1].[year] = 2020) THEN [T1].[amount] ELSE NULL END) AS [y2020],
  SUM(CASE WHEN (([T1].[year] IS NULL AND 2021 IS NULL) OR [T1].[year] = 2021) THEN [T1].[amount] ELSE NULL END) AS [y2021]
FROM [TestDb].[TestSchema].[Sales] AS [T1]
WHERE (([T1].[category] IS NULL AND N'Food' IS NULL) OR [T1].[category] = N'Food')
GROUP BY [T1].[id], [T1].[category]
  `,
  postgresql: pgsql`
SELECT "T1"."id" AS "id", "T1"."category" AS "category",
  SUM(CASE WHEN "T1"."year" IS NOT DISTINCT FROM 2020 THEN "T1"."amount" ELSE NULL END) AS "y2020",
  SUM(CASE WHEN "T1"."year" IS NOT DISTINCT FROM 2021 THEN "T1"."amount" ELSE NULL END) AS "y2021"
FROM "TestSchema"."Sales" AS "T1"
WHERE "T1"."category" IS NOT DISTINCT FROM 'Food'
GROUP BY "T1"."id", "T1"."category"
  `,
};

//#endregion
