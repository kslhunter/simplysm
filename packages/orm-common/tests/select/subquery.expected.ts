/**
 * SELECT - Subquery/WRAP/UNION test expected SQL
 */
import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

//#region ========== WRAP (Subquery) ==========

export const wrapBasic: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM (SELECT * FROM \`TestDb\`.\`User\` AS \`T1\`) AS \`T2\`
  `,
  mssql: tsql`
    SELECT *
    FROM (SELECT * FROM [TestDb].[TestSchema].[User] AS [T1]) AS [T2]
  `,
  postgresql: pgsql`
    SELECT *
    FROM (SELECT * FROM "TestSchema"."User" AS "T1") AS "T2"
  `,
};

export const wrapThenSelect: ExpectedSql = {
  mysql: mysql`
    SELECT \`T2\`.\`id\` AS \`id\`, \`T2\`.\`name\` AS \`name\`
    FROM (SELECT * FROM \`TestDb\`.\`User\` AS \`T1\`) AS \`T2\`
  `,
  mssql: tsql`
    SELECT [T2].[id] AS [id], [T2].[name] AS [name]
    FROM (SELECT * FROM [TestDb].[TestSchema].[User] AS [T1]) AS [T2]
  `,
  postgresql: pgsql`
    SELECT "T2"."id" AS "id", "T2"."name" AS "name"
    FROM (SELECT * FROM "TestSchema"."User" AS "T1") AS "T2"
  `,
};

export const selectThenWrap: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM (
      SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`name\` AS \`name\`
      FROM \`TestDb\`.\`User\` AS \`T1\`
    ) AS \`T2\`
  `,
  mssql: tsql`
    SELECT *
    FROM (
      SELECT [T1].[id] AS [id], [T1].[name] AS [name]
      FROM [TestDb].[TestSchema].[User] AS [T1]
    ) AS [T2]
  `,
  postgresql: pgsql`
    SELECT *
    FROM (
      SELECT "T1"."id" AS "id", "T1"."name" AS "name"
      FROM "TestSchema"."User" AS "T1"
    ) AS "T2"
  `,
};

export const whereThenWrapThenWhere: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM (
      SELECT * FROM \`TestDb\`.\`User\` AS \`T1\`
      WHERE \`T1\`.\`isActive\` <=> TRUE
    ) AS \`T2\`
    WHERE \`T2\`.\`age\` > 20
  `,
  mssql: tsql`
    SELECT *
    FROM (
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T1]
      WHERE (([T1].[isActive] IS NULL AND 1 IS NULL) OR [T1].[isActive] = 1)
    ) AS [T2]
    WHERE [T2].[age] > 20
  `,
  postgresql: pgsql`
    SELECT *
    FROM (
      SELECT * FROM "TestSchema"."User" AS "T1"
      WHERE "T1"."isActive" IS NOT DISTINCT FROM TRUE
    ) AS "T2"
    WHERE "T2"."age" > 20
  `,
};

