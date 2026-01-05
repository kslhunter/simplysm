import { TDialect } from "../../src/types/column-primitive";
import { mysql, pgsql, tsql } from "@simplysm/sd-core-common";

type ExpectedSql = Record<TDialect, string>;

// ============================================
// 기본 UPDATE (전체 테이블)
// ============================================
export const basicUpdate: ExpectedSql = {
  mysql: mysql`
    UPDATE \`TestDb\`.\`User\` as \`TBL\`
    SET
      \`TBL\`.\`isActive\` = 0;
  `,
  mssql: tsql`
    UPDATE [TBL]
    SET
      [TBL].[isActive] = 0
    FROM [TestDb].[dbo].[User] as [TBL];
  `,
  postgresql: pgsql`
    UPDATE "TestDb"."public"."User" as "TBL"
    SET
      "isActive" = FALSE;
  `,
};

// ============================================
// UPDATE with WHERE
// ============================================
export const updateWithWhere: ExpectedSql = {
  mysql: mysql`
    UPDATE \`TestDb\`.\`User\` as \`TBL\`
    SET
      \`TBL\`.\`name\` = '김철수',
      \`TBL\`.\`email\` = 'kim@test.com'
    WHERE \`TBL\`.\`id\` = 1;
  `,
  mssql: tsql`
    UPDATE [TBL]
    SET
      [TBL].[name] = N'김철수',
      [TBL].[email] = N'kim@test.com'
    FROM [TestDb].[dbo].[User] as [TBL]
    WHERE [TBL].[id] = 1;
  `,
  postgresql: pgsql`
    UPDATE "TestDb"."public"."User" as "TBL"
    SET
      "name" = '김철수',
      "email" = 'kim@test.com'
    WHERE "TBL"."id" = 1;
  `,
};

// ============================================
// UPDATE with NULL (undefined는 제외, null은 NULL)
// ============================================
export const updateWithNull: ExpectedSql = {
  mysql: mysql`
    UPDATE \`TestDb\`.\`User\` as \`TBL\`
    SET
      \`TBL\`.\`name\` = '홍길동',
      \`TBL\`.\`age\` = NULL
    WHERE \`TBL\`.\`id\` = 1;
  `,
  mssql: tsql`
    UPDATE [TBL]
    SET
      [TBL].[name] = N'홍길동',
      [TBL].[age] = NULL
    FROM [TestDb].[dbo].[User] as [TBL]
    WHERE [TBL].[id] = 1;
  `,
  postgresql: pgsql`
    UPDATE "TestDb"."public"."User" as "TBL"
    SET
      "name" = '홍길동',
      "age" = NULL
    WHERE "TBL"."id" = 1;
  `,
};

// ============================================
// UPDATE with PrevValue
// ============================================
export const updateWithPrevValue: ExpectedSql = {
  mysql: mysql`
    UPDATE \`TestDb\`.\`User\` as \`TBL\`
    SET
      \`TBL\`.\`age\` = \`TBL\`.\`age\` + 3
    WHERE \`TBL\`.\`id\` = 1;
  `,
  mssql: tsql`
    UPDATE [TBL]
    SET
      [TBL].[age] = [TBL].[age] + 3
    FROM [TestDb].[dbo].[User] as [TBL]
    WHERE [TBL].[id] = 1;
  `,
  postgresql: pgsql`
    UPDATE "TestDb"."public"."User" as "TBL"
    SET
      "age" = "TBL"."age" + 3
    WHERE "TBL"."id" = 1;
  `,
};

// ============================================
// UPDATE with OUTPUT
// ============================================
export const updateWithOutput: ExpectedSql = {
  mysql: mysql`
    USE \`TestDb\`;

    CREATE PROCEDURE \`SD_PROC\`()
    BEGIN

      UPDATE \`TestDb\`.\`User\` as \`TBL\`
      SET
        \`TBL\`.\`name\` = '홍길동'
      WHERE \`TBL\`.\`id\` = 1;

      SELECT \`id\`, \`name\` FROM \`TestDb\`.\`User\` as \`TBL\`
      WHERE \`TBL\`.\`id\` = 1;

    END;
    CALL \`SD_PROC\`;
    DROP PROCEDURE \`SD_PROC\`;
  `,
  mssql: tsql`
    UPDATE [TBL]
    SET
      [TBL].[name] = N'홍길동'
    OUTPUT INSERTED.[id], INSERTED.[name]
    FROM [TestDb].[dbo].[User] as [TBL]
    WHERE [TBL].[id] = 1;
  `,
  postgresql: pgsql`
    UPDATE "TestDb"."public"."User" as "TBL"
    SET
      "name" = '홍길동'
    WHERE "TBL"."id" = 1
    RETURNING "id", "name";
  `,
};

