import { TDialect } from "../../src/types/column-primitive";
import { mysql, pgsql, tsql } from "@simplysm/sd-core-common";

type ExpectedSql = Record<TDialect, string>;

// ============================================
// 기본 wrap (서브쿼리)
// ============================================
export const basicWrap: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`
    FROM (
      SELECT
        \`TBL\`.\`id\` as \`id\`,
        \`TBL\`.\`name\` as \`name\`,
        \`TBL\`.\`email\` as \`email\`,
        \`TBL\`.\`age\` as \`age\`,
        \`TBL\`.\`isActive\` as \`isActive\`,
        \`TBL\`.\`companyId\` as \`companyId\`,
        \`TBL\`.\`createdAt\` as \`createdAt\`
      FROM \`TestDb\`.\`User\` as \`TBL\`
    ) as \`TBL\`
  `,
  mssql: tsql`
    SELECT
      [TBL].[id] as [id],
      [TBL].[name] as [name],
      [TBL].[email] as [email],
      [TBL].[age] as [age],
      [TBL].[isActive] as [isActive],
      [TBL].[companyId] as [companyId],
      [TBL].[createdAt] as [createdAt]
    FROM (
      SELECT
        [TBL].[id] as [id],
        [TBL].[name] as [name],
        [TBL].[email] as [email],
        [TBL].[age] as [age],
        [TBL].[isActive] as [isActive],
        [TBL].[companyId] as [companyId],
        [TBL].[createdAt] as [createdAt]
      FROM [TestDb].[dbo].[User] as [TBL]
    ) as [TBL]
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."id" as "id",
      "TBL"."name" as "name",
      "TBL"."email" as "email",
      "TBL"."age" as "age",
      "TBL"."isActive" as "isActive",
      "TBL"."companyId" as "companyId",
      "TBL"."createdAt" as "createdAt"
    FROM (
      SELECT
        "TBL"."id" as "id",
        "TBL"."name" as "name",
        "TBL"."email" as "email",
        "TBL"."age" as "age",
        "TBL"."isActive" as "isActive",
        "TBL"."companyId" as "companyId",
        "TBL"."createdAt" as "createdAt"
      FROM "TestDb"."public"."User" as "TBL"
    ) as "TBL"
  `,
};

// ============================================
// wrap 후 where
// ============================================
export const wrapThenWhere: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`
    FROM (
      SELECT
        \`TBL\`.\`id\` as \`id\`,
        \`TBL\`.\`name\` as \`name\`,
        \`TBL\`.\`email\` as \`email\`,
        \`TBL\`.\`age\` as \`age\`,
        \`TBL\`.\`isActive\` as \`isActive\`,
        \`TBL\`.\`companyId\` as \`companyId\`,
        \`TBL\`.\`createdAt\` as \`createdAt\`
      FROM \`TestDb\`.\`User\` as \`TBL\`
      WHERE \`TBL\`.\`age\` > 20
    ) as \`TBL\`
    WHERE \`TBL\`.\`isActive\` = 1
  `,
  mssql: tsql`
    SELECT
      [TBL].[id] as [id],
      [TBL].[name] as [name],
      [TBL].[email] as [email],
      [TBL].[age] as [age],
      [TBL].[isActive] as [isActive],
      [TBL].[companyId] as [companyId],
      [TBL].[createdAt] as [createdAt]
    FROM (
      SELECT
        [TBL].[id] as [id],
        [TBL].[name] as [name],
        [TBL].[email] as [email],
        [TBL].[age] as [age],
        [TBL].[isActive] as [isActive],
        [TBL].[companyId] as [companyId],
        [TBL].[createdAt] as [createdAt]
      FROM [TestDb].[dbo].[User] as [TBL]
      WHERE [TBL].[age] > 20
    ) as [TBL]
    WHERE [TBL].[isActive] = 1
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."id" as "id",
      "TBL"."name" as "name",
      "TBL"."email" as "email",
      "TBL"."age" as "age",
      "TBL"."isActive" as "isActive",
      "TBL"."companyId" as "companyId",
      "TBL"."createdAt" as "createdAt"
    FROM (
      SELECT
        "TBL"."id" as "id",
        "TBL"."name" as "name",
        "TBL"."email" as "email",
        "TBL"."age" as "age",
        "TBL"."isActive" as "isActive",
        "TBL"."companyId" as "companyId",
        "TBL"."createdAt" as "createdAt"
      FROM "TestDb"."public"."User" as "TBL"
      WHERE "TBL"."age" > 20
    ) as "TBL"
    WHERE "TBL"."isActive" = TRUE
  `,
};

