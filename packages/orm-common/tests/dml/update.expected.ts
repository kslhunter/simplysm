/**
 * UPDATE 테스트 Expected SQL
 */
import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

//#region ========== UPDATE - 기본 ==========

export const updateSimple: ExpectedSql = {
  mysql: mysql`
    UPDATE \`TestDb\`.\`Employee\` AS \`T1\`
    SET \`T1\`.\`name\` = '새이름'
    WHERE \`T1\`.\`id\` <=> 1
  `,
  mssql: tsql`
    UPDATE [T1]
    SET [T1].[name] = N'새이름'
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
    WHERE (([T1].[id] IS NULL AND 1 IS NULL) OR [T1].[id] = 1)
  `,
  postgresql: pgsql`
    UPDATE "TestSchema"."Employee" AS "T1"
    SET "name" = '새이름'
    WHERE "T1"."id" IS NOT DISTINCT FROM 1
  `,
};

export const updateMultiCol: ExpectedSql = {
  mysql: mysql`
    UPDATE \`TestDb\`.\`Employee\` AS \`T1\`
    SET \`T1\`.\`name\` = '새이름', \`T1\`.\`departmentId\` = 2
    WHERE \`T1\`.\`id\` <=> 1
  `,
  mssql: tsql`
    UPDATE [T1]
    SET [T1].[name] = N'새이름', [T1].[departmentId] = 2
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
    WHERE (([T1].[id] IS NULL AND 1 IS NULL) OR [T1].[id] = 1)
  `,
  postgresql: pgsql`
    UPDATE "TestSchema"."Employee" AS "T1"
    SET "name" = '새이름', "departmentId" = 2
    WHERE "T1"."id" IS NOT DISTINCT FROM 1
  `,
};

export const updatePlainValues: ExpectedSql = {
  mysql: mysql`
    UPDATE \`TestDb\`.\`Employee\` AS \`T1\`
    SET \`T1\`.\`name\` = '새이름', \`T1\`.\`departmentId\` = 2
    WHERE \`T1\`.\`id\` <=> 1
  `,
  mssql: tsql`
    UPDATE [T1]
    SET [T1].[name] = N'새이름', [T1].[departmentId] = 2
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
    WHERE (([T1].[id] IS NULL AND 1 IS NULL) OR [T1].[id] = 1)
  `,
  postgresql: pgsql`
    UPDATE "TestSchema"."Employee" AS "T1"
    SET "name" = '새이름', "departmentId" = 2
    WHERE "T1"."id" IS NOT DISTINCT FROM 1
  `,
};

export const updateMixed: ExpectedSql = {
  mysql: mysql`
    UPDATE \`TestDb\`.\`Employee\` AS \`T1\`
    SET \`T1\`.\`name\` = '새이름', \`T1\`.\`managerId\` = \`T1\`.\`managerId\` + 1
    WHERE \`T1\`.\`id\` <=> 1
  `,
  mssql: tsql`
    UPDATE [T1]
    SET [T1].[name] = N'새이름', [T1].[managerId] = [T1].[managerId] + 1
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
    WHERE (([T1].[id] IS NULL AND 1 IS NULL) OR [T1].[id] = 1)
  `,
  postgresql: pgsql`
    UPDATE "TestSchema"."Employee" AS "T1"
    SET "name" = '새이름', "managerId" = "T1"."managerId" + 1
    WHERE "T1"."id" IS NOT DISTINCT FROM 1
  `,
};

export const updateWithRef: ExpectedSql = {
  mysql: mysql`
    UPDATE \`TestDb\`.\`Employee\` AS \`T1\`
    SET \`T1\`.\`managerId\` = \`T1\`.\`managerId\` + 1
    WHERE \`T1\`.\`id\` <=> 1
  `,
  mssql: tsql`
    UPDATE [T1]
    SET [T1].[managerId] = [T1].[managerId] + 1
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
    WHERE (([T1].[id] IS NULL AND 1 IS NULL) OR [T1].[id] = 1)
  `,
  postgresql: pgsql`
    UPDATE "TestSchema"."Employee" AS "T1"
    SET "managerId" = "T1"."managerId" + 1
    WHERE "T1"."id" IS NOT DISTINCT FROM 1
  `,
};

export const updateWithOutput: ExpectedSql = {
  mysql: mysql`
    CREATE TEMPORARY TABLE \`SD_TEMP\` AS SELECT \`T1\`.\`id\` AS \`id\` FROM \`TestDb\`.\`Employee\` AS \`T1\` WHERE \`T1\`.\`id\` <=> 1;
    UPDATE \`TestDb\`.\`Employee\` AS \`T1\`
    SET \`T1\`.\`name\` = '새이름'
    WHERE \`T1\`.\`id\` <=> 1;
    SELECT \`T1\`.\`id\`, \`T1\`.\`name\` FROM \`TestDb\`.\`Employee\` AS \`T1\`, \`SD_TEMP\` WHERE \`T1\`.\`id\` = \`SD_TEMP\`.\`id\`;
    DROP TEMPORARY TABLE \`SD_TEMP\`
  `,
  mssql: tsql`
    UPDATE [T1]
    SET [T1].[name] = N'새이름'
    OUTPUT INSERTED.[id], INSERTED.[name]
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
    WHERE (([T1].[id] IS NULL AND 1 IS NULL) OR [T1].[id] = 1)
  `,
  postgresql: pgsql`
    UPDATE "TestSchema"."Employee" AS "T1"
    SET "name" = '새이름'
    WHERE "T1"."id" IS NOT DISTINCT FROM 1
    RETURNING "T1"."id", "T1"."name"
  `,
};

export const updateWithTop: ExpectedSql = {
  mysql: mysql`
    UPDATE \`TestDb\`.\`Employee\` AS \`T1\`
    SET \`T1\`.\`name\` = '새이름'
    WHERE \`T1\`.\`departmentId\` <=> 1
    LIMIT 10
  `,
  mssql: tsql`
    UPDATE TOP 10 [T1]
    SET [T1].[name] = N'새이름'
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
    WHERE (([T1].[departmentId] IS NULL AND 1 IS NULL) OR [T1].[departmentId] = 1)
  `,
  postgresql: pgsql`
    UPDATE "TestSchema"."Employee" AS "T1"
    SET "name" = '새이름'
    WHERE "T1"."departmentId" IS NOT DISTINCT FROM 1
  `,
};

//#endregion

//#region ========== FK 스위치 ==========

export const fkOff: ExpectedSql = {
  mysql: mysql`
    SET FOREIGN_KEY_CHECKS = 0
  `,
  mssql: tsql`
    ALTER TABLE [TestDb].[TestSchema].[Employee] NOCHECK CONSTRAINT ALL
  `,
  postgresql: pgsql`
    ALTER TABLE "TestSchema"."Employee" DISABLE TRIGGER ALL
  `,
};

export const fkOn: ExpectedSql = {
  mysql: mysql`
    SET FOREIGN_KEY_CHECKS = 1
  `,
  mssql: tsql`
    ALTER TABLE [TestDb].[TestSchema].[Employee] WITH CHECK CHECK CONSTRAINT ALL
  `,
  postgresql: pgsql`
    ALTER TABLE "TestSchema"."Employee" ENABLE TRIGGER ALL
  `,
};

//#endregion
