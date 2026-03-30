/**
 * UPSERT test expected SQL
 */
import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

//#region ========== UPSERT - Basic ==========

export const upsertSimple: ExpectedSql = {
  mysql: mysql`
    UPDATE \`TestDb\`.\`Employee\` AS \`T1\`
    SET \`T1\`.\`name\` = 'new name'
    WHERE \`T1\`.\`id\` <=> 1;
    INSERT INTO \`TestDb\`.\`Employee\` (\`name\`, \`departmentId\`)
    SELECT 'new name', 1
    WHERE NOT EXISTS (SELECT * FROM \`TestDb\`.\`Employee\` AS \`T1\` WHERE \`T1\`.\`id\` <=> 1)
  `,
  mssql: tsql`
    MERGE [TestDb].[TestSchema].[Employee] AS [T1]
    USING (SELECT 1 AS [_]) AS [_src]
    ON (([T1].[id] IS NULL AND 1 IS NULL) OR [T1].[id] = 1)
    WHEN MATCHED THEN
      UPDATE SET [name] = N'new name'
    WHEN NOT MATCHED THEN
      INSERT ([name], [departmentId]) VALUES (N'new name', 1);
  `,
  postgresql: pgsql`
    WITH matched AS (
      SELECT "T1".* FROM "TestSchema"."Employee" AS "T1"
      WHERE "T1"."id" IS NOT DISTINCT FROM 1
    ),
    updated AS (
      UPDATE "TestSchema"."Employee" AS "T1"
      SET "name" = 'new name'
      WHERE "T1"."id" IS NOT DISTINCT FROM 1
      RETURNING *
    ),
    inserted AS (
      INSERT INTO "TestSchema"."Employee" ("name", "departmentId")
      SELECT 'new name', 1
      WHERE NOT EXISTS (SELECT 1 FROM matched)
      RETURNING *
    )
    SELECT * FROM updated UNION ALL SELECT * FROM inserted
  `,
};

export const upsertReuse: ExpectedSql = {
  mysql: mysql`
    UPDATE \`TestDb\`.\`Employee\` AS \`T1\`
    SET \`T1\`.\`name\` = 'Gildong Hong', \`T1\`.\`departmentId\` = 2
    WHERE \`T1\`.\`id\` <=> 1;
    INSERT INTO \`TestDb\`.\`Employee\` (\`name\`, \`departmentId\`, \`managerId\`)
    SELECT 'Gildong Hong', 2, 100
    WHERE NOT EXISTS (SELECT * FROM \`TestDb\`.\`Employee\` AS \`T1\` WHERE \`T1\`.\`id\` <=> 1)
  `,
  mssql: tsql`
    MERGE [TestDb].[TestSchema].[Employee] AS [T1]
    USING (SELECT 1 AS [_]) AS [_src]
    ON (([T1].[id] IS NULL AND 1 IS NULL) OR [T1].[id] = 1)
    WHEN MATCHED THEN
      UPDATE SET [name] = N'Gildong Hong', [departmentId] = 2
    WHEN NOT MATCHED THEN
      INSERT ([name], [departmentId], [managerId]) VALUES (N'Gildong Hong', 2, 100);
  `,
  postgresql: pgsql`
    WITH matched AS (
      SELECT "T1".* FROM "TestSchema"."Employee" AS "T1"
      WHERE "T1"."id" IS NOT DISTINCT FROM 1
    ),
    updated AS (
      UPDATE "TestSchema"."Employee" AS "T1"
      SET "name" = 'Gildong Hong', "departmentId" = 2
      WHERE "T1"."id" IS NOT DISTINCT FROM 1
      RETURNING *
    ),
    inserted AS (
      INSERT INTO "TestSchema"."Employee" ("name", "departmentId", "managerId")
      SELECT 'Gildong Hong', 2, 100
      WHERE NOT EXISTS (SELECT 1 FROM matched)
      RETURNING *
    )
    SELECT * FROM updated UNION ALL SELECT * FROM inserted
  `,
};

export const upsertWithOutput: ExpectedSql = {
  mysql: mysql`
    CREATE TEMPORARY TABLE \`SD_TEMP\` AS SELECT \`id\` FROM \`TestDb\`.\`Employee\` AS \`T1\` WHERE \`T1\`.\`id\` <=> 1;
    UPDATE \`TestDb\`.\`Employee\` AS \`T1\`
    SET \`T1\`.\`name\` = 'New Name'
    WHERE \`T1\`.\`id\` <=> 1;
    INSERT INTO \`TestDb\`.\`Employee\` (\`name\`)
    SELECT 'New Name'
    WHERE NOT EXISTS (SELECT * FROM \`TestDb\`.\`Employee\` AS \`T1\` WHERE \`T1\`.\`id\` <=> 1);
    SELECT \`id\`, \`name\` FROM \`TestDb\`.\`Employee\`
    WHERE \`TestDb\`.\`Employee\`.\`id\` IN (SELECT \`id\` FROM \`SD_TEMP\`)
    UNION ALL
    SELECT \`id\`, \`name\` FROM \`TestDb\`.\`Employee\`
    WHERE \`id\` = LAST_INSERT_ID() AND NOT EXISTS (SELECT 1 FROM \`SD_TEMP\`);
    DROP TEMPORARY TABLE \`SD_TEMP\`
  `,
  mssql: tsql`
    MERGE [TestDb].[TestSchema].[Employee] AS [T1]
    USING (SELECT 1 AS [_]) AS [_src]
    ON (([T1].[id] IS NULL AND 1 IS NULL) OR [T1].[id] = 1)
    WHEN MATCHED THEN
      UPDATE SET [name] = N'New Name'
    WHEN NOT MATCHED THEN
      INSERT ([name]) VALUES (N'New Name')
    OUTPUT INSERTED.[id], INSERTED.[name];
  `,
  postgresql: pgsql`
    WITH matched AS (
      SELECT "T1".* FROM "TestSchema"."Employee" AS "T1"
      WHERE "T1"."id" IS NOT DISTINCT FROM 1
    ),
    updated AS (
      UPDATE "TestSchema"."Employee" AS "T1"
      SET "name" = 'New Name'
      WHERE "T1"."id" IS NOT DISTINCT FROM 1
      RETURNING "id", "name"
    ),
    inserted AS (
      INSERT INTO "TestSchema"."Employee" ("name")
      SELECT 'New Name'
      WHERE NOT EXISTS (SELECT 1 FROM matched)
      RETURNING "id", "name"
    )
    SELECT * FROM updated UNION ALL SELECT * FROM inserted
  `,
};

