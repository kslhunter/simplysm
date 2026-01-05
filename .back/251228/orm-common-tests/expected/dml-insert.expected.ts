import { TDialect } from "../../src/types/column-primitive";
import { mysql, pgsql, tsql } from "@simplysm/sd-core-common";

type ExpectedSql = Record<TDialect, string>;

// ============================================
// 단일 레코드 INSERT
// ============================================
export const singleInsert: ExpectedSql = {
  mysql: mysql`
    INSERT INTO \`TestDb\`.\`User\` (\`name\`, \`email\`, \`age\`, \`isActive\`)
    VALUES
      ('홍길동', 'hong@test.com', 30, 1);
  `,
  mssql: tsql`
    INSERT INTO [TestDb].[dbo].[User] ([name], [email], [age], [isActive])
    VALUES
      (N'홍길동', N'hong@test.com', 30, 1);
  `,
  postgresql: pgsql`
    INSERT INTO "TestDb"."public"."User" ("name", "email", "age", "isActive")
    VALUES
      ('홍길동', 'hong@test.com', 30, TRUE);
  `,
};

// ============================================
// 배치 INSERT (3개 레코드)
// ============================================
export const batchInsert: ExpectedSql = {
  mysql: mysql`
    INSERT INTO \`TestDb\`.\`User\` (\`name\`, \`email\`)
    VALUES
      ('홍길동', 'hong@test.com'),
      ('김철수', 'kim@test.com'),
      ('이영희', 'lee@test.com');
  `,
  mssql: tsql`
    INSERT INTO [TestDb].[dbo].[User] ([name], [email])
    VALUES
      (N'홍길동', N'hong@test.com'),
      (N'김철수', N'kim@test.com'),
      (N'이영희', N'lee@test.com');
  `,
  postgresql: pgsql`
    INSERT INTO "TestDb"."public"."User" ("name", "email")
    VALUES
      ('홍길동', 'hong@test.com'),
      ('김철수', 'kim@test.com'),
      ('이영희', 'lee@test.com');
  `,
};

// ============================================
// INSERT with NULL
// ============================================
export const insertWithNull: ExpectedSql = {
  mysql: mysql`
    INSERT INTO \`TestDb\`.\`User\` (\`name\`, \`age\`, \`isActive\`)
    VALUES
      ('홍길동', NULL, 1);
  `,
  mssql: tsql`
    INSERT INTO [TestDb].[dbo].[User] ([name], [age], [isActive])
    VALUES 
      (N'홍길동', NULL, 1);
  `,
  postgresql: pgsql`
    INSERT INTO "TestDb"."public"."User" ("name", "age", "isActive")
    VALUES
      ('홍길동', NULL, TRUE);
  `,
};

// ============================================
// INSERT with OUTPUT (단일 레코드)
// ============================================
export const insertWithOutputSingle: ExpectedSql = {
  mysql: mysql`
    USE \`TestDb\`;

    CREATE PROCEDURE \`SD_PROC\`()
    BEGIN

      INSERT INTO \`TestDb\`.\`User\` (\`name\`, \`email\`)
      VALUES ('홍길동', 'hong@test.com');

      SELECT \`id\`, \`createdAt\` FROM \`TestDb\`.\`User\` WHERE \`id\` = LAST_INSERT_ID();

    END;
    CALL \`SD_PROC\`;
    DROP PROCEDURE \`SD_PROC\`;
  `,
  mssql: tsql`
    INSERT INTO [TestDb].[dbo].[User] ([name], [email])
    OUTPUT INSERTED.[id], INSERTED.[createdAt]
    VALUES
      (N'홍길동', N'hong@test.com');
  `,
  postgresql: pgsql`
    INSERT INTO "TestDb"."public"."User" ("name", "email")
    VALUES
      ('홍길동', 'hong@test.com')
    RETURNING "id", "createdAt";
  `,
};

// ============================================
// INSERT with OUTPUT (배치) - MySQL은 개별 INSERT 반복
// ============================================
export const insertWithOutputBatch: ExpectedSql = {
  mysql: mysql`
    USE \`TestDb\`;

    CREATE PROCEDURE \`SD_PROC\`()
    BEGIN

      INSERT INTO \`TestDb\`.\`User\` (\`name\`, \`email\`)
      VALUES ('홍길동', 'hong@test.com');

      SELECT \`id\`, \`createdAt\` FROM \`TestDb\`.\`User\` WHERE \`id\` = LAST_INSERT_ID();

      INSERT INTO \`TestDb\`.\`User\` (\`name\`, \`email\`)
      VALUES ('김철수', 'kim@test.com');

      SELECT \`id\`, \`createdAt\` FROM \`TestDb\`.\`User\` WHERE \`id\` = LAST_INSERT_ID();

    END;
    CALL \`SD_PROC\`;
    DROP PROCEDURE \`SD_PROC\`;
  `,
  mssql: tsql`
    INSERT INTO [TestDb].[dbo].[User] ([name], [email])
    OUTPUT INSERTED.[id], INSERTED.[createdAt]
    VALUES
      (N'홍길동', N'hong@test.com'),
      (N'김철수', N'kim@test.com');
  `,
  postgresql: pgsql`
    INSERT INTO "TestDb"."public"."User" ("name", "email")
    VALUES
      ('홍길동', 'hong@test.com'),
      ('김철수', 'kim@test.com')
    RETURNING "id", "createdAt";
  `,
};

