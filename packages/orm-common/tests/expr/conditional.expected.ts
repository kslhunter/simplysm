import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

export const ifNull: ExpectedSql = {
  mysql: mysql`
    SELECT COALESCE(\`T1\`.\`name\`, 'Unknown') AS \`nameOrDefault\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT COALESCE([T1].[name], N'Unknown') AS [nameOrDefault]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT COALESCE("T1"."name", 'Unknown') AS "nameOrDefault"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const nullIf: ExpectedSql = {
  mysql: mysql`
    SELECT NULLIF(\`T1\`.\`age\`, 0) AS \`checkedAge\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT NULLIF([T1].[age], 0) AS [checkedAge]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT NULLIF("T1"."age", 0) AS "checkedAge"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const ifCond: ExpectedSql = {
  mysql: mysql`
    SELECT IF(\`T1\`.\`isActive\` <=> TRUE, 'Active', 'Inactive') AS \`status\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT CASE WHEN (([T1].[isActive] IS NULL AND 1 IS NULL) OR [T1].[isActive] = 1) THEN N'Active' ELSE N'Inactive' END AS [status]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT CASE WHEN "T1"."isActive" IS NOT DISTINCT FROM TRUE THEN 'Active' ELSE 'Inactive' END AS "status"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const switchCase: ExpectedSql = {
  mysql: mysql`
    SELECT CASE
      WHEN \`T1\`.\`age\` < 20 THEN 'Teen'
      WHEN \`T1\`.\`age\` < 40 THEN 'Adult'
      ELSE 'Senior'
    END AS \`ageGroup\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT CASE
      WHEN [T1].[age] < 20 THEN N'Teen'
      WHEN [T1].[age] < 40 THEN N'Adult'
      ELSE N'Senior'
    END AS [ageGroup]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT CASE
      WHEN "T1"."age" < 20 THEN 'Teen'
      WHEN "T1"."age" < 40 THEN 'Adult'
      ELSE 'Senior'
    END AS "ageGroup"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const isExpr: ExpectedSql = {
  mysql: mysql`
    SELECT (\`T1\`.\`isActive\` <=> TRUE) AS \`isActiveFlag\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT CASE WHEN (([T1].[isActive] IS NULL AND 1 IS NULL) OR [T1].[isActive] = 1) THEN 1 ELSE 0 END AS [isActiveFlag]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT ("T1"."isActive" IS NOT DISTINCT FROM TRUE)::INTEGER AS "isActiveFlag"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const greatest: ExpectedSql = {
  mysql: mysql`
    SELECT GREATEST(\`T1\`.\`age\`, 18) AS \`maxVal\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT (SELECT MAX(v) FROM (VALUES ([T1].[age]), (18)) AS t(v)) AS [maxVal]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT GREATEST("T1"."age", 18) AS "maxVal"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const least: ExpectedSql = {
  mysql: mysql`
    SELECT LEAST(\`T1\`.\`age\`, 100) AS \`minVal\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT (SELECT MIN(v) FROM (VALUES ([T1].[age]), (100)) AS t(v)) AS [minVal]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT LEAST("T1"."age", 100) AS "minVal"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const ifNullMultiple: ExpectedSql = {
  mysql: mysql`
    SELECT COALESCE(\`T1\`.\`email\`, \`T1\`.\`name\`, 'Anonymous') AS \`firstValid\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT COALESCE([T1].[email], [T1].[name], N'Anonymous') AS [firstValid]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT COALESCE("T1"."email", "T1"."name", 'Anonymous') AS "firstValid"
    FROM "TestSchema"."User" AS "T1"
  `,
};