export const includeThenWrapThenSelect: ExpectedSql = {
  mysql: mysql`
    SELECT \`T2\`.\`posts.userId\` AS \`postUserId\`
    FROM (
      SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`name\` AS \`name\`, \`T1\`.\`email\` AS \`email\`,
             \`T1\`.\`age\` AS \`age\`, \`T1\`.\`isActive\` AS \`isActive\`, \`T1\`.\`companyId\` AS \`companyId\`,
             \`T1\`.\`createdAt\` AS \`createdAt\`,
             \`T1.posts\`.\`id\` AS \`posts.id\`, \`T1.posts\`.\`userId\` AS \`posts.userId\`,
             \`T1.posts\`.\`title\` AS \`posts.title\`, \`T1.posts\`.\`content\` AS \`posts.content\`,
             \`T1.posts\`.\`viewCount\` AS \`posts.viewCount\`, \`T1.posts\`.\`publishedAt\` AS \`posts.publishedAt\`
      FROM \`TestDb\`.\`User\` AS \`T1\`
      LEFT OUTER JOIN \`TestDb\`.\`Post\` AS \`T1.posts\` ON \`T1.posts\`.\`userId\` = \`T1\`.\`id\`
    ) AS \`T2\`
  `,
  mssql: tsql`
    SELECT [T2].[posts.userId] AS [postUserId]
    FROM (
      SELECT [T1].[id] AS [id], [T1].[name] AS [name], [T1].[email] AS [email],
             [T1].[age] AS [age], [T1].[isActive] AS [isActive], [T1].[companyId] AS [companyId],
             [T1].[createdAt] AS [createdAt],
             [T1.posts].[id] AS [posts.id], [T1.posts].[userId] AS [posts.userId],
             [T1.posts].[title] AS [posts.title], [T1.posts].[content] AS [posts.content],
             [T1.posts].[viewCount] AS [posts.viewCount], [T1.posts].[publishedAt] AS [posts.publishedAt]
      FROM [TestDb].[TestSchema].[User] AS [T1]
      LEFT OUTER JOIN [TestDb].[TestSchema].[Post] AS [T1.posts]
        ON [T1.posts].[userId] = [T1].[id]
    ) AS [T2]
  `,
  postgresql: pgsql`
    SELECT "T2"."posts.userId" AS "postUserId"
    FROM (
      SELECT "T1"."id" AS "id", "T1"."name" AS "name", "T1"."email" AS "email",
             "T1"."age" AS "age", "T1"."isActive" AS "isActive", "T1"."companyId" AS "companyId",
             "T1"."createdAt" AS "createdAt",
             "T1.posts"."id" AS "posts.id", "T1.posts"."userId" AS "posts.userId",
             "T1.posts"."title" AS "posts.title", "T1.posts"."content" AS "posts.content",
             "T1.posts"."viewCount" AS "posts.viewCount", "T1.posts"."publishedAt" AS "posts.publishedAt"
      FROM "TestSchema"."User" AS "T1"
      LEFT OUTER JOIN "TestSchema"."Post" AS "T1.posts"
        ON "T1.posts"."userId" = "T1"."id"
    ) AS "T2"
  `,
};

export const groupByThenWrapThenOrderBy: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM (
      SELECT \`T1\`.\`name\` AS \`name\`, COUNT(\`T1\`.\`id\`) AS \`cnt\`
      FROM \`TestDb\`.\`User\` AS \`T1\`
      GROUP BY \`T1\`.\`name\`
    ) AS \`T2\`
    ORDER BY \`T2\`.\`cnt\` DESC
  `,
  mssql: tsql`
    SELECT *
    FROM (
      SELECT [T1].[name] AS [name], COUNT([T1].[id]) AS [cnt]
      FROM [TestDb].[TestSchema].[User] AS [T1]
      GROUP BY [T1].[name]
    ) AS [T2]
    ORDER BY [T2].[cnt] DESC
  `,
  postgresql: pgsql`
    SELECT *
    FROM (
      SELECT "T1"."name" AS "name", COUNT("T1"."id") AS "cnt"
      FROM "TestSchema"."User" AS "T1"
      GROUP BY "T1"."name"
    ) AS "T2"
    ORDER BY "T2"."cnt" DESC
  `,
};

//#endregion

//#region ========== UNION ==========

export const unionBasic: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM (
      SELECT * FROM \`TestDb\`.\`User\` AS \`T1\` WHERE \`T1\`.\`isActive\` <=> TRUE
      UNION ALL
      SELECT * FROM \`TestDb\`.\`User\` AS \`T2\` WHERE \`T2\`.\`age\` > 30
    ) AS \`T3\`
  `,
  mssql: tsql`
    SELECT *
    FROM (
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T1]
      WHERE (([T1].[isActive] IS NULL AND 1 IS NULL) OR [T1].[isActive] = 1)
      UNION ALL
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T2] WHERE [T2].[age] > 30
    ) AS [T3]
  `,
  postgresql: pgsql`
    SELECT *
    FROM (
      SELECT * FROM "TestSchema"."User" AS "T1"
      WHERE "T1"."isActive" IS NOT DISTINCT FROM TRUE
      UNION ALL
      SELECT * FROM "TestSchema"."User" AS "T2" WHERE "T2"."age" > 30
    ) AS "T3"
  `,
};

