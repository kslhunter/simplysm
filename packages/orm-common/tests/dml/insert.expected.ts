/**
 * INSERT test expected SQL
 */
import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

//#region ========== INSERT - Basic ==========

export const insertSingle: ExpectedSql = {
  mysql: mysql`
    INSERT INTO \`TestDb\`.\`Employee\` (\`name\`, \`managerId\`, \`departmentId\`)
    VALUES ('Hong Gildong', NULL, 1)
  `,
  mssql: tsql`
    INSERT INTO [TestDb].[TestSchema].[Employee] ([name], [managerId], [departmentId])
    VALUES (N'Hong Gildong', NULL, 1)
  `,
  postgresql: pgsql`
    INSERT INTO "TestSchema"."Employee" ("name", "managerId", "departmentId")
    VALUES ('Hong Gildong', NULL, 1)
  `,
};

export const insertBulk: ExpectedSql = {
  mysql: mysql`
    INSERT INTO \`TestDb\`.\`Employee\` (\`name\`, \`departmentId\`)
    VALUES ('Hong Gildong', 1), ('Kim Chulsu', 1), ('Lee Younghee', 2)
  `,
  mssql: tsql`
    INSERT INTO [TestDb].[TestSchema].[Employee] ([name], [departmentId])
    VALUES (N'Hong Gildong', 1), (N'Kim Chulsu', 1), (N'Lee Younghee', 2)
  `,
  postgresql: pgsql`
    INSERT INTO "TestSchema"."Employee" ("name", "departmentId")
    VALUES ('Hong Gildong', 1), ('Kim Chulsu', 1), ('Lee Younghee', 2)
  `,
};

export const insertWithOutput: ExpectedSql = {
  mysql: mysql`
    INSERT INTO \`TestDb\`.\`Employee\` (\`name\`, \`managerId\`, \`departmentId\`)
    VALUES ('Hong Gildong', NULL, 1);
    SELECT \`id\`, \`name\` FROM \`TestDb\`.\`Employee\` WHERE \`id\` = LAST_INSERT_ID()
  `,
  mssql: tsql`
    INSERT INTO [TestDb].[TestSchema].[Employee] ([name], [managerId], [departmentId])
    OUTPUT INSERTED.[id], INSERTED.[name]
    VALUES (N'Hong Gildong', NULL, 1)
  `,
  postgresql: pgsql`
    INSERT INTO "TestSchema"."Employee" ("name", "managerId", "departmentId")
    VALUES ('Hong Gildong', NULL, 1)
    RETURNING "id", "name"
  `,
};

export const insertNullable: ExpectedSql = {
  mysql: mysql`
    INSERT INTO \`TestDb\`.\`Employee\` (\`name\`)
    VALUES ('Hong Gildong')
  `,
  mssql: tsql`
    INSERT INTO [TestDb].[TestSchema].[Employee] ([name])
    VALUES (N'Hong Gildong')
  `,
  postgresql: pgsql`
    INSERT INTO "TestSchema"."Employee" ("name")
    VALUES ('Hong Gildong')
  `,
};

export const insertWithAi: ExpectedSql = {
  mysql: mysql`
    INSERT INTO \`TestDb\`.\`Employee\` (\`id\`, \`name\`, \`managerId\`, \`departmentId\`)
    VALUES (100, 'Gildong Hong', NULL, 1)
  `,
  mssql: tsql`
    SET IDENTITY_INSERT [TestDb].[TestSchema].[Employee] ON;
    INSERT INTO [TestDb].[TestSchema].[Employee] ([id], [name], [managerId], [departmentId])
    VALUES (100, N'Gildong Hong', NULL, 1);
    SET IDENTITY_INSERT [TestDb].[TestSchema].[Employee] OFF;
  `,
  postgresql: pgsql`
    INSERT INTO "TestSchema"."Employee" ("id", "name", "managerId", "departmentId")
    VALUES (100, 'Gildong Hong', NULL, 1)
  `,
};

//#endregion

//#region ========== INSERT IF NOT EXISTS ==========