// ============================================
// wrap 후 select
// ============================================
export const wrapThenSelect: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`
    FROM (
      SELECT
        \`TBL\`.\`id\` as \`id\`,
        \`TBL\`.\`name\` as \`name\`,
        \`TBL\`.\`email\` as \`email\`,
        \`TBL\`.\`age\` as \`age\`,
        \`TBL\`.\`isActive\` as \`isActive\`,
        \`TBL\`.\`companyId\` as \`companyId\`,
        \`TBL\`.\`createdAt\` as \`createdAt\`
      FROM \`TestDb\`.\`User\` as \`TBL\`
    ) as \`TBL\`
  `,
  mssql: tsql`
    SELECT
      [TBL].[id] as [id],
      [TBL].[name] as [name]
    FROM (
      SELECT
        [TBL].[id] as [id],
        [TBL].[name] as [name],
        [TBL].[email] as [email],
        [TBL].[age] as [age],
        [TBL].[isActive] as [isActive],
        [TBL].[companyId] as [companyId],
        [TBL].[createdAt] as [createdAt]
      FROM [TestDb].[dbo].[User] as [TBL]
    ) as [TBL]
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."id" as "id",
      "TBL"."name" as "name"
    FROM (
      SELECT
        "TBL"."id" as "id",
        "TBL"."name" as "name",
        "TBL"."email" as "email",
        "TBL"."age" as "age",
        "TBL"."isActive" as "isActive",
        "TBL"."companyId" as "companyId",
        "TBL"."createdAt" as "createdAt"
      FROM "TestDb"."public"."User" as "TBL"
    ) as "TBL"
  `,
};

// ============================================
// wrap 후 orderBy, limit
// ============================================
export const wrapThenOrderByLimit: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`
    FROM (
      SELECT
        \`TBL\`.\`id\` as \`id\`,
        \`TBL\`.\`name\` as \`name\`,
        \`TBL\`.\`email\` as \`email\`,
        \`TBL\`.\`age\` as \`age\`,
        \`TBL\`.\`isActive\` as \`isActive\`,
        \`TBL\`.\`companyId\` as \`companyId\`,
        \`TBL\`.\`createdAt\` as \`createdAt\`
      FROM \`TestDb\`.\`User\` as \`TBL\`
      WHERE \`TBL\`.\`isActive\` = 1
    ) as \`TBL\`
    ORDER BY \`TBL\`.\`name\` ASC
    LIMIT 0, 10
  `,
  mssql: tsql`
    SELECT
      [TBL].[id] as [id],
      [TBL].[name] as [name],
      [TBL].[email] as [email],
      [TBL].[age] as [age],
      [TBL].[isActive] as [isActive],
      [TBL].[companyId] as [companyId],
      [TBL].[createdAt] as [createdAt]
    FROM (
      SELECT
        [TBL].[id] as [id],
        [TBL].[name] as [name],
        [TBL].[email] as [email],
        [TBL].[age] as [age],
        [TBL].[isActive] as [isActive],
        [TBL].[companyId] as [companyId],
        [TBL].[createdAt] as [createdAt]
      FROM [TestDb].[dbo].[User] as [TBL]
      WHERE [TBL].[isActive] = 1
    ) as [TBL]
    ORDER BY [TBL].[name] ASC
    OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."id" as "id",
      "TBL"."name" as "name",
      "TBL"."email" as "email",
      "TBL"."age" as "age",
      "TBL"."isActive" as "isActive",
      "TBL"."companyId" as "companyId",
      "TBL"."createdAt" as "createdAt"
    FROM (
      SELECT
        "TBL"."id" as "id",
        "TBL"."name" as "name",
        "TBL"."email" as "email",
        "TBL"."age" as "age",
        "TBL"."isActive" as "isActive",
        "TBL"."companyId" as "companyId",
        "TBL"."createdAt" as "createdAt"
      FROM "TestDb"."public"."User" as "TBL"
      WHERE "TBL"."isActive" = TRUE
    ) as "TBL"
    ORDER BY "TBL"."name" ASC
    LIMIT 10 OFFSET 0
  `,
};