export const unionThree: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM (
      SELECT * FROM \`TestDb\`.\`User\` AS \`T1\` WHERE \`T1\`.\`age\` <=> 20
      UNION ALL
      SELECT * FROM \`TestDb\`.\`User\` AS \`T2\` WHERE \`T2\`.\`age\` <=> 30
      UNION ALL
      SELECT * FROM \`TestDb\`.\`User\` AS \`T3\` WHERE \`T3\`.\`age\` <=> 40
    ) AS \`T4\`
  `,
  mssql: tsql`
    SELECT *
    FROM (
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T1]
      WHERE (([T1].[age] IS NULL AND 20 IS NULL) OR [T1].[age] = 20)
      UNION ALL
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T2]
      WHERE (([T2].[age] IS NULL AND 30 IS NULL) OR [T2].[age] = 30)
      UNION ALL
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T3]
      WHERE (([T3].[age] IS NULL AND 40 IS NULL) OR [T3].[age] = 40)
    ) AS [T4]
  `,
  postgresql: pgsql`
    SELECT *
    FROM (
      SELECT * FROM "TestSchema"."User" AS "T1"
      WHERE "T1"."age" IS NOT DISTINCT FROM 20
      UNION ALL
      SELECT * FROM "TestSchema"."User" AS "T2"
      WHERE "T2"."age" IS NOT DISTINCT FROM 30
      UNION ALL
      SELECT * FROM "TestSchema"."User" AS "T3"
      WHERE "T3"."age" IS NOT DISTINCT FROM 40
    ) AS "T4"
  `,
};

export const unionThenWhere: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM (
      SELECT * FROM \`TestDb\`.\`User\` AS \`T1\`
      UNION ALL
      SELECT * FROM \`TestDb\`.\`User\` AS \`T2\`
    ) AS \`T3\`
    WHERE \`T3\`.\`isActive\` <=> TRUE
  `,
  mssql: tsql`
    SELECT *
    FROM (
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T1]
      UNION ALL
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T2]
    ) AS [T3]
    WHERE (([T3].[isActive] IS NULL AND 1 IS NULL) OR [T3].[isActive] = 1)
  `,
  postgresql: pgsql`
    SELECT *
    FROM (
      SELECT * FROM "TestSchema"."User" AS "T1"
      UNION ALL
      SELECT * FROM "TestSchema"."User" AS "T2"
    ) AS "T3"
    WHERE "T3"."isActive" IS NOT DISTINCT FROM TRUE
  `,
};

