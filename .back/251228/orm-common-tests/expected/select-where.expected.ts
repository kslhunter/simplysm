import { TDialect } from "../../src/types/column-primitive";
import { mysql, pgsql, tsql } from "@simplysm/sd-core-common";

type ExpectedSql = Record<TDialect, string>;

// ============================================
// eq - 같다
// ============================================
export const whereEq: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    WHERE \`TBL\`.\`id\` = 1
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
    FROM [TestDb].[dbo].[User] as [TBL]
    WHERE [TBL].[id] = 1
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
    FROM "TestDb"."public"."User" as "TBL"
    WHERE "TBL"."id" = 1
  `,
};

// ============================================
// notEq - 다르다
// ============================================
export const whereNotEq: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    WHERE \`TBL\`.\`id\` <> 1
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
    FROM [TestDb].[dbo].[User] as [TBL]
    WHERE ([TBL].[id] IS NULL OR [TBL].[id] <> 1)
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
    FROM "TestDb"."public"."User" as "TBL"
    WHERE ("TBL"."id" IS NULL OR "TBL"."id" <> 1)
  `,
};

// ============================================
// gt - 크다
// ============================================
export const whereGt: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    WHERE \`TBL\`.\`age\` > 18
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
    FROM [TestDb].[dbo].[User] as [TBL]
    WHERE [TBL].[age] > 18
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
    FROM "TestDb"."public"."User" as "TBL"
    WHERE "TBL"."age" > 18
  `,
};

// ============================================
// gte - 크거나 같다
// ============================================
export const whereGte: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    WHERE \`TBL\`.\`age\` >= 18
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
    FROM [TestDb].[dbo].[User] as [TBL]
    WHERE [TBL].[age] >= 18
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
    FROM "TestDb"."public"."User" as "TBL"
    WHERE "TBL"."age" >= 18
  `,
};

// ============================================
// lt - 작다
// ============================================
export const whereLt: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    WHERE \`TBL\`.\`age\` < 65
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
    FROM [TestDb].[dbo].[User] as [TBL]
    WHERE [TBL].[age] < 65
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
    FROM "TestDb"."public"."User" as "TBL"
    WHERE "TBL"."age" < 65
  `,
};

// ============================================
// lte - 작거나 같다
// ============================================
export const whereLte: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    WHERE \`TBL\`.\`age\` <= 65
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
    FROM [TestDb].[dbo].[User] as [TBL]
    WHERE [TBL].[age] <= 65
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
    FROM "TestDb"."public"."User" as "TBL"
    WHERE "TBL"."age" <= 65
  `,
};

// ============================================
// isNull
// ============================================
export const whereIsNull: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    WHERE \`TBL\`.\`email\` IS NULL
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
    FROM [TestDb].[dbo].[User] as [TBL]
    WHERE [TBL].[email] IS NULL
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
    FROM "TestDb"."public"."User" as "TBL"
    WHERE "TBL"."email" IS NULL
  `,
};

// ============================================
// isNotNull
// ============================================
export const whereIsNotNull: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    WHERE \`TBL\`.\`email\` IS NOT NULL
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
    FROM [TestDb].[dbo].[User] as [TBL]
    WHERE [TBL].[email] IS NOT NULL
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
    FROM "TestDb"."public"."User" as "TBL"
    WHERE "TBL"."email" IS NOT NULL
  `,
};

// ============================================
// like
// ============================================
export const whereLike: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    WHERE \`TBL\`.\`name\` LIKE '%kim%'
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
    FROM [TestDb].[dbo].[User] as [TBL]
    WHERE [TBL].[name] LIKE N'%kim%'
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
    FROM "TestDb"."public"."User" as "TBL"
    WHERE "TBL"."name" LIKE '%kim%'
  `,
};

// ============================================
// in
// ============================================
export const whereIn: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    WHERE \`TBL\`.\`id\` IN (1, 2, 3)
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
    FROM [TestDb].[dbo].[User] as [TBL]
    WHERE [TBL].[id] IN (1, 2, 3)
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
    FROM "TestDb"."public"."User" as "TBL"
    WHERE "TBL"."id" IN (1, 2, 3)
  `,
};

// ============================================
// notIn
// ============================================
export const whereNotIn: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    WHERE (\`TBL\`.\`id\` NOT IN (1, 2, 3) OR \`TBL\`.\`id\` IS NULL)
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
    FROM [TestDb].[dbo].[User] as [TBL]
    WHERE ([TBL].[id] NOT IN (1, 2, 3) OR [TBL].[id] IS NULL)
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
    FROM "TestDb"."public"."User" as "TBL"
    WHERE ("TBL"."id" NOT IN (1, 2, 3) OR "TBL"."id" IS NULL)
  `,
};

// ============================================
// between
// ============================================
export const whereBetween: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    WHERE \`TBL\`.\`age\` BETWEEN 18 AND 65
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
    FROM [TestDb].[dbo].[User] as [TBL]
    WHERE [TBL].[age] BETWEEN 18 AND 65
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
    FROM "TestDb"."public"."User" as "TBL"
    WHERE "TBL"."age" BETWEEN 18 AND 65
  `,
};

// ============================================
// and
// ============================================
export const whereAnd: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    WHERE (\`TBL\`.\`age\` >= 18 AND \`TBL\`.\`age\` <= 65)
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
    FROM [TestDb].[dbo].[User] as [TBL]
    WHERE ([TBL].[age] >= 18 AND [TBL].[age] <= 65)
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
    FROM "TestDb"."public"."User" as "TBL"
    WHERE ("TBL"."age" >= 18 AND "TBL"."age" <= 65)
  `,
};

// ============================================
// or
// ============================================
export const whereOr: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    WHERE (\`TBL\`.\`id\` = 1 OR \`TBL\`.\`id\` = 2)
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
    FROM [TestDb].[dbo].[User] as [TBL]
    WHERE ([TBL].[id] = 1 OR [TBL].[id] = 2)
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
    FROM "TestDb"."public"."User" as "TBL"
    WHERE ("TBL"."id" = 1 OR "TBL"."id" = 2)
  `,
};

// ============================================
// 다중 where 체이닝
// ============================================
export const whereChained: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    WHERE \`TBL\`.\`age\` >= 18 AND \`TBL\`.\`email\` IS NOT NULL
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
    FROM [TestDb].[dbo].[User] as [TBL]
    WHERE [TBL].[age] >= 18 AND [TBL].[email] IS NOT NULL
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
    FROM "TestDb"."public"."User" as "TBL"
    WHERE "TBL"."age" >= 18 AND "TBL"."email" IS NOT NULL
  `,
};
