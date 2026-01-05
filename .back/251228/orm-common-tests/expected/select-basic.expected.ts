import { TDialect } from "../../src/types/column-primitive";
import { mysql, pgsql, tsql } from "@simplysm/sd-core-common";

type ExpectedSql = Record<TDialect, string>;

// ============================================
// 전체 컬럼 SELECT
// ============================================
export const selectAll: ExpectedSql = {
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
  `,
};

// ============================================
// 특정 컬럼만 SELECT
// ============================================
export const selectSpecific: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
  `,
  mssql: tsql`
    SELECT
      [TBL].[id] as [id],
      [TBL].[name] as [name]
    FROM [TestDb].[dbo].[User] as [TBL]
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."id" as "id",
      "TBL"."name" as "name"
    FROM "TestDb"."public"."User" as "TBL"
  `,
};

// ============================================
// 컬럼 alias 변경
// ============================================
export const selectAlias: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`userId\`,
      \`TBL\`.\`name\` as \`userName\`,
      \`TBL\`.\`email\` as \`userEmail\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
  `,
  mssql: tsql`
    SELECT
      [TBL].[id] as [userId],
      [TBL].[name] as [userName],
      [TBL].[email] as [userEmail]
    FROM [TestDb].[dbo].[User] as [TBL]
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."id" as "userId",
      "TBL"."name" as "userName",
      "TBL"."email" as "userEmail"
    FROM "TestDb"."public"."User" as "TBL"
  `,
};

// ============================================
// 계산된 컬럼 SELECT
// ============================================
export const selectComputed: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      CHAR_LENGTH(\`TBL\`.\`name\`) as \`nameLength\`,
      UPPER(\`TBL\`.\`name\`) as \`upperName\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
  `,
  mssql: tsql`
    SELECT
      [TBL].[id] as [id],
      [TBL].[name] as [name],
      LEN([TBL].[name]) as [nameLength],
      UPPER([TBL].[name]) as [upperName]
    FROM [TestDb].[dbo].[User] as [TBL]
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."id" as "id",
      "TBL"."name" as "name",
      LENGTH("TBL"."name") as "nameLength",
      UPPER("TBL"."name") as "upperName"
    FROM "TestDb"."public"."User" as "TBL"
  `,
};

// ============================================
// 고정값 포함 SELECT
// ============================================
export const selectFixedValues: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      'hello' as \`fixedString\`,
      100 as \`fixedNumber\`,
      1 as \`fixedBool\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
  `,
  mssql: tsql`
    SELECT
      [TBL].[id] as [id],
      [TBL].[name] as [name],
      N'hello' as [fixedString],
      100 as [fixedNumber],
      1 as [fixedBool]
    FROM [TestDb].[dbo].[User] as [TBL]
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."id" as "id",
      "TBL"."name" as "name",
      'hello' as "fixedString",
      100 as "fixedNumber",
      TRUE as "fixedBool"
    FROM "TestDb"."public"."User" as "TBL"
  `,
};

// ============================================
// DISTINCT
// ============================================
export const distinct: ExpectedSql = {
  mysql: mysql`
    SELECT DISTINCT
      \`TBL\`.\`name\` as \`name\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
  `,
  mssql: tsql`
    SELECT DISTINCT
      [TBL].[name] as [name]
    FROM [TestDb].[dbo].[User] as [TBL]
  `,
  postgresql: pgsql`
    SELECT DISTINCT
      "TBL"."name" as "name"
    FROM "TestDb"."public"."User" as "TBL"
  `,
};

// ============================================
// TOP 10
// ============================================
export const top: ExpectedSql = {
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
    LIMIT 10
  `,
  mssql: tsql`
    SELECT TOP 10
      [TBL].[id] as [id],
      [TBL].[name] as [name],
      [TBL].[email] as [email],
      [TBL].[age] as [age],
      [TBL].[isActive] as [isActive],
      [TBL].[companyId] as [companyId],
      [TBL].[createdAt] as [createdAt]
    FROM [TestDb].[dbo].[User] as [TBL]
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
    LIMIT 10
  `,
};

// ============================================
// TOP 1 with select
// ============================================
export const topWithSelect: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    LIMIT 1
  `,
  mssql: tsql`
    SELECT TOP 1
      [TBL].[id] as [id],
      [TBL].[name] as [name]
    FROM [TestDb].[dbo].[User] as [TBL]
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."id" as "id",
      "TBL"."name" as "name"
    FROM "TestDb"."public"."User" as "TBL"
    LIMIT 1
  `,
};

// ============================================
// FOR UPDATE (lock)
// ============================================
export const lock: ExpectedSql = {
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
    FOR UPDATE
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
    FROM [TestDb].[dbo].[User] as [TBL] WITH (UPDLOCK)
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
    FOR UPDATE
  `,
};

// ============================================
// TABLESAMPLE
// ============================================
export const sample: ExpectedSql = {
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
    ORDER BY RAND()
    LIMIT 100
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
    TABLESAMPLE (100 ROWS)
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
    ORDER BY RANDOM()
    LIMIT 100
  `,
};

// ============================================
// distinct + top + select
// ============================================
export const combined: ExpectedSql = {
  mysql: mysql`
    SELECT DISTINCT
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    LIMIT 5
  `,
  mssql: tsql`
    SELECT DISTINCT TOP 5
      [TBL].[name] as [name],
      [TBL].[email] as [email]
    FROM [TestDb].[dbo].[User] as [TBL]
  `,
  postgresql: pgsql`
    SELECT DISTINCT
      "TBL"."name" as "name",
      "TBL"."email" as "email"
    FROM "TestDb"."public"."User" as "TBL"
    LIMIT 5
  `,
};
