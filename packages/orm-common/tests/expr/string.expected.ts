import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

export const concat: ExpectedSql = {
  mysql: mysql`
    SELECT CONCAT(IFNULL(\`T1\`.\`name\`, ''), IFNULL('@', ''), IFNULL(\`T1\`.\`email\`, '')) AS \`fullName\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT CONCAT([T1].[name], N'@', [T1].[email]) AS [fullName]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT COALESCE("T1"."name", '') || COALESCE('@', '') || COALESCE("T1"."email", '') AS "fullName"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const length: ExpectedSql = {
  mysql: mysql`
    SELECT CHAR_LENGTH(IFNULL(\`T1\`.\`name\`, '')) AS \`nameLength\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT LEN(ISNULL([T1].[name], N'')) AS [nameLength]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT LENGTH(COALESCE("T1"."name", '')) AS "nameLength"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const byteLength: ExpectedSql = {
  mysql: mysql`
    SELECT LENGTH(IFNULL(\`T1\`.\`name\`, '')) AS \`byteLen\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT DATALENGTH(ISNULL([T1].[name], N'')) AS [byteLen]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT OCTET_LENGTH(COALESCE("T1"."name", '')) AS "byteLen"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const left: ExpectedSql = {
  mysql: mysql`
    SELECT LEFT(\`T1\`.\`name\`, 3) AS \`prefix\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT LEFT([T1].[name], 3) AS [prefix]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT LEFT("T1"."name", 3) AS "prefix"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const right: ExpectedSql = {
  mysql: mysql`
    SELECT RIGHT(\`T1\`.\`name\`, 3) AS \`suffix\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT RIGHT([T1].[name], 3) AS [suffix]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT RIGHT("T1"."name", 3) AS "suffix"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const trim: ExpectedSql = {
  mysql: mysql`
    SELECT TRIM(\`T1\`.\`name\`) AS \`trimmed\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT RTRIM(LTRIM([T1].[name])) AS [trimmed]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT TRIM("T1"."name") AS "trimmed"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const padStart: ExpectedSql = {
  mysql: mysql`
    SELECT LPAD(\`T1\`.\`name\`, 10, '0') AS \`padded\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT RIGHT(REPLICATE(N'0', 10) + [T1].[name], 10) AS [padded]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT LPAD("T1"."name", 10, '0') AS "padded"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const replace: ExpectedSql = {
  mysql: mysql`
    SELECT REPLACE(\`T1\`.\`name\`, 'a', 'A') AS \`replaced\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT REPLACE([T1].[name], N'a', N'A') AS [replaced]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT REPLACE("T1"."name", 'a', 'A') AS "replaced"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const upper: ExpectedSql = {
  mysql: mysql`
    SELECT UPPER(\`T1\`.\`name\`) AS \`upper\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT UPPER([T1].[name]) AS [upper]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT UPPER("T1"."name") AS "upper"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const lower: ExpectedSql = {
  mysql: mysql`
    SELECT LOWER(\`T1\`.\`name\`) AS \`lower\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT LOWER([T1].[name]) AS [lower]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT LOWER("T1"."name") AS "lower"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const substring: ExpectedSql = {
  mysql: mysql`
    SELECT SUBSTRING(\`T1\`.\`name\`, 1, 5) AS \`sub\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT SUBSTRING([T1].[name], 1, 5) AS [sub]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT SUBSTRING("T1"."name", 1, 5) AS "sub"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const indexOf: ExpectedSql = {
  mysql: mysql`
    SELECT LOCATE('test', \`T1\`.\`name\`) AS \`pos\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT CHARINDEX(N'test', [T1].[name]) AS [pos]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT POSITION('test' IN "T1"."name") AS "pos"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const like: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE \`T1\`.\`name\` LIKE '%test%' ESCAPE '\\\\'
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE [T1].[name] LIKE N'%test%' ESCAPE '\\'
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE "T1"."name" LIKE '%test%' ESCAPE '\\'
  `,
};

export const likeEscape: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE \`T1\`.\`name\` LIKE '%\\\\%%' ESCAPE '\\\\'
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE [T1].[name] LIKE N'%\\%%' ESCAPE '\\'
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE "T1"."name" LIKE '%\\%%' ESCAPE '\\'
  `,
};
