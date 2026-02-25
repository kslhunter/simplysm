/**
 * Expr - 유틸리티 함수 test expected SQL
 */
import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

//#region ========== ROW_NUM ==========

export const rowNum: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      ROW_NUMBER() OVER () AS \`rowNum\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS [rowNum]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      ROW_NUMBER() OVER () AS "rowNum"
    FROM "TestSchema"."User" AS "T1"
  `,
};

//#endregion

//#region ========== RANDOM ==========

export const random: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      RAND() AS \`randomVal\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      NEWID() AS [randomVal]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      RANDOM() AS "randomVal"
    FROM "TestSchema"."User" AS "T1"
  `,
};

//#endregion

//#region ========== CAST ==========

export const castToInt: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      CAST(\`T1\`.\`age\` AS INT) AS \`ageInt\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      CAST([T1].[age] AS INT) AS [ageInt]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      CAST("T1"."age" AS INTEGER) AS "ageInt"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const castToVarchar: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      CAST(\`T1\`.\`age\` AS VARCHAR(50)) AS \`ageStr\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      CAST([T1].[age] AS NVARCHAR(50)) AS [ageStr]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      CAST("T1"."age" AS VARCHAR(50)) AS "ageStr"
    FROM "TestSchema"."User" AS "T1"
  `,
};

//#endregion

//#region ========== RAW ==========

export const rawBasic: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      NOW() AS \`serverTime\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      NOW() AS [serverTime]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      NOW() AS "serverTime"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const rawWithParam: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      CONCAT(\`T1\`.\`name\`, ' - ', \`T1\`.\`email\`) AS \`combined\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      CONCAT([T1].[name], ' - ', [T1].[email]) AS [combined]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      CONCAT("T1"."name", ' - ', "T1"."email") AS "combined"
    FROM "TestSchema"."User" AS "T1"
  `,
};

//#endregion
