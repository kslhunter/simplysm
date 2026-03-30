/**
 * DELETE test expected SQL
 */
import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

//#region ========== TRUNCATE ==========

export const truncate: ExpectedSql = {
  mysql: mysql`
    TRUNCATE TABLE \`TestDb\`.\`Employee\`
  `,
  mssql: tsql`
    TRUNCATE TABLE [TestDb].[TestSchema].[Employee]
  `,
  postgresql: pgsql`
    TRUNCATE TABLE "TestSchema"."Employee" RESTART IDENTITY
  `,
};

//#endregion

//#region ========== DELETE - Basic ==========

export const deleteSimple: ExpectedSql = {
  mysql: mysql`
    DELETE \`T1\` FROM \`TestDb\`.\`Employee\` AS \`T1\`
    WHERE \`T1\`.\`id\` <=> 1
  `,
  mssql: tsql`
    DELETE [T1]
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
    WHERE (([T1].[id] IS NULL AND 1 IS NULL) OR [T1].[id] = 1)
  `,
  postgresql: pgsql`
    DELETE FROM "TestSchema"."Employee" AS "T1"
    WHERE "T1"."id" IS NOT DISTINCT FROM 1
  `,
};

export const deleteMultiCond: ExpectedSql = {
  mysql: mysql`
    DELETE \`T1\` FROM \`TestDb\`.\`Employee\` AS \`T1\`
    WHERE \`T1\`.\`departmentId\` <=> 1 AND \`T1\`.\`managerId\` IS NULL
  `,
  mssql: tsql`
    DELETE [T1]
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
    WHERE (([T1].[departmentId] IS NULL AND 1 IS NULL) OR [T1].[departmentId] = 1)
      AND [T1].[managerId] IS NULL
  `,
  postgresql: pgsql`
    DELETE FROM "TestSchema"."Employee" AS "T1"
    WHERE "T1"."departmentId" IS NOT DISTINCT FROM 1
      AND "T1"."managerId" IS NULL
  `,
};

export const deleteWithOutput: ExpectedSql = {
  mysql: mysql`
    CREATE TEMPORARY TABLE \`SD_TEMP\` AS SELECT \`T1\`.\`id\`, \`T1\`.\`name\` FROM \`TestDb\`.\`Employee\` AS \`T1\` WHERE \`T1\`.\`id\` <=> 1;
    DELETE \`T1\` FROM \`TestDb\`.\`Employee\` AS \`T1\` WHERE \`T1\`.\`id\` <=> 1;
    SELECT * FROM \`SD_TEMP\`;
    DROP TEMPORARY TABLE \`SD_TEMP\`
  `,
  mssql: tsql`
    DELETE [T1]
    OUTPUT DELETED.[id], DELETED.[name]
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
    WHERE (([T1].[id] IS NULL AND 1 IS NULL) OR [T1].[id] = 1)
  `,
  postgresql: pgsql`
    DELETE FROM "TestSchema"."Employee" AS "T1"
    WHERE "T1"."id" IS NOT DISTINCT FROM 1
    RETURNING "id", "name"
  `,
};

export const deleteWithTop: ExpectedSql = {
  mysql: mysql`
    DELETE \`T1\` FROM \`TestDb\`.\`Employee\` AS \`T1\`
    WHERE \`T1\`.\`departmentId\` <=> 1
    LIMIT 100
  `,
  mssql: tsql`
    DELETE TOP 100 [T1]
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
    WHERE (([T1].[departmentId] IS NULL AND 1 IS NULL) OR [T1].[departmentId] = 1)
  `,
  postgresql: pgsql`
    DELETE FROM "TestSchema"."Employee" AS "T1"
    WHERE "T1"."departmentId" IS NOT DISTINCT FROM 1
  `,
};

//#endregion
