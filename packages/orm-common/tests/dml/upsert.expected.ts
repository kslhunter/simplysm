/**
 * UPSERT 테스트 Expected SQL
 */
import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

//#region ========== UPSERT - 기본 ==========

export const upsertSimple: ExpectedSql = {
  mysql: mysql`
    UPDATE \`TestDb\`.\`Employee\` AS \`T1\`
    SET \`T1\`.\`name\` = '새이름'
    WHERE \`T1\`.\`id\` <=> 1;
    INSERT INTO \`TestDb\`.\`Employee\` (\`name\`, \`departmentId\`)
    SELECT '새이름', 1
    WHERE NOT EXISTS (SELECT * FROM \`TestDb\`.\`Employee\` AS \`T1\` WHERE \`T1\`.\`id\` <=> 1)
  `,
  mssql: tsql`
    MERGE [TestDb].[TestSchema].[Employee] AS [T1]
    USING (SELECT 1 AS [_]) AS [_src]
    ON (([T1].[id] IS NULL AND 1 IS NULL) OR [T1].[id] = 1)
    WHEN MATCHED THEN
      UPDATE SET [name] = N'새이름'
    WHEN NOT MATCHED THEN
      INSERT ([name], [departmentId]) VALUES (N'새이름', 1);
  `,
  postgresql: pgsql`
    WITH matched AS (
      SELECT "T1".* FROM "TestSchema"."Employee" AS "T1"
      WHERE "T1"."id" IS NOT DISTINCT FROM 1
    ),
    updated AS (
      UPDATE "TestSchema"."Employee" AS "T1"
      SET "name" = '새이름'
      WHERE "T1"."id" IS NOT DISTINCT FROM 1
      RETURNING *
    ),
    inserted AS (
      INSERT INTO "TestSchema"."Employee" ("name", "departmentId")
      SELECT '새이름', 1
      WHERE NOT EXISTS (SELECT 1 FROM matched)
      RETURNING *
    )
    SELECT * FROM updated UNION ALL SELECT * FROM inserted
  `,
};

