/**
 * INSERT 테스트 Expected SQL
 */
import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

//#region ========== INSERT - 기본 ==========

export const insertSingle: ExpectedSql = {
  mysql: mysql`
    INSERT INTO \`TestDb\`.\`Employee\` (\`name\`, \`managerId\`, \`departmentId\`)
    VALUES ('홍길동', NULL, 1)
  `,
  mssql: tsql`
    INSERT INTO [TestDb].[TestSchema].[Employee] ([name], [managerId], [departmentId])
    VALUES (N'홍길동', NULL, 1)
  `,
  postgresql: pgsql`
    INSERT INTO "TestSchema"."Employee" ("name", "managerId", "departmentId")
    VALUES ('홍길동', NULL, 1)
  `,
};

export const insertBulk: ExpectedSql = {
  mysql: mysql`
    INSERT INTO \`TestDb\`.\`Employee\` (\`name\`, \`departmentId\`)
    VALUES ('홍길동', 1), ('김철수', 1), ('이영희', 2)
  `,
  mssql: tsql`
    INSERT INTO [TestDb].[TestSchema].[Employee] ([name], [departmentId])
    VALUES (N'홍길동', 1), (N'김철수', 1), (N'이영희', 2)
  `,
  postgresql: pgsql`
    INSERT INTO "TestSchema"."Employee" ("name", "departmentId")
    VALUES ('홍길동', 1), ('김철수', 1), ('이영희', 2)
  `,
};

export const insertWithOutput: ExpectedSql = {
  mysql: mysql`
    INSERT INTO \`TestDb\`.\`Employee\` (\`name\`, \`managerId\`, \`departmentId\`)
    VALUES ('홍길동', NULL, 1);
    SELECT \`id\`, \`name\` FROM \`TestDb\`.\`Employee\` WHERE \`id\` = LAST_INSERT_ID()
  `,
  mssql: tsql`
    INSERT INTO [TestDb].[TestSchema].[Employee] ([name], [managerId], [departmentId])
    OUTPUT INSERTED.[id], INSERTED.[name]
    VALUES (N'홍길동', NULL, 1)
  `,
  postgresql: pgsql`
    INSERT INTO "TestSchema"."Employee" ("name", "managerId", "departmentId")
    VALUES ('홍길동', NULL, 1)
    RETURNING "id", "name"
  `,
};

export const insertNullable: ExpectedSql = {
  mysql: mysql`
    INSERT INTO \`TestDb\`.\`Employee\` (\`name\`)
    VALUES ('홍길동')
  `,
  mssql: tsql`
    INSERT INTO [TestDb].[TestSchema].[Employee] ([name])
    VALUES (N'홍길동')
  `,
  postgresql: pgsql`
    INSERT INTO "TestSchema"."Employee" ("name")
    VALUES ('홍길동')
  `,
};

export const insertWithAi: ExpectedSql = {
  mysql: mysql`
    INSERT INTO \`TestDb\`.\`Employee\` (\`id\`, \`name\`, \`managerId\`, \`departmentId\`)
    VALUES (100, '홍길동', NULL, 1)
  `,
  mssql: tsql`
    SET IDENTITY_INSERT [TestDb].[TestSchema].[Employee] ON;
    INSERT INTO [TestDb].[TestSchema].[Employee] ([id], [name], [managerId], [departmentId])
    VALUES (100, N'홍길동', NULL, 1);
    SET IDENTITY_INSERT [TestDb].[TestSchema].[Employee] OFF;
  `,
  postgresql: pgsql`
    INSERT INTO "TestSchema"."Employee" ("id", "name", "managerId", "departmentId")
    VALUES (100, '홍길동', NULL, 1)
  `,
};

//#endregion

//#region ========== INSERT IF NOT EXISTS ==========

export const insertIfNotExistsBasic: ExpectedSql = {
  mysql: mysql`
    INSERT INTO \`TestDb\`.\`Employee\` (\`name\`, \`departmentId\`)
    SELECT '홍길동', 1
    WHERE NOT EXISTS (
      SELECT 1 AS \`_\` FROM \`TestDb\`.\`Employee\` AS \`T1\`
      WHERE \`T1\`.\`name\` <=> '홍길동'
    )
  `,
  mssql: tsql`
    INSERT INTO [TestDb].[TestSchema].[Employee] ([name], [departmentId])
    SELECT N'홍길동', 1
    WHERE NOT EXISTS (
      SELECT 1 AS [_] FROM [TestDb].[TestSchema].[Employee] AS [T1]
      WHERE (([T1].[name] IS NULL AND N'홍길동' IS NULL) OR [T1].[name] = N'홍길동')
    )
  `,
  postgresql: pgsql`
    INSERT INTO "TestSchema"."Employee" ("name", "departmentId")
    SELECT '홍길동', 1
    WHERE NOT EXISTS (
      SELECT 1 AS "_" FROM "TestSchema"."Employee" AS "T1"
      WHERE "T1"."name" IS NOT DISTINCT FROM '홍길동'
    )
  `,
};

export const insertIfNotExistsMultiple: ExpectedSql = {
  mysql: mysql`
    INSERT INTO \`TestDb\`.\`Employee\` (\`name\`, \`departmentId\`)
    SELECT '홍길동', 1
    WHERE NOT EXISTS (
      SELECT 1 AS \`_\` FROM \`TestDb\`.\`Employee\` AS \`T1\`
      WHERE \`T1\`.\`name\` <=> '홍길동' AND \`T1\`.\`departmentId\` <=> 1
    )
  `,
  mssql: tsql`
    INSERT INTO [TestDb].[TestSchema].[Employee] ([name], [departmentId])
    SELECT N'홍길동', 1
    WHERE NOT EXISTS (
      SELECT 1 AS [_] FROM [TestDb].[TestSchema].[Employee] AS [T1]
      WHERE (([T1].[name] IS NULL AND N'홍길동' IS NULL) OR [T1].[name] = N'홍길동')
        AND (([T1].[departmentId] IS NULL AND 1 IS NULL) OR [T1].[departmentId] = 1)
    )
  `,
  postgresql: pgsql`
    INSERT INTO "TestSchema"."Employee" ("name", "departmentId")
    SELECT '홍길동', 1
    WHERE NOT EXISTS (
      SELECT 1 AS "_" FROM "TestSchema"."Employee" AS "T1"
      WHERE "T1"."name" IS NOT DISTINCT FROM '홍길동'
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