export const insertIfNotExistsBasic: ExpectedSql = {
  mysql: mysql`
    INSERT INTO \`TestDb\`.\`Employee\` (\`name\`, \`departmentId\`)
    SELECT 'Gildong Hong', 1
    WHERE NOT EXISTS (
      SELECT 1 AS \`_\` FROM \`TestDb\`.\`Employee\` AS \`T1\`
      WHERE \`T1\`.\`name\` <=> 'Gildong Hong'
    )
  `,
  mssql: tsql`
    INSERT INTO [TestDb].[TestSchema].[Employee] ([name], [departmentId])
    SELECT N'Gildong Hong', 1
    WHERE NOT EXISTS (
      SELECT 1 AS [_] FROM [TestDb].[TestSchema].[Employee] AS [T1]
      WHERE (([T1].[name] IS NULL AND N'Gildong Hong' IS NULL) OR [T1].[name] = N'Gildong Hong')
    )
  `,
  postgresql: pgsql`
    INSERT INTO "TestSchema"."Employee" ("name", "departmentId")
    SELECT 'Gildong Hong', 1
    WHERE NOT EXISTS (
      SELECT 1 AS "_" FROM "TestSchema"."Employee" AS "T1"
      WHERE "T1"."name" IS NOT DISTINCT FROM 'Gildong Hong'
    )
  `,
};

export const insertIfNotExistsMultiple: ExpectedSql = {
  mysql: mysql`
    INSERT INTO \`TestDb\`.\`Employee\` (\`name\`, \`departmentId\`)
    SELECT 'Gildong Hong', 1
    WHERE NOT EXISTS (
      SELECT 1 AS \`_\` FROM \`TestDb\`.\`Employee\` AS \`T1\`
      WHERE \`T1\`.\`name\` <=> 'Gildong Hong' AND \`T1\`.\`departmentId\` <=> 1
    )
  `,
  mssql: tsql`
    INSERT INTO [TestDb].[TestSchema].[Employee] ([name], [departmentId])
    SELECT N'Gildong Hong', 1
    WHERE NOT EXISTS (
      SELECT 1 AS [_] FROM [TestDb].[TestSchema].[Employee] AS [T1]
      WHERE (([T1].[name] IS NULL AND N'Gildong Hong' IS NULL) OR [T1].[name] = N'Gildong Hong')
        AND (([T1].[departmentId] IS NULL AND 1 IS NULL) OR [T1].[departmentId] = 1)
    )
  `,
  postgresql: pgsql`
    INSERT INTO "TestSchema"."Employee" ("name", "departmentId")
    SELECT 'Gildong Hong', 1
    WHERE NOT EXISTS (
      SELECT 1 AS "_" FROM "TestSchema"."Employee" AS "T1"
      WHERE "T1"."name" IS NOT DISTINCT FROM 'Gildong Hong'
        AND "T1"."departmentId" IS NOT DISTINCT FROM 1
    )
  `,
};

//#endregion

//#region ========== INSERT INTO ... SELECT ==========

export const insertIntoSelect: ExpectedSql = {
  mysql: mysql`
    INSERT INTO \`TestDb\`.\`EmployeeBackup\` (\`id\`, \`name\`)
    SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`name\` AS \`name\`
    FROM \`TestDb\`.\`Employee\` AS \`T1\`
  `,
  mssql: tsql`
    INSERT INTO [TestDb].[TestSchema].[EmployeeBackup] ([id], [name])
    SELECT [T1].[id] AS [id], [T1].[name] AS [name]
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
  `,
  postgresql: pgsql`
    INSERT INTO "TestSchema"."EmployeeBackup" ("id", "name")
    SELECT "T1"."id" AS "id", "T1"."name" AS "name"
    FROM "TestSchema"."Employee" AS "T1"
  `,
};

export const insertIntoSelectWhere: ExpectedSql = {
  mysql: mysql`
    INSERT INTO \`TestDb\`.\`EmployeeBackup\` (\`id\`, \`name\`)
    SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`name\` AS \`name\`
    FROM \`TestDb\`.\`Employee\` AS \`T1\`
    WHERE \`T1\`.\`departmentId\` <=> 1
  `,
  mssql: tsql`
    INSERT INTO [TestDb].[TestSchema].[EmployeeBackup] ([id], [name])
    SELECT [T1].[id] AS [id], [T1].[name] AS [name]
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
    WHERE (([T1].[departmentId] IS NULL AND 1 IS NULL) OR [T1].[departmentId] = 1)
  `,
  postgresql: pgsql`
    INSERT INTO "TestSchema"."EmployeeBackup" ("id", "name")
    SELECT "T1"."id" AS "id", "T1"."name" AS "name"
    FROM "TestSchema"."Employee" AS "T1"
    WHERE "T1"."departmentId" IS NOT DISTINCT FROM 1
  `,
};

//#endregion