// ============================================
// 기본 union
// ============================================
export const basicUnion: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`
    FROM (
      SELECT
        \`TBL\`.\`id\` as \`id\`,
        \`TBL\`.\`name\` as \`name\`,
        \`TBL\`.\`email\` as \`email\`,
        \`TBL\`.\`age\` as \`age\`,
        \`TBL\`.\`isActive\` as \`isActive\`,
        \`TBL\`.\`companyId\` as \`companyId\`,
        \`TBL\`.\`createdAt\` as \`createdAt\`
      FROM \`TestDb\`.\`User\` as \`TBL\`
      WHERE \`TBL\`.\`isActive\` = 1

      UNION ALL

      SELECT
        \`TBL\`.\`id\` as \`id\`,
        \`TBL\`.\`name\` as \`name\`,
        \`TBL\`.\`email\` as \`email\`,
        \`TBL\`.\`age\` as \`age\`,
        \`TBL\`.\`isActive\` as \`isActive\`,
        \`TBL\`.\`companyId\` as \`companyId\`,
        \`TBL\`.\`createdAt\` as \`createdAt\`
      FROM \`TestDb\`.\`User\` as \`TBL\`
      WHERE \`TBL\`.\`age\` > 30
    ) as \`TBL\`
  `,
  mssql: tsql`
    SELECT
      [TBL].[id] as [id],
      [TBL].[name] as [name],
      [TBL].[email] as [email],
      [TBL].[age] as [age],
      [TBL].[isActive] as [isActive],
      [TBL].[companyId] as [companyId],
      [TBL].[createdAt] as [createdAt]
    FROM (
      SELECT
        [TBL].[id] as [id],
        [TBL].[name] as [name],
        [TBL].[email] as [email],
        [TBL].[age] as [age],
        [TBL].[isActive] as [isActive],
        [TBL].[companyId] as [companyId],
        [TBL].[createdAt] as [createdAt]
      FROM [TestDb].[dbo].[User] as [TBL]
      WHERE [TBL].[isActive] = 1

      UNION ALL

      SELECT
        [TBL].[id] as [id],
        [TBL].[name] as [name],
        [TBL].[email] as [email],
        [TBL].[age] as [age],
        [TBL].[isActive] as [isActive],
        [TBL].[companyId] as [companyId],
        [TBL].[createdAt] as [createdAt]
      FROM [TestDb].[dbo].[User] as [TBL]
      WHERE [TBL].[age] > 30
    ) as [TBL]
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."id" as "id",
      "TBL"."name" as "name",
      "TBL"."email" as "email",
      "TBL"."age" as "age",
      "TBL"."isActive" as "isActive",
      "TBL"."companyId" as "companyId",
      "TBL"."createdAt" as "createdAt"
    FROM (
      SELECT
        "TBL"."id" as "id",
        "TBL"."name" as "name",
        "TBL"."email" as "email",
        "TBL"."age" as "age",
        "TBL"."isActive" as "isActive",
        "TBL"."companyId" as "companyId",
        "TBL"."createdAt" as "createdAt"
      FROM "TestDb"."public"."User" as "TBL"
      WHERE "TBL"."isActive" = TRUE

      UNION ALL

      SELECT
        "TBL"."id" as "id",
        "TBL"."name" as "name",
        "TBL"."email" as "email",
        "TBL"."age" as "age",
        "TBL"."isActive" as "isActive",
        "TBL"."companyId" as "companyId",
        "TBL"."createdAt" as "createdAt"
      FROM "TestDb"."public"."User" as "TBL"
      WHERE "TBL"."age" > 30
    ) as "TBL"
  `,
};

