/**
 * SELECT - Basic test expected SQL
 */
import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

//#region ========== Basic SELECT ==========

export const selectAll: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const selectColumns: ExpectedSql = {
  mysql: mysql`
    SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`name\` AS \`name\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT [T1].[id] AS [id], [T1].[name] AS [name]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT "T1"."id" AS "id", "T1"."name" AS "name"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const selectConcat: ExpectedSql = {
  mysql: mysql`
    SELECT CONCAT(IFNULL(\`T1\`.\`email\`, ''), IFNULL('@test.com', '')) AS \`email\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT CONCAT([T1].[email], N'@test.com') AS [email]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT COALESCE("T1"."email", '') || COALESCE('@test.com', '') AS "email"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const selectAggregate: ExpectedSql = {
  mysql: mysql`
    SELECT
      COUNT(\`T1\`.\`id\`) AS \`cnt\`,
      SUM(\`T1\`.\`age\`) AS \`total\`,
      AVG(\`T1\`.\`age\`) AS \`avg\`,
      MIN(\`T1\`.\`age\`) AS \`min\`,
      MAX(\`T1\`.\`age\`) AS \`max\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      COUNT([T1].[id]) AS [cnt],
      SUM([T1].[age]) AS [total],
      AVG([T1].[age]) AS [avg],
      MIN([T1].[age]) AS [min],
      MAX([T1].[age]) AS [max]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      COUNT("T1"."id") AS "cnt",
      SUM("T1"."age") AS "total",
      AVG("T1"."age") AS "avg",
      MIN("T1"."age") AS "min",
      MAX("T1"."age") AS "max"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const selectIfNull2: ExpectedSql = {
  mysql: mysql`
    SELECT COALESCE(\`T1\`.\`email\`, 'N/A') AS \`email\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT COALESCE([T1].[email], N'N/A') AS [email]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT COALESCE("T1"."email", 'N/A') AS "email"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const selectIfNull3: ExpectedSql = {
  mysql: mysql`
    SELECT COALESCE(\`T1\`.\`email\`, \`T1\`.\`name\`, 'N/A') AS \`contact\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT COALESCE([T1].[email], [T1].[name], N'N/A') AS [contact]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT COALESCE("T1"."email", "T1"."name", 'N/A') AS "contact"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const selectNullIf: ExpectedSql = {
  mysql: mysql`
    SELECT NULLIF(\`T1\`.\`name\`, 'N/A') AS \`name\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT NULLIF([T1].[name], N'N/A') AS [name]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT NULLIF("T1"."name", 'N/A') AS "name"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const selectSubstring: ExpectedSql = {
  mysql: mysql`
    SELECT SUBSTRING(\`T1\`.\`name\`, 1, 3) AS \`shortName\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT SUBSTRING([T1].[name], 1, 3) AS [shortName]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT SUBSTRING("T1"."name", 1, 3) AS "shortName"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const selectSubstringNoLength: ExpectedSql = {
  mysql: mysql`
    SELECT SUBSTRING(\`T1\`.\`name\`, 3) AS \`suffix\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT SUBSTRING([T1].[name], 3, LEN([T1].[name])) AS [suffix]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT SUBSTRING("T1"."name" FROM 3) AS "suffix"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const selectIndexOf: ExpectedSql = {
  mysql: mysql`
    SELECT LOCATE('@', \`T1\`.\`email\`) AS \`atPos\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT CHARINDEX(N'@', [T1].[email]) AS [atPos]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT POSITION('@' IN "T1"."email") AS "atPos"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const selectLeast: ExpectedSql = {
  mysql: mysql`
    SELECT LEAST(\`T1\`.\`age\`, 50) AS \`minAge\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT (SELECT MIN(v) FROM (VALUES ([T1].[age]), (50)) AS t(v)) AS [minAge]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT LEAST("T1"."age", 50) AS "minAge"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const selectGreatest: ExpectedSql = {
  mysql: mysql`
    SELECT GREATEST(\`T1\`.\`age\`, 18) AS \`maxAge\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT (SELECT MAX(v) FROM (VALUES ([T1].[age]), (18)) AS t(v)) AS [maxAge]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT GREATEST("T1"."age", 18) AS "maxAge"
    FROM "TestSchema"."User" AS "T1"
  `,
};

//#endregion

//#region ========== Options ==========

export const selectDistinct: ExpectedSql = {
  mysql: mysql`
    SELECT DISTINCT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT DISTINCT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT DISTINCT *
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const selectLock: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    FOR UPDATE
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1] WITH (UPDLOCK, ROWLOCK)
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    FOR UPDATE
  `,
};

export const selectDistinctLock: ExpectedSql = {
  mysql: mysql`
    SELECT DISTINCT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    FOR UPDATE
  `,
  mssql: tsql`
    SELECT DISTINCT *
    FROM [TestDb].[TestSchema].[User] AS [T1] WITH (UPDLOCK, ROWLOCK)
  `,
  postgresql: pgsql`
    SELECT DISTINCT *
    FROM "TestSchema"."User" AS "T1"
    FOR UPDATE
  `,
};

//#endregion

//#region ========== Limit ==========

export const selectTop: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    LIMIT 10
  `,
  mssql: tsql`
    SELECT TOP 10 *
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    LIMIT 10
  `,
};

export const selectLimit: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    ORDER BY \`T1\`.\`id\`
    LIMIT 0, 10
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    ORDER BY [T1].[id]
    OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    ORDER BY "T1"."id"
    LIMIT 10 OFFSET 0
  `,
};

export const selectLimitOffset: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    ORDER BY \`T1\`.\`id\`
    LIMIT 20, 10
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    ORDER BY [T1].[id]
    OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    ORDER BY "T1"."id"
    LIMIT 10 OFFSET 20
  `,
};

// See examples/sampling.spec.ts for random sampling

//#endregion