export const unionThenWrapThenOrderByLimit: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM (
      SELECT *
      FROM (
        SELECT * FROM \`TestDb\`.\`User\` AS \`T1\` WHERE \`T1\`.\`isActive\` <=> TRUE
        UNION ALL
        SELECT * FROM \`TestDb\`.\`User\` AS \`T2\` WHERE \`T2\`.\`age\` > 30
      ) AS \`T3\`
    ) AS \`T4\`
    ORDER BY \`T4\`.\`id\` DESC
    LIMIT 0, 10
  `,
  mssql: tsql`
    SELECT *
    FROM (
      SELECT *
      FROM (
        SELECT * FROM [TestDb].[TestSchema].[User] AS [T1]
        WHERE (([T1].[isActive] IS NULL AND 1 IS NULL) OR [T1].[isActive] = 1)
        UNION ALL
        SELECT * FROM [TestDb].[TestSchema].[User] AS [T2] WHERE [T2].[age] > 30
      ) AS [T3]
    ) AS [T4]
    ORDER BY [T4].[id] DESC
    OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
  `,
  postgresql: pgsql`
    SELECT *
    FROM (
      SELECT *
      FROM (
        SELECT * FROM "TestSchema"."User" AS "T1"
        WHERE "T1"."isActive" IS NOT DISTINCT FROM TRUE
        UNION ALL
        SELECT * FROM "TestSchema"."User" AS "T2" WHERE "T2"."age" > 30
      ) AS "T3"
    ) AS "T4"
    ORDER BY "T4"."id" DESC
    LIMIT 10 OFFSET 0
  `,
};

export const unionLiteralColumnDirectOrderBy: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM (
      SELECT \`T1\`.\`id\` AS \`id\`, 'ACTIVE' AS \`kind\` FROM \`TestDb\`.\`User\` AS \`T1\`
      UNION ALL
      SELECT \`T2\`.\`id\` AS \`id\`, 'ARCHIVED' AS \`kind\` FROM \`TestDb\`.\`User\` AS \`T2\`
    ) AS \`T3\`
    ORDER BY \`T3\`.\`kind\` DESC
  `,
  mssql: tsql`
    SELECT *
    FROM (
      SELECT [T1].[id] AS [id], N'ACTIVE' AS [kind] FROM [TestDb].[TestSchema].[User] AS [T1]
      UNION ALL
      SELECT [T2].[id] AS [id], N'ARCHIVED' AS [kind] FROM [TestDb].[TestSchema].[User] AS [T2]
    ) AS [T3]
    ORDER BY [T3].[kind] DESC
  `,
  postgresql: pgsql`
    SELECT *
    FROM (
      SELECT "T1"."id" AS "id", 'ACTIVE' AS "kind" FROM "TestSchema"."User" AS "T1"
      UNION ALL
      SELECT "T2"."id" AS "id", 'ARCHIVED' AS "kind" FROM "TestSchema"."User" AS "T2"
    ) AS "T3"
    ORDER BY "T3"."kind" DESC
  `,
};

export const unionExternalOrderBy: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM (
      SELECT * FROM \`TestDb\`.\`User\` AS \`T1\`
      UNION ALL
      SELECT * FROM \`TestDb\`.\`User\` AS \`T2\`
    ) AS \`T3\`
    ORDER BY \`T3\`.\`id\` DESC
  `,
  mssql: tsql`
    SELECT *
    FROM (
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T1]
      UNION ALL
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T2]
    ) AS [T3]
    ORDER BY [T3].[id] DESC
  `,
  postgresql: pgsql`
    SELECT *
    FROM (
      SELECT * FROM "TestSchema"."User" AS "T1"
      UNION ALL
      SELECT * FROM "TestSchema"."User" AS "T2"
    ) AS "T3"
    ORDER BY "T3"."id" DESC
  `,
};

export const unionExternalOrderByLimit: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM (
      SELECT * FROM \`TestDb\`.\`User\` AS \`T1\`
      UNION ALL
      SELECT * FROM \`TestDb\`.\`User\` AS \`T2\`
    ) AS \`T3\`
    ORDER BY \`T3\`.\`id\` DESC
    LIMIT 0, 10
  `,
  mssql: tsql`
    SELECT *
    FROM (
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T1]
      UNION ALL
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T2]
    ) AS [T3]
    ORDER BY [T3].[id] DESC
    OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
  `,
  postgresql: pgsql`
    SELECT *
    FROM (
      SELECT * FROM "TestSchema"."User" AS "T1"
      UNION ALL
      SELECT * FROM "TestSchema"."User" AS "T2"
    ) AS "T3"
    ORDER BY "T3"."id" DESC
    LIMIT 10 OFFSET 0
  `,
};

export const unionExternalTop: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM (
      SELECT * FROM \`TestDb\`.\`User\` AS \`T1\`
      UNION ALL
      SELECT * FROM \`TestDb\`.\`User\` AS \`T2\`
    ) AS \`T3\`
    LIMIT 10
  `,
  mssql: tsql`
    SELECT TOP 10 *
    FROM (
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T1]
      UNION ALL
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T2]
    ) AS [T3]
  `,
  postgresql: pgsql`
    SELECT *
    FROM (
      SELECT * FROM "TestSchema"."User" AS "T1"
      UNION ALL
      SELECT * FROM "TestSchema"."User" AS "T2"
    ) AS "T3"
    LIMIT 10
  `,
};

export const unionExternalDistinct: ExpectedSql = {
  mysql: mysql`
    SELECT DISTINCT *
    FROM (
      SELECT * FROM \`TestDb\`.\`User\` AS \`T1\`
      UNION ALL
      SELECT * FROM \`TestDb\`.\`User\` AS \`T2\`
    ) AS \`T3\`
  `,
  mssql: tsql`
    SELECT DISTINCT *
    FROM (
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T1]
      UNION ALL
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T2]
    ) AS [T3]
  `,
  postgresql: pgsql`
    SELECT DISTINCT *
    FROM (
      SELECT * FROM "TestSchema"."User" AS "T1"
      UNION ALL
      SELECT * FROM "TestSchema"."User" AS "T2"
    ) AS "T3"
  `,
};

export const unionExternalGroupByHaving: ExpectedSql = {
  mysql: mysql`
    SELECT \`T3\`.\`companyId\` AS \`companyId\`, COUNT(\`T3\`.\`id\`) AS \`cnt\`
    FROM (
      SELECT * FROM \`TestDb\`.\`User\` AS \`T1\`
      UNION ALL
      SELECT * FROM \`TestDb\`.\`User\` AS \`T2\`
    ) AS \`T3\`
    GROUP BY \`T3\`.\`companyId\`
    HAVING COUNT(*) > 1
  `,
  mssql: tsql`
    SELECT [T3].[companyId] AS [companyId], COUNT([T3].[id]) AS [cnt]
    FROM (
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T1]
      UNION ALL
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T2]
    ) AS [T3]
    GROUP BY [T3].[companyId]
    HAVING COUNT(*) > 1
  `,
  postgresql: pgsql`
    SELECT "T3"."companyId" AS "companyId", COUNT("T3"."id") AS "cnt"
    FROM (
      SELECT * FROM "TestSchema"."User" AS "T1"
      UNION ALL
      SELECT * FROM "TestSchema"."User" AS "T2"
    ) AS "T3"
    GROUP BY "T3"."companyId"
    HAVING COUNT(*) > 1
  `,
};

export const unionExternalLock: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM (
      SELECT * FROM \`TestDb\`.\`User\` AS \`T1\`
      UNION ALL
      SELECT * FROM \`TestDb\`.\`User\` AS \`T2\`
    ) AS \`T3\`
    FOR UPDATE
  `,
  mssql: tsql`
    SELECT *
    FROM (
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T1]
      UNION ALL
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T2]
    ) AS [T3] WITH (UPDLOCK, ROWLOCK)
  `,
  postgresql: pgsql`
    SELECT *
    FROM (
      SELECT * FROM "TestSchema"."User" AS "T1"
      UNION ALL
      SELECT * FROM "TestSchema"."User" AS "T2"
    ) AS "T3"
    FOR UPDATE
  `,
};

export const unionExternalSelect: ExpectedSql = {
  mysql: mysql`
    SELECT \`T3\`.\`id\` AS \`id\`, \`T3\`.\`name\` AS \`name\`
    FROM (
      SELECT * FROM \`TestDb\`.\`User\` AS \`T1\`
      UNION ALL
      SELECT * FROM \`TestDb\`.\`User\` AS \`T2\`
    ) AS \`T3\`
  `,
  mssql: tsql`
    SELECT [T3].[id] AS [id], [T3].[name] AS [name]
    FROM (
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T1]
      UNION ALL
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T2]
    ) AS [T3]
  `,
  postgresql: pgsql`
    SELECT "T3"."id" AS "id", "T3"."name" AS "name"
    FROM (
      SELECT * FROM "TestSchema"."User" AS "T1"
      UNION ALL
      SELECT * FROM "TestSchema"."User" AS "T2"
    ) AS "T3"
  `,
};

export const unionExternalJoin: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T3\`.\`id\` AS \`id\`, \`T3\`.\`name\` AS \`name\`, \`T3\`.\`email\` AS \`email\`,
      \`T3\`.\`age\` AS \`age\`, \`T3\`.\`isActive\` AS \`isActive\`, \`T3\`.\`companyId\` AS \`companyId\`,
      \`T3\`.\`createdAt\` AS \`createdAt\`,
      \`T3.posts\`.\`id\` AS \`posts.id\`, \`T3.posts\`.\`userId\` AS \`posts.userId\`,
      \`T3.posts\`.\`title\` AS \`posts.title\`, \`T3.posts\`.\`content\` AS \`posts.content\`,
      \`T3.posts\`.\`viewCount\` AS \`posts.viewCount\`, \`T3.posts\`.\`publishedAt\` AS \`posts.publishedAt\`
    FROM (
      SELECT * FROM \`TestDb\`.\`User\` AS \`T1\`
      UNION ALL
      SELECT * FROM \`TestDb\`.\`User\` AS \`T2\`
    ) AS \`T3\`
    LEFT OUTER JOIN \`TestDb\`.\`Post\` AS \`T3.posts\`
      ON \`T3.posts\`.\`userId\` <=> \`T3\`.\`id\`
  `,
  mssql: tsql`
    SELECT
      [T3].[id] AS [id], [T3].[name] AS [name], [T3].[email] AS [email],
      [T3].[age] AS [age], [T3].[isActive] AS [isActive], [T3].[companyId] AS [companyId],
      [T3].[createdAt] AS [createdAt],
      [T3.posts].[id] AS [posts.id], [T3.posts].[userId] AS [posts.userId],
      [T3.posts].[title] AS [posts.title], [T3.posts].[content] AS [posts.content],
      [T3.posts].[viewCount] AS [posts.viewCount], [T3.posts].[publishedAt] AS [posts.publishedAt]
    FROM (
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T1]
      UNION ALL
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T2]
    ) AS [T3]
    LEFT OUTER JOIN [TestDb].[TestSchema].[Post] AS [T3.posts]
      ON (([T3.posts].[userId] IS NULL AND [T3].[id] IS NULL) OR [T3.posts].[userId] = [T3].[id])
  `,
  postgresql: pgsql`
    SELECT
      "T3"."id" AS "id", "T3"."name" AS "name", "T3"."email" AS "email",
      "T3"."age" AS "age", "T3"."isActive" AS "isActive", "T3"."companyId" AS "companyId",
      "T3"."createdAt" AS "createdAt",
      "T3.posts"."id" AS "posts.id", "T3.posts"."userId" AS "posts.userId",
      "T3.posts"."title" AS "posts.title", "T3.posts"."content" AS "posts.content",
      "T3.posts"."viewCount" AS "posts.viewCount", "T3.posts"."publishedAt" AS "posts.publishedAt"
    FROM (
      SELECT * FROM "TestSchema"."User" AS "T1"
      UNION ALL
      SELECT * FROM "TestSchema"."User" AS "T2"
    ) AS "T3"
    LEFT OUTER JOIN "TestSchema"."Post" AS "T3.posts"
      ON "T3.posts"."userId" IS NOT DISTINCT FROM "T3"."id"
  `,
};

