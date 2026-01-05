import { TDialect } from "../../src/types/column-primitive";
import { mysql, pgsql, tsql } from "@simplysm/sd-core-common";

type ExpectedSql = Record<TDialect, string>;

// ============================================
// 기본 DELETE (전체 테이블)
// ============================================
export const basicDelete: ExpectedSql = {
  mysql: mysql`
    DELETE \`TBL\` FROM \`TestDb\`.\`User\` AS \`TBL\`;
  `,
  mssql: tsql`
    DELETE [TBL]
    FROM [TestDb].[dbo].[User] [TBL];
  `,
  postgresql: pgsql`
    DELETE FROM "TestDb"."public"."User" as "TBL";
  `,
};

// ============================================
// DELETE with WHERE
// ============================================
export const deleteWithWhere: ExpectedSql = {
  mysql: mysql`
    DELETE \`TBL\` FROM \`TestDb\`.\`User\` AS \`TBL\`
    WHERE \`TBL\`.\`id\` = 1;
  `,
  mssql: tsql`
    DELETE [TBL]
    FROM [TestDb].[dbo].[User] [TBL]
    WHERE [TBL].[id] = 1;
  `,
  postgresql: pgsql`
    DELETE FROM "TestDb"."public"."User" as "TBL"
    WHERE "TBL"."id" = 1;
  `,
};

// ============================================
// DELETE with 복수 WHERE 조건
// ============================================
export const deleteWithMultipleWhere: ExpectedSql = {
  mysql: mysql`
    DELETE \`TBL\` FROM \`TestDb\`.\`User\` AS \`TBL\`
    WHERE \`TBL\`.\`isActive\` = 0 AND \`TBL\`.\`age\` < 18;
  `,
  mssql: tsql`
    DELETE [TBL]
    FROM [TestDb].[dbo].[User] [TBL]
    WHERE [TBL].[isActive] = 0 AND [TBL].[age] < 18;
  `,
  postgresql: pgsql`
    DELETE FROM "TestDb"."public"."User" as "TBL"
    WHERE "TBL"."isActive" = FALSE AND "TBL"."age" < 18;
  `,
};

// ============================================
// DELETE with OUTPUT
// ============================================
export const deleteWithOutput: ExpectedSql = {
  mysql: mysql`
    USE \`TestDb\`;

    CREATE PROCEDURE \`SD_PROC\`()
    BEGIN

    CREATE TEMPORARY TABLE \`SD_TEMP\` AS
    SELECT \`id\`, \`name\` FROM \`TestDb\`.\`User\` as \`TBL\`
    WHERE \`TBL\`.\`id\` = 1;

    DELETE \`TBL\` FROM \`TestDb\`.\`User\` AS \`TBL\`
    WHERE \`TBL\`.\`id\` = 1;

    SELECT * FROM \`SD_TEMP\`;

    DROP TEMPORARY TABLE \`SD_TEMP\`;

    END;
    CALL \`SD_PROC\`;
    DROP PROCEDURE \`SD_PROC\`;
  `,
  mssql: tsql`
    DELETE [TBL]
    OUTPUT DELETED.[id], DELETED.[name]
    FROM [TestDb].[dbo].[User] [TBL]
    WHERE [TBL].[id] = 1;
  `,
  postgresql: pgsql`
    DELETE FROM "TestDb"."public"."User" as "TBL"
    WHERE "TBL"."id" = 1
    RETURNING "id", "name";
  `,
};

// ============================================
// DELETE with disableFkCheck
// ============================================
export const deleteWithDisableFkCheck: ExpectedSql = {
  mysql: mysql`
    USE \`TestDb\`;

    CREATE PROCEDURE \`SD_PROC\`()
    BEGIN

    SET FOREIGN_KEY_CHECKS = 0;

    DELETE \`TBL\` FROM \`TestDb\`.\`User\` AS \`TBL\`
    WHERE \`TBL\`.\`id\` = 1;

    SET FOREIGN_KEY_CHECKS = 1;

    END;
    CALL \`SD_PROC\`;
    DROP PROCEDURE \`SD_PROC\`;
  `,
  mssql: tsql`
    CREATE PROCEDURE [#SD_PROC]
    AS
    BEGIN

    ALTER TABLE [TestDb].[dbo].[User] NOCHECK CONSTRAINT ALL;

    DELETE [TBL]
    FROM [TestDb].[dbo].[User] [TBL]
    WHERE [TBL].[id] = 1;

    ALTER TABLE [TestDb].[dbo].[User] WITH CHECK CHECK CONSTRAINT ALL;

    END;
    EXEC [#SD_PROC];
    DROP PROCEDURE [#SD_PROC];
  `,
  postgresql: pgsql`
    DO $$
    BEGIN

    ALTER TABLE "TestDb"."public"."User" DISABLE TRIGGER ALL;

    DELETE FROM "TestDb"."public"."User" as "TBL"
    WHERE "TBL"."id" = 1;

    ALTER TABLE "TestDb"."public"."User" ENABLE TRIGGER ALL;

    END;
    $$;
  `,
};

// ============================================
// DELETE with JOIN + WHERE
// ============================================
export const deleteWithJoin: ExpectedSql = {
  mysql: mysql`
    DELETE \`TBL\`
    FROM \`TestDb\`.\`Post\` AS \`TBL\`
    LEFT OUTER JOIN \`TestDb\`.\`User\` as \`TBL.user\` ON \`TBL\`.\`userId\` IS NOT NULL AND \`TBL.user\`.\`id\` <=> \`TBL\`.\`userId\`
    WHERE \`TBL.user\`.\`isActive\` = 0;
  `,
  mssql: tsql`
    DELETE [TBL]
    FROM [TestDb].[dbo].[Post] [TBL]
    LEFT OUTER JOIN [TestDb].[dbo].[User] as [TBL.user] ON [TBL].[userId] IS NOT NULL AND (([TBL.user].[id] IS NULL AND [TBL].[userId] IS NULL) OR [TBL.user].[id] = [TBL].[userId])
    WHERE [TBL.user].[isActive] = 0;
  `,
  postgresql: pgsql`
    DELETE FROM "TestDb"."public"."Post" as "TBL"
    USING "TestDb"."public"."User" as "TBL.user"
    WHERE "TBL.user"."isActive" = FALSE
      AND "TBL"."userId" IS NOT NULL AND (("TBL.user"."id" IS NULL AND "TBL"."userId" IS NULL) OR "TBL.user"."id" = "TBL"."userId");
  `,
};

// ============================================
// TRUNCATE TABLE
// ============================================
export const truncateTable: ExpectedSql = {
  mysql: mysql`TRUNCATE TABLE \`TestDb\`.\`User\`;`,
  mssql: tsql`TRUNCATE TABLE [TestDb].[dbo].[User];`,
  postgresql: pgsql`TRUNCATE TABLE "TestDb"."public"."User";`,
};
