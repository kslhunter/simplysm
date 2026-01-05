import { TDialect } from "../../src/types/column-primitive";
import { mysql, pgsql, tsql } from "@simplysm/sd-core-common";

type ExpectedSql = Record<TDialect, string>;

// ============================================
// 기본 UPSERT (동일 레코드로 update/insert)
// ============================================
export const upsertBasic: ExpectedSql = {
  mysql: mysql`
    USE \`TestDb\`;

    CREATE PROCEDURE \`SD_PROC\`()
    proc_label:BEGIN

    IF EXISTS (
      SELECT *
      FROM \`TestDb\`.\`User\` as \`TBL\`
      WHERE \`TBL\`.\`id\` = 1
    ) THEN

    UPDATE \`TestDb\`.\`User\` as \`TBL\`
    SET
      \`TBL\`.\`name\` = '홍길동',
      \`TBL\`.\`email\` = 'hong@test.com'
    WHERE \`TBL\`.\`id\` = 1;

    ELSE

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
    ON [TBL].[id] = 1
    WHEN MATCHED THEN
      UPDATE SET
        [name] = N'홍길동',
        [email] = N'hong@test.com'
    WHEN NOT MATCHED THEN
      INSERT ([name], [email])
      VALUES (N'홍길동', N'hong@test.com');
  `,
  postgresql: pgsql`
    INSERT INTO "TestDb"."public"."User" ("name", "email")
    VALUES ('홍길동', 'hong@test.com')
    ON CONFLICT ("id") DO UPDATE SET
      "name" = '홍길동',
      "email" = 'hong@test.com';
  `,
};

// ============================================
// UPSERT with 별도 update/insert 레코드
// ============================================
export const upsertDifferentRecords: ExpectedSql = {
  mysql: mysql`
    USE \`TestDb\`;

    CREATE PROCEDURE \`SD_PROC\`()
    proc_label:BEGIN

    IF EXISTS (
      SELECT *
      FROM \`TestDb\`.\`User\` as \`TBL\`
      WHERE \`TBL\`.\`id\` = 1
    ) THEN

    UPDATE \`TestDb\`.\`User\` as \`TBL\`
    SET
      \`TBL\`.\`name\` = '업데이트됨'
    WHERE \`TBL\`.\`id\` = 1;

    ELSE

    INSERT INTO \`TestDb\`.\`User\` (\`name\`, \`email\`)
    VALUES ('신규', 'new@test.com');

    END IF;

    END;

    CALL \`SD_PROC\`;

    DROP PROCEDURE \`SD_PROC\`;
  `,
  mssql: tsql`
    MERGE [TestDb].[dbo].[User] as [TBL]
    USING (SELECT 0 as _using) as _using
    ON [TBL].[id] = 1
    WHEN MATCHED THEN
      UPDATE SET
        [name] = N'업데이트됨'
    WHEN NOT MATCHED THEN
      INSERT ([name], [email])
      VALUES (N'신규', N'new@test.com');
  `,
  postgresql: pgsql`
    INSERT INTO "TestDb"."public"."User" ("name", "email")
    VALUES ('신규', 'new@test.com')
    ON CONFLICT ("id") DO UPDATE SET
      "name" = '업데이트됨';
  `,
};

// ============================================
// UPSERT with OUTPUT
// ============================================
export const upsertWithOutput: ExpectedSql = {
  mysql: mysql`
    USE \`TestDb\`;

    CREATE PROCEDURE \`SD_PROC\`()
    proc_label:BEGIN

    IF EXISTS (
      SELECT *
      FROM \`TestDb\`.\`User\` as \`TBL\`
      WHERE \`TBL\`.\`id\` = 1
    ) THEN

    UPDATE \`TestDb\`.\`User\` as \`TBL\`
    SET
      \`TBL\`.\`name\` = '홍길동'
    WHERE \`TBL\`.\`id\` = 1;

    SELECT *
    FROM \`TestDb\`.\`User\` as \`TBL\`
    WHERE \`TBL\`.\`id\` = 1;

    ELSE

    INSERT INTO \`TestDb\`.\`User\` (\`name\`, \`email\`)
    VALUES ('홍길동', 'hong@test.com');

    SELECT *
    FROM \`TestDb\`.\`User\` as \`TBL\`
    WHERE \`TBL\`.\`id\` = LAST_INSERT_ID();

    END IF;

    END;

    CALL \`SD_PROC\`;

    DROP PROCEDURE \`SD_PROC\`;
  `,
  mssql: tsql`
    MERGE [TestDb].[dbo].[User] as [TBL]
    USING (SELECT 0 as _using) as _using
    ON [TBL].[id] = 1
    WHEN MATCHED THEN
      UPDATE SET
        [name] = N'홍길동'
    WHEN NOT MATCHED THEN
      INSERT ([name], [email])
      VALUES (N'홍길동', N'hong@test.com')
    OUTPUT INSERTED.[id], INSERTED.[createdAt];
  `,
  postgresql: pgsql`
    INSERT INTO "TestDb"."public"."User" ("name", "email")
    VALUES ('홍길동', 'hong@test.com')
    ON CONFLICT ("id") DO UPDATE SET
      "name" = '홍길동'
    RETURNING "id", "createdAt";
  `,
};

// ============================================
// UPSERT - INSERT만 (빈 updateRecord)
// ============================================
export const upsertInsertOnly: ExpectedSql = {
  mysql: mysql`
    USE \`TestDb\`;

    CREATE PROCEDURE \`SD_PROC\`()
    proc_label:BEGIN

    IF EXISTS (
      SELECT *
      FROM \`TestDb\`.\`User\` as \`TBL\`
      WHERE \`TBL\`.\`id\` = 1
    ) THEN

    LEAVE proc_label;

    ELSE

    INSERT INTO \`TestDb\`.\`User\` (\`name\`, \`email\`)
    VALUES ('신규', 'new@test.com');

    END IF;

    END;

    CALL \`SD_PROC\`;

    DROP PROCEDURE \`SD_PROC\`;
  `,
  mssql: tsql`
    MERGE [TestDb].[dbo].[User] as [TBL]
    USING (SELECT 0 as _using) as _using
    ON [TBL].[id] = 1
    WHEN NOT MATCHED THEN
      INSERT ([name], [email])
      VALUES (N'신규', N'new@test.com');
  `,
  postgresql: pgsql`
    INSERT INTO "TestDb"."public"."User" ("name", "email")
    VALUES ('신규', 'new@test.com')
    ON CONFLICT ("id") DO NOTHING;
  `,
};