export const unionExternalJoinSingle: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T3\`.\`id\` AS \`id\`, \`T3\`.\`name\` AS \`name\`, \`T3\`.\`email\` AS \`email\`,
      \`T3\`.\`age\` AS \`age\`, \`T3\`.\`isActive\` AS \`isActive\`, \`T3\`.\`companyId\` AS \`companyId\`,
      \`T3\`.\`createdAt\` AS \`createdAt\`,
      \`T3.company\`.\`id\` AS \`company.id\`, \`T3.company\`.\`name\` AS \`company.name\`,
      \`T3.company\`.\`foundedAt\` AS \`company.foundedAt\`
    FROM (
      SELECT * FROM \`TestDb\`.\`User\` AS \`T1\`
      UNION ALL
      SELECT * FROM \`TestDb\`.\`User\` AS \`T2\`
    ) AS \`T3\`
    LEFT OUTER JOIN \`TestDb\`.\`Company\` AS \`T3.company\`
      ON \`T3.company\`.\`id\` <=> \`T3\`.\`companyId\`
  `,
  mssql: tsql`
    SELECT
      [T3].[id] AS [id], [T3].[name] AS [name], [T3].[email] AS [email],
      [T3].[age] AS [age], [T3].[isActive] AS [isActive], [T3].[companyId] AS [companyId],
      [T3].[createdAt] AS [createdAt],
      [T3.company].[id] AS [company.id], [T3.company].[name] AS [company.name],
      [T3.company].[foundedAt] AS [company.foundedAt]
    FROM (
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T1]
      UNION ALL
      SELECT * FROM [TestDb].[TestSchema].[User] AS [T2]
    ) AS [T3]
    LEFT OUTER JOIN [TestDb].[TestSchema].[Company] AS [T3.company]
      ON (([T3.company].[id] IS NULL AND [T3].[companyId] IS NULL) OR [T3.company].[id] = [T3].[companyId])
  `,
  postgresql: pgsql`
    SELECT
      "T3"."id" AS "id", "T3"."name" AS "name", "T3"."email" AS "email",
      "T3"."age" AS "age", "T3"."isActive" AS "isActive", "T3"."companyId" AS "companyId",
      "T3"."createdAt" AS "createdAt",
      "T3.company"."id" AS "company.id", "T3.company"."name" AS "company.name",
      "T3.company"."foundedAt" AS "company.foundedAt"
    FROM (
      SELECT * FROM "TestSchema"."User" AS "T1"
      UNION ALL
      SELECT * FROM "TestSchema"."User" AS "T2"
    ) AS "T3"
    LEFT OUTER JOIN "TestSchema"."Company" AS "T3.company"
      ON "T3.company"."id" IS NOT DISTINCT FROM "T3"."companyId"
  `,
};

