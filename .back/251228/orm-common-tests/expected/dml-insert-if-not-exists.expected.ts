import { TDialect } from "../../src/types/column-primitive";
import { mysql, pgsql, tsql } from "@simplysm/sd-core-common";

type ExpectedSql = Record<TDialect, string>;

// ============================================
// 기본 INSERT IF NOT EXISTS
// ============================================
export const basicInsertIfNotExists: ExpectedSql = {
  mysql: mysql`
    USE \`TestDb\`;

    CREATE PROCEDURE \`SD_PROC\`()
    BEGIN

    IF NOT EXISTS (
      SELECT *
      FROM \`TestDb\`.\`User\` as \`TBL\`
      WHERE \`TBL\`.\`email\` = 'hong@test.com'
    ) THEN

    INSERT INTO \`TestDb\`.\`User\` (\`name\`, \`email\`)
    VALUES ('홍길동', 'hong@test.com');

    END IF;

    END;
    CALL \`SD_PROC\`;
    DROP PROCEDURE \`SD_PROC\`;
  `,
  mssql: tsql`
    MERGE [TestDb].[dbo].[User] as [TBL]
    USING (SELECT 0 as _using) as _using
    ON [TBL].[email] = N'hong@test.com'
    WHEN NOT MATCHED THEN
      INSERT ([name], [email])
      VALUES (N'홍길동', N'hong@test.com');
  `,
  postgresql: pgsql`
    INSERT INTO "TestDb"."public"."User" ("name", "email")
    SELECT '홍길동', 'hong@test.com'
    WHERE NOT EXISTS (
      SELECT 1 FROM "TestDb"."public"."User" as "TBL"
      WHERE "TBL"."email" = 'hong@test.com'
    );
  `,
};

// ============================================
// INSERT IF NOT EXISTS with OUTPUT
// ============================================
export const insertIfNotExistsWithOutput: ExpectedSql = {
  mysql: mysql`
    USE \`TestDb\`;

    CREATE PROCEDURE \`SD_PROC\`()
    BEGIN

    IF NOT EXISTS (
      SELECT *
      FROM \`TestDb\`.\`User\` as \`TBL\`
      WHERE \`TBL\`.\`email\` = 'hong@test.com'
    ) THEN

    INSERT INTO \`TestDb\`.\`User\` (\`name\`, \`email\`)
    VALUES ('홍길동', 'hong@test.com');

    SELECT \`id\`, \`createdAt\` FROM \`TestDb\`.\`User\` WHERE \`id\` = LAST_INSERT_ID();

    END IF;

    END;
    CALL \`SD_PROC\`;
    DROP PROCEDURE \`SD_PROC\`;
  `,
  mssql: tsql`
    MERGE [TestDb].[dbo].[User] as [TBL]
    USING (SELECT 0 as _using) as _using
    ON [TBL].[email] = N'hong@test.com'
    WHEN NOT MATCHED THEN
      INSERT ([name], [email])
      VALUES (N'홍길동', N'hong@test.com')
    OUTPUT INSERTED.[id], INSERTED.[createdAt];
  `,
  postgresql: pgsql`
    INSERT INTO "TestDb"."public"."User" ("name", "email")
    SELECT '홍길동', 'hong@test.com'
    WHERE NOT EXISTS (
      SELECT 1 FROM "TestDb"."public"."User" as "TBL"
      WHERE "TBL"."email" = 'hong@test.com'
    )
    RETURNING "id", "createdAt";
  `,
};

// ============================================
// INSERT IF NOT EXISTS with multiple conditions
// ============================================
export const insertIfNotExistsMultipleConditions: ExpectedSql = {
  mysql: mysql`
    USE \`TestDb\`;

    CREATE PROCEDURE \`SD_PROC\`()
    BEGIN

    IF NOT EXISTS (
      SELECT *
      FROM \`TestDb\`.\`User\` as \`TBL\`
      WHERE \`TBL\`.\`name\` = '홍길동' AND \`TBL\`.\`email\` = 'hong@test.com'
    ) THEN

    INSERT INTO \`TestDb\`.\`User\` (\`name\`, \`email\`, \`age\`)
    VALUES ('홍길동', 'hong@test.com', 30);

    END IF;

    END;
    CALL \`SD_PROC\`;
    DROP PROCEDURE \`SD_PROC\`;
  `,
  mssql: tsql`
    MERGE [TestDb].[dbo].[User] as [TBL]
    USING (SELECT 0 as _using) as _using
    ON [TBL].[name] = N'홍길동' AND [TBL].[email] = N'hong@test.com'
    WHEN NOT MATCHED THEN
      INSERT ([name], [email], [age])
      VALUES (N'홍길동', N'hong@test.com', 30);
  `,
  postgresql: pgsql`
    INSERT INTO "TestDb"."public"."User" ("name", "email", "age")
    SELECT '홍길동', 'hong@test.com', 30
    WHERE NOT EXISTS (
      SELECT 1 FROM "TestDb"."public"."User" as "TBL"
      WHERE "TBL"."name" = '홍길동' AND "TBL"."email" = 'hong@test.com'
    );
  `,
};