export const upsertMultiWhere: ExpectedSql = {
  mysql: mysql`
    UPDATE \`TestDb\`.\`Employee\` AS \`T1\`
    SET \`T1\`.\`managerId\` = 10
    WHERE \`T1\`.\`name\` <=> 'Gildong Hong' AND \`T1\`.\`departmentId\` <=> 1;
    INSERT INTO \`TestDb\`.\`Employee\` (\`name\`, \`departmentId\`, \`managerId\`)
    SELECT 'Gildong Hong', 1, 10
    WHERE NOT EXISTS (SELECT * FROM \`TestDb\`.\`Employee\` AS \`T1\` WHERE \`T1\`.\`name\` <=> 'Gildong Hong' AND \`T1\`.\`departmentId\` <=> 1)
  `,
  mssql: tsql`
    MERGE [TestDb].[TestSchema].[Employee] AS [T1]
    USING (SELECT 1 AS [_]) AS [_src]
    ON (([T1].[name] IS NULL AND N'Gildong Hong' IS NULL) OR [T1].[name] = N'Gildong Hong')
      AND (([T1].[departmentId] IS NULL AND 1 IS NULL) OR [T1].[departmentId] = 1)
    WHEN MATCHED THEN
      UPDATE SET [managerId] = 10
    WHEN NOT MATCHED THEN
      INSERT ([name], [departmentId], [managerId]) VALUES (N'Gildong Hong', 1, 10);
  `,
  postgresql: pgsql`
    WITH matched AS (
      SELECT "T1".* FROM "TestSchema"."Employee" AS "T1"
      WHERE "T1"."name" IS NOT DISTINCT FROM 'Gildong Hong'
        AND "T1"."departmentId" IS NOT DISTINCT FROM 1
    ),
    updated AS (
      UPDATE "TestSchema"."Employee" AS "T1"
      SET "managerId" = 10
      WHERE "T1"."name" IS NOT DISTINCT FROM 'Gildong Hong'
        AND "T1"."departmentId" IS NOT DISTINCT FROM 1
      RETURNING *
    ),
    inserted AS (
      INSERT INTO "TestSchema"."Employee" ("name", "departmentId", "managerId")
      SELECT 'Gildong Hong', 1, 10
      WHERE NOT EXISTS (SELECT 1 FROM matched)
      RETURNING *
    )
    SELECT * FROM updated UNION ALL SELECT * FROM inserted
  `,
};

export const upsertPlainValues: ExpectedSql = {
  mysql: mysql`
    UPDATE \`TestDb\`.\`Employee\` AS \`T1\`
    SET \`T1\`.\`name\` = 'New Name'
    WHERE \`T1\`.\`id\` <=> 1;
    INSERT INTO \`TestDb\`.\`Employee\` (\`name\`, \`departmentId\`)
    SELECT 'New Name', 1
    WHERE NOT EXISTS (SELECT * FROM \`TestDb\`.\`Employee\` AS \`T1\` WHERE \`T1\`.\`id\` <=> 1)
  `,
  mssql: tsql`
    MERGE [TestDb].[TestSchema].[Employee] AS [T1]
    USING (SELECT 1 AS [_]) AS [_src]
    ON (([T1].[id] IS NULL AND 1 IS NULL) OR [T1].[id] = 1)
    WHEN MATCHED THEN
      UPDATE SET [name] = N'New Name'
    WHEN NOT MATCHED THEN
      INSERT ([name], [departmentId]) VALUES (N'New Name', 1);
  `,
  postgresql: pgsql`
    WITH matched AS (
      SELECT "T1".* FROM "TestSchema"."Employee" AS "T1"
      WHERE "T1"."id" IS NOT DISTINCT FROM 1
    ),
    updated AS (
      UPDATE "TestSchema"."Employee" AS "T1"
      SET "name" = 'New Name'
      WHERE "T1"."id" IS NOT DISTINCT FROM 1
      RETURNING *
    ),
    inserted AS (
      INSERT INTO "TestSchema"."Employee" ("name", "departmentId")
      SELECT 'New Name', 1
      WHERE NOT EXISTS (SELECT 1 FROM matched)
      RETURNING *
    )
    SELECT * FROM updated UNION ALL SELECT * FROM inserted
  `,
};

//#endregion