export const unionLiteralColumnThenWrapThenOrderBy: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM (
      SELECT *
      FROM (
        SELECT \`T1\`.\`id\` AS \`id\`, 'ACTIVE' AS \`kind\` FROM \`TestDb\`.\`User\` AS \`T1\`
        UNION ALL
        SELECT \`T2\`.\`id\` AS \`id\`, 'ARCHIVED' AS \`kind\` FROM \`TestDb\`.\`User\` AS \`T2\`
      ) AS \`T3\`
    ) AS \`T4\`
    ORDER BY \`T4\`.\`kind\` DESC
  `,
  mssql: tsql`
    SELECT *
    FROM (
      SELECT *
      FROM (
        SELECT [T1].[id] AS [id], N'ACTIVE' AS [kind] FROM [TestDb].[TestSchema].[User] AS [T1]
        UNION ALL
        SELECT [T2].[id] AS [id], N'ARCHIVED' AS [kind] FROM [TestDb].[TestSchema].[User] AS [T2]
      ) AS [T3]
    ) AS [T4]
    ORDER BY [T4].[kind] DESC
  `,
  postgresql: pgsql`
    SELECT *
    FROM (
      SELECT *
      FROM (
        SELECT "T1"."id" AS "id", 'ACTIVE' AS "kind" FROM "TestSchema"."User" AS "T1"
        UNION ALL
        SELECT "T2"."id" AS "id", 'ARCHIVED' AS "kind" FROM "TestSchema"."User" AS "T2"
      ) AS "T3"
    ) AS "T4"
    ORDER BY "T4"."kind" DESC
  `,
};

export const unionThenSelect: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM (
      SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`name\` AS \`name\` FROM \`TestDb\`.\`User\` AS \`T1\`
      UNION ALL
      SELECT \`T2\`.\`id\` AS \`id\`, \`T2\`.\`name\` AS \`name\` FROM \`TestDb\`.\`User\` AS \`T2\`
    ) AS \`T3\`
  `,
  mssql: tsql`
    SELECT *
    FROM (
      SELECT [T1].[id] AS [id], [T1].[name] AS [name] FROM [TestDb].[TestSchema].[User] AS [T1]
      UNION ALL
      SELECT [T2].[id] AS [id], [T2].[name] AS [name] FROM [TestDb].[TestSchema].[User] AS [T2]
    ) AS [T3]
  `,
  postgresql: pgsql`
    SELECT *
    FROM (
      SELECT "T1"."id" AS "id", "T1"."name" AS "name" FROM "TestSchema"."User" AS "T1"
      UNION ALL
      SELECT "T2"."id" AS "id", "T2"."name" AS "name" FROM "TestSchema"."User" AS "T2"
    ) AS "T3"
  `,
};

//#endregion

//#region ========== SCALAR SUBQUERY ==========

export const scalarSubquery: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      (SELECT COUNT(*) AS \`cnt\` FROM \`TestDb\`.\`Post\` AS \`T2\` WHERE \`T2\`.\`userId\`<=>\`T1\`.\`id\`) AS \`postCount\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      (SELECT COUNT(*) AS [cnt] FROM [TestDb].[TestSchema].[Post] AS [T2] WHERE (([T2].[userId] IS NULL AND [T1].[id] IS NULL) OR [T2].[userId] = [T1].[id])) AS [postCount]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      (SELECT COUNT(*) AS "cnt" FROM "TestSchema"."Post" AS "T2" WHERE "T2"."userId" IS NOT DISTINCT FROM "T1"."id") AS "postCount"
    FROM "TestSchema"."User" AS "T1"
  `,
};

//#endregion