export const upsertReuse: ExpectedSql = {
  mysql: mysql`
    UPDATE \`TestDb\`.\`Employee\` AS \`T1\`
    SET \`T1\`.\`name\` = '홍길동', \`T1\`.\`departmentId\` = 2
    WHERE \`T1\`.\`id\` <=> 1;
    INSERT INTO \`TestDb\`.\`Employee\` (\`name\`, \`departmentId\`, \`managerId\`)
    SELECT '홍길동', 2, 100
    WHERE NOT EXISTS (SELECT * FROM \`TestDb\`.\`Employee\` AS \`T1\` WHERE \`T1\`.\`id\` <=> 1)
  `,
  mssql: tsql`
    MERGE [TestDb].[TestSchema].[Employee] AS [T1]
    USING (SELECT 1 AS [_]) AS [_src]
    ON (([T1].[id] IS NULL AND 1 IS NULL) OR [T1].[id] = 1)
    WHEN MATCHED THEN
      UPDATE SET [name] = N'홍길동', [departmentId] = 2
    WHEN NOT MATCHED THEN
      INSERT ([name], [departmentId], [managerId]) VALUES (N'홍길동', 2, 100);
  `,
  postgresql: pgsql`
    WITH matched AS (
      SELECT "T1".* FROM "TestSchema"."Employee" AS "T1"
      WHERE "T1"."id" IS NOT DISTINCT FROM 1
    ),
    updated AS (
      UPDATE "TestSchema"."Employee" AS "T1"
      SET "name" = '홍길동', "departmentId" = 2
      WHERE "T1"."id" IS NOT DISTINCT FROM 1
      RETURNING *
    ),
    inserted AS (
      INSERT INTO "TestSchema"."Employee" ("name", "departmentId", "managerId")
      SELECT '홍길동', 2, 100
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
    SET \`T1\`.\`name\` = '새이름'
    WHERE \`T1\`.\`id\` <=> 1;
    INSERT INTO \`TestDb\`.\`Employee\` (\`name\`)
    SELECT '새이름'
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
      UPDATE SET [name] = N'새이름'
    WHEN NOT MATCHED THEN
      INSERT ([name]) VALUES (N'새이름')
    OUTPUT INSERTED.[id], INSERTED.[name];
  `,
  postgresql: pgsql`
    WITH matched AS (
      SELECT "T1".* FROM "TestSchema"."Employee" AS "T1"
      WHERE "T1"."id" IS NOT DISTINCT FROM 1
    ),
    updated AS (
      UPDATE "TestSchema"."Employee" AS "T1"
      SET "name" = '새이름'
      WHERE "T1"."id" IS NOT DISTINCT FROM 1
      RETURNING "id", "name"
    ),
    inserted AS (
      INSERT INTO "TestSchema"."Employee" ("name")
      SELECT '새이름'
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
    WHERE \`T1\`.\`name\` <=> '홍길동' AND \`T1\`.\`departmentId\` <=> 1;
    INSERT INTO \`TestDb\`.\`Employee\` (\`name\`, \`departmentId\`, \`managerId\`)
    SELECT '홍길동', 1, 10
    WHERE NOT EXISTS (SELECT * FROM \`TestDb\`.\`Employee\` AS \`T1\` WHERE \`T1\`.\`name\` <=> '홍길동' AND \`T1\`.\`departmentId\` <=> 1)
  `,
  mssql: tsql`
    MERGE [TestDb].[TestSchema].[Employee] AS [T1]
    USING (SELECT 1 AS [_]) AS [_src]
    ON (([T1].[name] IS NULL AND N'홍길동' IS NULL) OR [T1].[name] = N'홍길동')
      AND (([T1].[departmentId] IS NULL AND 1 IS NULL) OR [T1].[departmentId] = 1)
    WHEN MATCHED THEN
      UPDATE SET [managerId] = 10
    WHEN NOT MATCHED THEN
      INSERT ([name], [departmentId], [managerId]) VALUES (N'홍길동', 1, 10);
  `,
  postgresql: pgsql`
    WITH matched AS (
      SELECT "T1".* FROM "TestSchema"."Employee" AS "T1"
      WHERE "T1"."name" IS NOT DISTINCT FROM '홍길동'
        AND "T1"."departmentId" IS NOT DISTINCT FROM 1
    ),
    updated AS (
      UPDATE "TestSchema"."Employee" AS "T1"
      SET "managerId" = 10
      WHERE "T1"."name" IS NOT DISTINCT FROM '홍길동'
        AND "T1"."departmentId" IS NOT DISTINCT FROM 1
      RETURNING *
    ),
    inserted AS (
      INSERT INTO "TestSchema"."Employee" ("name", "departmentId", "managerId")
      SELECT '홍길동', 1, 10
      WHERE NOT EXISTS (SELECT 1 FROM matched)
      RETURNING *
    )
    SELECT * FROM updated UNION ALL SELECT * FROM inserted
  `,
};

export const upsertPlainValues: ExpectedSql = {
  mysql: mysql`
    UPDATE \`TestDb\`.\`Employee\` AS \`T1\`
    SET \`T1\`.\`name\` = '새이름'
    WHERE \`T1\`.\`id\` <=> 1;
    INSERT INTO \`TestDb\`.\`Employee\` (\`name\`, \`departmentId\`)
    SELECT '새이름', 1
    WHERE NOT EXISTS (SELECT * FROM \`TestDb\`.\`Employee\` AS \`T1\` WHERE \`T1\`.\`id\` <=> 1)
  `,
  mssql: tsql`
    MERGE [TestDb].[TestSchema].[Employee] AS [T1]
    USING (SELECT 1 AS [_]) AS [_src]
    ON (([T1].[id] IS NULL AND 1 IS NULL) OR [T1].[id] = 1)
    WHEN MATCHED THEN
      UPDATE SET [name] = N'새이름'
    WHEN NOT MATCHED THEN
      INSERT ([name], [departmentId]) VALUES (N'새이름', 1);
  `,
  postgresql: pgsql`
    WITH matched AS (
      SELECT "T1".* FROM "TestSchema"."Employee" AS "T1"
      WHERE "T1"."id" IS NOT DISTINCT FROM 1
    ),
    updated AS (
      UPDATE "TestSchema"."Employee" AS "T1"
      SET "name" = '새이름'
      WHERE "T1"."id" IS NOT DISTINCT FROM 1
      RETURNING *
    ),
    inserted AS (
      INSERT INTO "TestSchema"."Employee" ("name", "departmentId")
      SELECT '새이름', 1
      WHERE NOT EXISTS (SELECT 1 FROM matched)
      RETURNING *
    )
    SELECT * FROM updated UNION ALL SELECT * FROM inserted
  `,
};

//#endregion
