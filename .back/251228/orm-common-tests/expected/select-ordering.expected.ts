import { TDialect } from "../../src/types/column-primitive";
import { mysql, pgsql, tsql } from "@simplysm/sd-core-common";

type ExpectedSql = Record<TDialect, string>;

// ============================================
// orderBy ASC (기본)
// ============================================
export const orderByAsc: ExpectedSql = {
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
    ORDER BY \`TBL\`.\`name\` ASC
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
    ORDER BY [TBL].[name] ASC
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
    ORDER BY "TBL"."name" ASC
  `,
};

// ============================================
// orderBy DESC
// ============================================
export const orderByDesc: ExpectedSql = {
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
    ORDER BY \`TBL\`.\`name\` DESC
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
    ORDER BY [TBL].[name] DESC
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
    ORDER BY "TBL"."name" DESC
  `,
};

// ============================================
// orderBy 다중 컬럼
// ============================================
export const orderByMultiple: ExpectedSql = {
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
    ORDER BY \`TBL\`.\`name\` ASC, \`TBL\`.\`createdAt\` DESC
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
    ORDER BY [TBL].[name] ASC, [TBL].[createdAt] DESC
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
    ORDER BY "TBL"."name" ASC, "TBL"."createdAt" DESC
  `,
};

// ============================================
// orderBy 표현식
// ============================================
export const orderByExpression: ExpectedSql = {
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
    ORDER BY IFNULL(\`TBL\`.\`age\`, 0) DESC
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
    ORDER BY ISNULL([TBL].[age], 0) DESC
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
    ORDER BY COALESCE("TBL"."age", 0) DESC
  `,
};

// ============================================
// clearOrderBy
// ============================================
export const clearOrderBy: ExpectedSql = {
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
    ORDER BY \`TBL\`.\`id\` ASC
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
    ORDER BY [TBL].[id] ASC
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
    ORDER BY "TBL"."id" ASC
  `,
};

// ============================================
// limit (skip, take)
// ============================================
export const limit: ExpectedSql = {
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
    ORDER BY \`TBL\`.\`id\` ASC
    LIMIT 10, 20
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
    ORDER BY [TBL].[id] ASC
    OFFSET 10 ROWS FETCH NEXT 20 ROWS ONLY
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
    ORDER BY "TBL"."id" ASC
    LIMIT 20 OFFSET 10
  `,
};