// ============================================
// union 후 wrap (중첩)
// ============================================
export const unionThenWrap: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`
    FROM (
      SELECT
        \`TBL\`.\`id\` as \`id\`,
        \`TBL\`.\`name\` as \`name\`,
        \`TBL\`.\`email\` as \`email\`,
        \`TBL\`.\`age\` as \`age\`,
        \`TBL\`.\`isActive\` as \`isActive\`,
        \`TBL\`.\`companyId\` as \`companyId\`,
        \`TBL\`.\`createdAt\` as \`createdAt\`
      FROM (
        SELECT
          \`TBL\`.\`id\` as \`id\`,
          \`TBL\`.\`name\` as \`name\`,
          \`TBL\`.\`email\` as \`email\`,
          \`TBL\`.\`age\` as \`age\`,
          \`TBL\`.\`isActive\` as \`isActive\`,
          \`TBL\`.\`companyId\` as \`companyId\`,
          \`TBL\`.\`createdAt\` as \`createdAt\`
        FROM \`TestDb\`.\`User\` as \`TBL\`
        WHERE \`TBL\`.\`isActive\` = 1

        UNION ALL

        SELECT
          \`TBL\`.\`id\` as \`id\`,
          \`TBL\`.\`name\` as \`name\`,
          \`TBL\`.\`email\` as \`email\`,
          \`TBL\`.\`age\` as \`age\`,
          \`TBL\`.\`isActive\` as \`isActive\`,
          \`TBL\`.\`companyId\` as \`companyId\`,
          \`TBL\`.\`createdAt\` as \`createdAt\`
        FROM \`TestDb\`.\`User\` as \`TBL\`
        WHERE \`TBL\`.\`age\` > 30
      ) as \`TBL\`
    ) as \`TBL\`
    ORDER BY \`TBL\`.\`name\` ASC
    LIMIT 0, 5
  `,
  mssql: tsql`
    SELECT
      [TBL].[id] as [id],
      [TBL].[name] as [name],
      [TBL].[email] as [email],
      [TBL].[age] as [age],
      [TBL].[isActive] as [isActive],
      [TBL].[companyId] as [companyId],
      [TBL].[createdAt] as [createdAt]
    FROM (
      SELECT
        [TBL].[id] as [id],
        [TBL].[name] as [name],
        [TBL].[email] as [email],
        [TBL].[age] as [age],
        [TBL].[isActive] as [isActive],
        [TBL].[companyId] as [companyId],
        [TBL].[createdAt] as [createdAt]
      FROM (
        SELECT
          [TBL].[id] as [id],
          [TBL].[name] as [name],
          [TBL].[email] as [email],
          [TBL].[age] as [age],
          [TBL].[isActive] as [isActive],
          [TBL].[companyId] as [companyId],
          [TBL].[createdAt] as [createdAt]
        FROM [TestDb].[dbo].[User] as [TBL]
        WHERE [TBL].[isActive] = 1

        UNION ALL

        SELECT
          [TBL].[id] as [id],
          [TBL].[name] as [name],
          [TBL].[email] as [email],
          [TBL].[age] as [age],
          [TBL].[isActive] as [isActive],
          [TBL].[companyId] as [companyId],
          [TBL].[createdAt] as [createdAt]
        FROM [TestDb].[dbo].[User] as [TBL]
        WHERE [TBL].[age] > 30
      ) as [TBL]
    ) as [TBL]
    ORDER BY [TBL].[name] ASC
    OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."id" as "id",
      "TBL"."name" as "name",
      "TBL"."email" as "email",
      "TBL"."age" as "age",
      "TBL"."isActive" as "isActive",
      "TBL"."companyId" as "companyId",
      "TBL"."createdAt" as "createdAt"
    FROM (
      SELECT
        "TBL"."id" as "id",
        "TBL"."name" as "name",
        "TBL"."email" as "email",
        "TBL"."age" as "age",
        "TBL"."isActive" as "isActive",
        "TBL"."companyId" as "companyId",
        "TBL"."createdAt" as "createdAt"
      FROM (
        SELECT
          "TBL"."id" as "id",
          "TBL"."name" as "name",
          "TBL"."email" as "email",
          "TBL"."age" as "age",
          "TBL"."isActive" as "isActive",
          "TBL"."companyId" as "companyId",
          "TBL"."createdAt" as "createdAt"
        FROM "TestDb"."public"."User" as "TBL"
        WHERE "TBL"."isActive" = TRUE

        UNION ALL

        SELECT
          "TBL"."id" as "id",
          "TBL"."name" as "name",
          "TBL"."email" as "email",
          "TBL"."age" as "age",
          "TBL"."isActive" as "isActive",
          "TBL"."companyId" as "companyId",
          "TBL"."createdAt" as "createdAt"
        FROM "TestDb"."public"."User" as "TBL"
        WHERE "TBL"."age" > 30
      ) as "TBL"
    ) as "TBL"
    ORDER BY "TBL"."name" ASC
    LIMIT 5 OFFSET 0
  `,
};
