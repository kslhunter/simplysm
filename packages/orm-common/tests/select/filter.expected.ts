/**
 * SELECT - WHERE 테스트 Expected SQL
 */
import { mysql, pgsql, tsql } from "@simplysm/sd-core-common";
import type { ExpectedSql } from "../setup/test-utils";

//#region ========== 비교 연산 ==========

export const whereEq: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE \`T1\`.\`id\` <=> 1
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE (([T1].[id] IS NULL AND 1 IS NULL) OR [T1].[id] = 1)
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE (("T1"."id" IS NULL AND 1 IS NULL) OR "T1"."id" = 1)
  `,
};

export const whereNotEq: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE NOT (\`T1\`.\`id\` <=> 1)
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE NOT ((([T1].[id] IS NULL AND 1 IS NULL) OR [T1].[id] = 1))
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE NOT ((("T1"."id" IS NULL AND 1 IS NULL) OR "T1"."id" = 1))
  `,
};

export const whereGt: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE \`T1\`.\`age\` > 20
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE [T1].[age] > 20
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE "T1"."age" > 20
  `,
};

export const whereGte: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE \`T1\`.\`age\` >= 20
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE [T1].[age] >= 20
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE "T1"."age" >= 20
  `,
};

export const whereLt: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE \`T1\`.\`age\` < 30
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE [T1].[age] < 30
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE "T1"."age" < 30
  `,
};

export const whereLte: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE \`T1\`.\`age\` <= 30
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE [T1].[age] <= 30
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE "T1"."age" <= 30
  `,
};

//#endregion

//#region ========== NULL 체크 ==========

export const whereNull: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE \`T1\`.\`email\` IS NULL
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE [T1].[email] IS NULL
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE "T1"."email" IS NULL
  `,
};

export const whereNotNull: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE NOT (\`T1\`.\`email\` IS NULL)
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE NOT ([T1].[email] IS NULL)
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE NOT ("T1"."email" IS NULL)
  `,
};

//#endregion

//#region ========== IN ==========

export const whereIn: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE \`T1\`.\`id\` IN (1, 2, 3)
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE [T1].[id] IN (1, 2, 3)
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE "T1"."id" IN (1, 2, 3)
  `,
};

export const whereNotIn: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE NOT (\`T1\`.\`id\` IN (1, 2))
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE NOT ([T1].[id] IN (1, 2))
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE NOT ("T1"."id" IN (1, 2))
  `,
};

//#endregion

//#region ========== LIKE ==========

export const whereLike: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE \`T1\`.\`name\` LIKE '%홍%' ESCAPE '\\\\'
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE [T1].[name] LIKE N'%홍%' ESCAPE '\\'
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE "T1"."name" LIKE '%홍%' ESCAPE '\\'
  `,
};

export const whereNotLike: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE NOT (\`T1\`.\`name\` LIKE '%테스트%' ESCAPE '\\\\')
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE NOT ([T1].[name] LIKE N'%테스트%' ESCAPE '\\')
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE NOT ("T1"."name" LIKE '%테스트%' ESCAPE '\\')
  `,
};

//#endregion

//#region ========== 논리 연산 ==========

export const whereMultipleAnd: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE \`T1\`.\`isActive\` <=> TRUE AND \`T1\`.\`age\` > 20
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE (([T1].[isActive] IS NULL AND 1 IS NULL) OR [T1].[isActive] = 1) AND [T1].[age] > 20
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE (("T1"."isActive" IS NULL AND TRUE IS NULL) OR "T1"."isActive" = TRUE) AND "T1"."age" > 20
  `,
};

export const whereOr: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE (\`T1\`.\`age\` <=> 20 OR \`T1\`.\`age\` <=> 30)
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE ((([T1].[age] IS NULL AND 20 IS NULL) OR [T1].[age] = 20) OR (([T1].[age] IS NULL AND 30 IS NULL) OR [T1].[age] = 30))
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE ((("T1"."age" IS NULL AND 20 IS NULL) OR "T1"."age" = 20) OR (("T1"."age" IS NULL AND 30 IS NULL) OR "T1"."age" = 30))
  `,
};

export const whereAndExplicit: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE (\`T1\`.\`age\` > 20 AND \`T1\`.\`age\` < 30)
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE ([T1].[age] > 20 AND [T1].[age] < 30)
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE ("T1"."age" > 20 AND "T1"."age" < 30)
  `,
};

//#endregion

//#region ========== BETWEEN ==========

export const whereBetween: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE \`T1\`.\`age\` BETWEEN 20 AND 30
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE [T1].[age] BETWEEN 20 AND 30
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE "T1"."age" BETWEEN 20 AND 30
  `,
};

//#endregion

//#region ========== EXISTS / IN subquery ==========

export const whereExists: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE EXISTS (SELECT 1 AS \`_\` FROM \`TestDb\`.\`Post\` AS \`T2\` WHERE \`T2\`.\`userId\` <=> \`T1\`.\`id\`)
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE EXISTS (SELECT 1 AS [_] FROM [TestDb].[TestSchema].[Post] AS [T2] WHERE (([T2].[userId] IS NULL AND [T1].[id] IS NULL) OR [T2].[userId] = [T1].[id]))
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE EXISTS (SELECT 1 AS "_" FROM "TestSchema"."Post" AS "T2" WHERE (("T2"."userId" IS NULL AND "T1"."id" IS NULL) OR "T2"."userId" = "T1"."id"))
  `,
};

export const whereInQuery: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE \`T1\`.\`id\` IN (SELECT \`T2\`.\`userId\` AS \`userId\` FROM \`TestDb\`.\`Post\` AS \`T2\`)
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE [T1].[id] IN (SELECT [T2].[userId] AS [userId] FROM [TestDb].[TestSchema].[Post] AS [T2])
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE "T1"."id" IN (SELECT "T2"."userId" AS "userId" FROM "TestSchema"."Post" AS "T2")
  `,
};

//#endregion