// ============================================
// UPDATE with disableFkCheck
// ============================================
export const updateWithDisableFkCheck: ExpectedSql = {
  mysql: mysql`
    USE \`TestDb\`;

    CREATE PROCEDURE \`SD_PROC\`()
    BEGIN

      SET FOREIGN_KEY_CHECKS = 0;

      UPDATE \`TestDb\`.\`Order\` as \`TBL\`
      SET
        \`TBL\`.\`userId\` = 999
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

      ALTER TABLE [TestDb].[dbo].[Order] NOCHECK CONSTRAINT ALL;

      UPDATE [TBL]
      SET
        [TBL].[userId] = 999
      FROM [TestDb].[dbo].[Order] as [TBL]
      WHERE [TBL].[id] = 1;

      ALTER TABLE [TestDb].[dbo].[Order] WITH CHECK CHECK CONSTRAINT ALL;

    END;
    EXEC [#SD_PROC];
    DROP PROCEDURE [#SD_PROC];
  `,
  postgresql: pgsql`
    DO $$
    BEGIN

      ALTER TABLE "TestDb"."public"."Order" DISABLE TRIGGER ALL;

      UPDATE "TestDb"."public"."Order" as "TBL"
      SET
        "userId" = 999
      WHERE "TBL"."id" = 1;

      ALTER TABLE "TestDb"."public"."Order" ENABLE TRIGGER ALL;

    END;
    $$;
  `,
};

// ============================================
// UPDATE with JOIN + WHERE
// ============================================
export const updateWithJoin: ExpectedSql = {
  mysql: mysql`
    UPDATE \`TestDb\`.\`Post\` as \`TBL\`
    LEFT OUTER JOIN \`TestDb\`.\`User\` as \`TBL.user\` ON \`TBL\`.\`userId\` IS NOT NULL AND \`TBL.user\`.\`id\` <=> \`TBL\`.\`userId\`
    SET
      \`TBL\`.\`viewCount\` = 0
    WHERE \`TBL.user\`.\`isActive\` = 0;
  `,
  mssql: tsql`
    UPDATE [TBL]
    SET
      [TBL].[viewCount] = 0
    FROM [TestDb].[dbo].[Post] as [TBL]
    LEFT OUTER JOIN [TestDb].[dbo].[User] as [TBL.user] ON [TBL].[userId] IS NOT NULL AND (([TBL.user].[id] IS NULL AND [TBL].[userId] IS NULL) OR [TBL.user].[id] = [TBL].[userId])
    WHERE [TBL.user].[isActive] = 0;
  `,
  postgresql: pgsql`
    UPDATE "TestDb"."public"."Post" as "TBL"
    SET
      "viewCount" = 0
    FROM "TestDb"."public"."User" as "TBL.user"
    WHERE "TBL.user"."isActive" = FALSE
      AND "TBL"."userId" IS NOT NULL AND (("TBL.user"."id" IS NULL AND "TBL"."userId" IS NULL) OR "TBL.user"."id" = "TBL"."userId");
  `,
};

// ============================================
// UPDATE with 복수 WHERE
// ============================================
export const updateWithMultipleWhere: ExpectedSql = {
  mysql: mysql`
    UPDATE \`TestDb\`.\`User\` as \`TBL\`
    SET
      \`TBL\`.\`isActive\` = 0
    WHERE \`TBL\`.\`isActive\` = 1 AND \`TBL\`.\`age\` >= 18;
  `,
  mssql: tsql`
    UPDATE [TBL]
    SET
      [TBL].[isActive] = 0
    FROM [TestDb].[dbo].[User] as [TBL]
    WHERE [TBL].[isActive] = 1 AND [TBL].[age] >= 18;
  `,
  postgresql: pgsql`
    UPDATE "TestDb"."public"."User" as "TBL"
    SET
      "isActive" = FALSE
    WHERE "TBL"."isActive" = TRUE AND "TBL"."age" >= 18;
  `,
};