// ============================================
// INSERT INTO SELECT
// ============================================
export const insertIntoSelect: ExpectedSql = {
  mysql: mysql`
    INSERT INTO \`TestDb\`.\`UserBackup\` (\`name\`, \`email\`)
    SELECT
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    WHERE \`TBL\`.\`isActive\` = 1;
  `,
  mssql: tsql`
    INSERT INTO [TestDb].[dbo].[UserBackup] ([name], [email])
    SELECT
      [TBL].[name] as [name],
      [TBL].[email] as [email]
    FROM [TestDb].[dbo].[User] as [TBL]
    WHERE [TBL].[isActive] = 1;
  `,
  postgresql: pgsql`
    INSERT INTO "TestDb"."public"."UserBackup" ("name", "email")
    SELECT
      "TBL"."name" as "name",
      "TBL"."email" as "email"
    FROM "TestDb"."public"."User" as "TBL"
    WHERE "TBL"."isActive" = TRUE;
  `,
};

// ============================================
// INSERT INTO with stopAutoIdentity (MSSQL only)
// ============================================
export const insertIntoWithStopAutoIdentity: ExpectedSql = {
  mysql: mysql`
    INSERT INTO \`TestDb\`.\`UserBackup\` (\`id\`, \`name\`, \`email\`)
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    WHERE \`TBL\`.\`isActive\` = 1;
  `,
  mssql: tsql`
    CREATE PROCEDURE [#SD_PROC]
    AS
    BEGIN

      SET IDENTITY_INSERT [TestDb].[dbo].[UserBackup] ON;

      INSERT INTO [TestDb].[dbo].[UserBackup] ([id], [name], [email])
      SELECT
        [TBL].[id] as [id],
        [TBL].[name] as [name],
        [TBL].[email] as [email]
      FROM [TestDb].[dbo].[User] as [TBL]
      WHERE [TBL].[isActive] = 1;

      SET IDENTITY_INSERT [TestDb].[dbo].[UserBackup] OFF;

    END;
    EXEC [#SD_PROC];
    DROP PROCEDURE [#SD_PROC];
  `,
  postgresql: pgsql`
    INSERT INTO "TestDb"."public"."UserBackup" ("id", "name", "email")
    SELECT
      "TBL"."id" as "id",
      "TBL"."name" as "name",
      "TBL"."email" as "email"
    FROM "TestDb"."public"."User" as "TBL"
    WHERE "TBL"."isActive" = TRUE;
  `,
};

// ============================================
// INSERT with expression
// ============================================
export const insertWithExpression: ExpectedSql = {
  mysql: mysql`
    INSERT INTO \`TestDb\`.\`User\` (\`name\`, \`email\`)
    VALUES
      (UPPER('hong'), CONCAT(IFNULL('user', ''), IFNULL('@test.com', '')));
  `,
  mssql: tsql`
    INSERT INTO [TestDb].[dbo].[User] ([name], [email])
    VALUES
      (UPPER(N'hong'), ISNULL(N'user', N'') + ISNULL(N'@test.com', N''));
  `,
  postgresql: pgsql`
    INSERT INTO "TestDb"."public"."User" ("name", "email")
    VALUES
      (UPPER('hong'), COALESCE('user', '') || COALESCE('@test.com', ''));
  `,
};

// ============================================
// INSERT with disableFkCheck
// ============================================
export const insertWithDisableFkCheck: ExpectedSql = {
  mysql: mysql`
    USE \`TestDb\`;

    CREATE PROCEDURE \`SD_PROC\`()
    BEGIN

      SET FOREIGN_KEY_CHECKS = 0;

      INSERT INTO \`TestDb\`.\`Order\` (\`userId\`, \`amount\`)
      VALUES
        (999, 10000);

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

      INSERT INTO [TestDb].[dbo].[Order] ([userId], [amount])
      VALUES
        (999, 10000);

      ALTER TABLE [TestDb].[dbo].[Order] WITH CHECK CHECK CONSTRAINT ALL;

    END;
    EXEC [#SD_PROC];
    DROP PROCEDURE [#SD_PROC];
  `,
  postgresql: pgsql`
    DO $$
    BEGIN

      ALTER TABLE "TestDb"."public"."Order" DISABLE TRIGGER ALL;

      INSERT INTO "TestDb"."public"."Order" ("userId", "amount")
      VALUES
        (999, 10000);

      ALTER TABLE "TestDb"."public"."Order" ENABLE TRIGGER ALL;

    END;
    $$;
  `,
};
