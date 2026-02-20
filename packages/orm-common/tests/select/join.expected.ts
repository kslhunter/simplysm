/**
 * SELECT - JOIN 테스트 Expected SQL
 */
import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

//#region ========== 기본 JOIN ==========

export const joinBasic: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      \`T1\`.\`name\` AS \`name\`,
      \`T1\`.\`email\` AS \`email\`,
      \`T1\`.\`age\` AS \`age\`,
      \`T1\`.\`isActive\` AS \`isActive\`,
      \`T1\`.\`companyId\` AS \`companyId\`,
      \`T1\`.\`createdAt\` AS \`createdAt\`,
      \`T1.post\`.\`id\` AS \`post.id\`,
      \`T1.post\`.\`userId\` AS \`post.userId\`,
      \`T1.post\`.\`title\` AS \`post.title\`,
      \`T1.post\`.\`content\` AS \`post.content\`,
      \`T1.post\`.\`viewCount\` AS \`post.viewCount\`,
      \`T1.post\`.\`publishedAt\` AS \`post.publishedAt\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
    LEFT OUTER JOIN \`TestDb\`.\`Post\` AS \`T1.post\` ON \`T1.post\`.\`userId\` <=> \`T1\`.\`id\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      [T1].[name] AS [name],
      [T1].[email] AS [email],
      [T1].[age] AS [age],
      [T1].[isActive] AS [isActive],
      [T1].[companyId] AS [companyId],
      [T1].[createdAt] AS [createdAt],
      [T1.post].[id] AS [post.id],
      [T1.post].[userId] AS [post.userId],
      [T1.post].[title] AS [post.title],
      [T1.post].[content] AS [post.content],
      [T1.post].[viewCount] AS [post.viewCount],
      [T1.post].[publishedAt] AS [post.publishedAt]
    FROM [TestDb].[TestSchema].[User] AS [T1]
    LEFT OUTER JOIN [TestDb].[TestSchema].[Post] AS [T1.post] ON (([T1.post].[userId] IS NULL AND [T1].[id] IS NULL) OR [T1.post].[userId] = [T1].[id])
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      "T1"."name" AS "name",
      "T1"."email" AS "email",
      "T1"."age" AS "age",
      "T1"."isActive" AS "isActive",
      "T1"."companyId" AS "companyId",
      "T1"."createdAt" AS "createdAt",
      "T1.post"."id" AS "post.id",
      "T1.post"."userId" AS "post.userId",
      "T1.post"."title" AS "post.title",
      "T1.post"."content" AS "post.content",
      "T1.post"."viewCount" AS "post.viewCount",
      "T1.post"."publishedAt" AS "post.publishedAt"
    FROM "TestSchema"."User" AS "T1"
    LEFT OUTER JOIN "TestSchema"."Post" AS "T1.post" ON "T1.post"."userId" IS NOT DISTINCT FROM "T1"."id"
  `,
};

export const joinSingle: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      \`T1\`.\`userId\` AS \`userId\`,
      \`T1\`.\`title\` AS \`title\`,
      \`T1\`.\`content\` AS \`content\`,
      \`T1\`.\`viewCount\` AS \`viewCount\`,
      \`T1\`.\`publishedAt\` AS \`publishedAt\`,
      \`T1.user\`.\`id\` AS \`user.id\`,
      \`T1.user\`.\`name\` AS \`user.name\`,
      \`T1.user\`.\`email\` AS \`user.email\`,
      \`T1.user\`.\`age\` AS \`user.age\`,
      \`T1.user\`.\`isActive\` AS \`user.isActive\`,
      \`T1.user\`.\`companyId\` AS \`user.companyId\`,
      \`T1.user\`.\`createdAt\` AS \`user.createdAt\`
    FROM \`TestDb\`.\`Post\` AS \`T1\`
    LEFT OUTER JOIN \`TestDb\`.\`User\` AS \`T1.user\` ON \`T1.user\`.\`id\` <=> \`T1\`.\`userId\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      [T1].[userId] AS [userId],
      [T1].[title] AS [title],
      [T1].[content] AS [content],
      [T1].[viewCount] AS [viewCount],
      [T1].[publishedAt] AS [publishedAt],
      [T1.user].[id] AS [user.id],
      [T1.user].[name] AS [user.name],
      [T1.user].[email] AS [user.email],
      [T1.user].[age] AS [user.age],
      [T1.user].[isActive] AS [user.isActive],
      [T1.user].[companyId] AS [user.companyId],
      [T1.user].[createdAt] AS [user.createdAt]
    FROM [TestDb].[TestSchema].[Post] AS [T1]
    LEFT OUTER JOIN [TestDb].[TestSchema].[User] AS [T1.user] ON (([T1.user].[id] IS NULL AND [T1].[userId] IS NULL) OR [T1.user].[id] = [T1].[userId])
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      "T1"."userId" AS "userId",
      "T1"."title" AS "title",
      "T1"."content" AS "content",
      "T1"."viewCount" AS "viewCount",
      "T1"."publishedAt" AS "publishedAt",
      "T1.user"."id" AS "user.id",
      "T1.user"."name" AS "user.name",
      "T1.user"."email" AS "user.email",
      "T1.user"."age" AS "user.age",
      "T1.user"."isActive" AS "user.isActive",
      "T1.user"."companyId" AS "user.companyId",
      "T1.user"."createdAt" AS "user.createdAt"
    FROM "TestSchema"."Post" AS "T1"
    LEFT OUTER JOIN "TestSchema"."User" AS "T1.user" ON "T1.user"."id" IS NOT DISTINCT FROM "T1"."userId"
  `,
};

export const joinSingleLateral: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      \`T1\`.\`name\` AS \`name\`,
      \`T1\`.\`email\` AS \`email\`,
      \`T1\`.\`age\` AS \`age\`,
      \`T1\`.\`isActive\` AS \`isActive\`,
      \`T1\`.\`companyId\` AS \`companyId\`,
      \`T1\`.\`createdAt\` AS \`createdAt\`,
      \`T1.latestPost\`.\`id\` AS \`latestPost.id\`,
      \`T1.latestPost\`.\`userId\` AS \`latestPost.userId\`,
      \`T1.latestPost\`.\`title\` AS \`latestPost.title\`,
      \`T1.latestPost\`.\`content\` AS \`latestPost.content\`,
      \`T1.latestPost\`.\`viewCount\` AS \`latestPost.viewCount\`,
      \`T1.latestPost\`.\`publishedAt\` AS \`latestPost.publishedAt\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
    LEFT OUTER JOIN LATERAL (
      SELECT * FROM \`TestDb\`.\`Post\` AS \`T1.latestPost\`
      WHERE \`T1.latestPost\`.\`userId\` <=> \`T1\`.\`id\`
      ORDER BY \`T1.latestPost\`.\`publishedAt\` DESC
      LIMIT 1
    ) AS \`T1.latestPost\` ON TRUE
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      [T1].[name] AS [name],
      [T1].[email] AS [email],
      [T1].[age] AS [age],
      [T1].[isActive] AS [isActive],
      [T1].[companyId] AS [companyId],
      [T1].[createdAt] AS [createdAt],
      [T1.latestPost].[id] AS [latestPost.id],
      [T1.latestPost].[userId] AS [latestPost.userId],
      [T1.latestPost].[title] AS [latestPost.title],
      [T1.latestPost].[content] AS [latestPost.content],
      [T1.latestPost].[viewCount] AS [latestPost.viewCount],
      [T1.latestPost].[publishedAt] AS [latestPost.publishedAt]
    FROM [TestDb].[TestSchema].[User] AS [T1]
    OUTER APPLY (
      SELECT TOP 1 * FROM [TestDb].[TestSchema].[Post] AS [T1.latestPost]
      WHERE (([T1.latestPost].[userId] IS NULL AND [T1].[id] IS NULL) OR [T1.latestPost].[userId] = [T1].[id])
      ORDER BY [T1.latestPost].[publishedAt] DESC
    ) AS [T1.latestPost]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      "T1"."name" AS "name",
      "T1"."email" AS "email",
      "T1"."age" AS "age",
      "T1"."isActive" AS "isActive",
      "T1"."companyId" AS "companyId",
      "T1"."createdAt" AS "createdAt",
      "T1.latestPost"."id" AS "latestPost.id",
      "T1.latestPost"."userId" AS "latestPost.userId",
      "T1.latestPost"."title" AS "latestPost.title",
      "T1.latestPost"."content" AS "latestPost.content",
      "T1.latestPost"."viewCount" AS "latestPost.viewCount",
      "T1.latestPost"."publishedAt" AS "latestPost.publishedAt"
    FROM "TestSchema"."User" AS "T1"
    LEFT OUTER JOIN LATERAL (
      SELECT * FROM "TestSchema"."Post" AS "T1.latestPost"
      WHERE "T1.latestPost"."userId" IS NOT DISTINCT FROM "T1"."id"
      ORDER BY "T1.latestPost"."publishedAt" DESC
      LIMIT 1
    ) AS "T1.latestPost" ON TRUE
  `,
};

export const joinSingleLateralAgg: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      \`T1\`.\`name\` AS \`name\`,
      \`T1\`.\`email\` AS \`email\`,
      \`T1\`.\`age\` AS \`age\`,
      \`T1\`.\`isActive\` AS \`isActive\`,
      \`T1\`.\`companyId\` AS \`companyId\`,
      \`T1\`.\`createdAt\` AS \`createdAt\`,
      \`T1.postStats\`.\`cnt\` AS \`postStats.cnt\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
    LEFT OUTER JOIN LATERAL (
      SELECT COUNT(*) AS \`cnt\`
      FROM \`TestDb\`.\`Post\` AS \`T1.postStats\`
      WHERE \`T1.postStats\`.\`userId\` <=> \`T1\`.\`id\`
    ) AS \`T1.postStats\` ON TRUE
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      [T1].[name] AS [name],
      [T1].[email] AS [email],
      [T1].[age] AS [age],
      [T1].[isActive] AS [isActive],
      [T1].[companyId] AS [companyId],
      [T1].[createdAt] AS [createdAt],
      [T1.postStats].[cnt] AS [postStats.cnt]
    FROM [TestDb].[TestSchema].[User] AS [T1]
    OUTER APPLY (
      SELECT COUNT(*) AS [cnt]
      FROM [TestDb].[TestSchema].[Post] AS [T1.postStats]
      WHERE (([T1.postStats].[userId] IS NULL AND [T1].[id] IS NULL) OR [T1.postStats].[userId] = [T1].[id])
    ) AS [T1.postStats]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      "T1"."name" AS "name",
      "T1"."email" AS "email",
      "T1"."age" AS "age",
      "T1"."isActive" AS "isActive",
      "T1"."companyId" AS "companyId",
      "T1"."createdAt" AS "createdAt",
      "T1.postStats"."cnt" AS "postStats.cnt"
    FROM "TestSchema"."User" AS "T1"
    LEFT OUTER JOIN LATERAL (
      SELECT COUNT(*) AS "cnt"
      FROM "TestSchema"."Post" AS "T1.postStats"
      WHERE "T1.postStats"."userId" IS NOT DISTINCT FROM "T1"."id"
    ) AS "T1.postStats" ON TRUE
  `,
};

export const joinSingleMultiLevel: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      \`T1\`.\`userId\` AS \`userId\`,
      \`T1\`.\`title\` AS \`title\`,
      \`T1\`.\`content\` AS \`content\`,
      \`T1\`.\`viewCount\` AS \`viewCount\`,
      \`T1\`.\`publishedAt\` AS \`publishedAt\`,
      \`T1.user\`.\`id\` AS \`user.id\`,
      \`T1.user\`.\`name\` AS \`user.name\`,
      \`T1.user\`.\`email\` AS \`user.email\`,
      \`T1.user\`.\`age\` AS \`user.age\`,
      \`T1.user\`.\`isActive\` AS \`user.isActive\`,
      \`T1.user\`.\`companyId\` AS \`user.companyId\`,
      \`T1.user\`.\`createdAt\` AS \`user.createdAt\`,
      \`T1.user\`.\`company.id\` AS \`user.company.id\`,
      \`T1.user\`.\`company.name\` AS \`user.company.name\`,
      \`T1.user\`.\`company.foundedAt\` AS \`user.company.foundedAt\`
    FROM \`TestDb\`.\`Post\` AS \`T1\`
    LEFT OUTER JOIN LATERAL (
      SELECT
        \`T1.user\`.\`id\` AS \`id\`,
        \`T1.user\`.\`name\` AS \`name\`,
        \`T1.user\`.\`email\` AS \`email\`,
        \`T1.user\`.\`age\` AS \`age\`,
        \`T1.user\`.\`isActive\` AS \`isActive\`,
        \`T1.user\`.\`companyId\` AS \`companyId\`,
        \`T1.user\`.\`createdAt\` AS \`createdAt\`,
        \`T1.user.company\`.\`id\` AS \`company.id\`,
        \`T1.user.company\`.\`name\` AS \`company.name\`,
        \`T1.user.company\`.\`foundedAt\` AS \`company.foundedAt\`
      FROM \`TestDb\`.\`User\` AS \`T1.user\`
      LEFT OUTER JOIN \`TestDb\`.\`Company\` AS \`T1.user.company\`
        ON \`T1.user.company\`.\`id\` <=> \`T1.user\`.\`companyId\`
      WHERE \`T1.user\`.\`id\` <=> \`T1\`.\`userId\`
    ) AS \`T1.user\` ON TRUE
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      [T1].[userId] AS [userId],
      [T1].[title] AS [title],
      [T1].[content] AS [content],
      [T1].[viewCount] AS [viewCount],
      [T1].[publishedAt] AS [publishedAt],
      [T1.user].[id] AS [user.id],
      [T1.user].[name] AS [user.name],
      [T1.user].[email] AS [user.email],
      [T1.user].[age] AS [user.age],
      [T1.user].[isActive] AS [user.isActive],
      [T1.user].[companyId] AS [user.companyId],
      [T1.user].[createdAt] AS [user.createdAt],
      [T1.user].[company.id] AS [user.company.id],
      [T1.user].[company.name] AS [user.company.name],
      [T1.user].[company.foundedAt] AS [user.company.foundedAt]
    FROM [TestDb].[TestSchema].[Post] AS [T1]
    OUTER APPLY (
      SELECT
        [T1.user].[id] AS [id],
        [T1.user].[name] AS [name],
        [T1.user].[email] AS [email],
        [T1.user].[age] AS [age],
        [T1.user].[isActive] AS [isActive],
        [T1.user].[companyId] AS [companyId],
        [T1.user].[createdAt] AS [createdAt],
        [T1.user.company].[id] AS [company.id],
        [T1.user.company].[name] AS [company.name],
        [T1.user.company].[foundedAt] AS [company.foundedAt]
      FROM [TestDb].[TestSchema].[User] AS [T1.user]
      LEFT OUTER JOIN [TestDb].[TestSchema].[Company] AS [T1.user.company]
        ON (([T1.user.company].[id] IS NULL AND [T1.user].[companyId] IS NULL) OR [T1.user.company].[id] = [T1.user].[companyId])
      WHERE (([T1.user].[id] IS NULL AND [T1].[userId] IS NULL) OR [T1.user].[id] = [T1].[userId])
    ) AS [T1.user]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      "T1"."userId" AS "userId",
      "T1"."title" AS "title",
      "T1"."content" AS "content",
      "T1"."viewCount" AS "viewCount",
      "T1"."publishedAt" AS "publishedAt",
      "T1.user"."id" AS "user.id",
      "T1.user"."name" AS "user.name",
      "T1.user"."email" AS "user.email",
      "T1.user"."age" AS "user.age",
      "T1.user"."isActive" AS "user.isActive",
      "T1.user"."companyId" AS "user.companyId",
      "T1.user"."createdAt" AS "user.createdAt",
      "T1.user"."company.id" AS "user.company.id",
      "T1.user"."company.name" AS "user.company.name",
      "T1.user"."company.foundedAt" AS "user.company.foundedAt"
    FROM "TestSchema"."Post" AS "T1"
    LEFT OUTER JOIN LATERAL (
      SELECT
        "T1.user"."id" AS "id",
        "T1.user"."name" AS "name",
        "T1.user"."email" AS "email",
        "T1.user"."age" AS "age",
        "T1.user"."isActive" AS "isActive",
        "T1.user"."companyId" AS "companyId",
        "T1.user"."createdAt" AS "createdAt",
        "T1.user.company"."id" AS "company.id",
        "T1.user.company"."name" AS "company.name",
        "T1.user.company"."foundedAt" AS "company.foundedAt"
      FROM "TestSchema"."User" AS "T1.user"
      LEFT OUTER JOIN "TestSchema"."Company" AS "T1.user.company"
        ON "T1.user.company"."id" IS NOT DISTINCT FROM "T1.user"."companyId"
      WHERE "T1.user"."id" IS NOT DISTINCT FROM "T1"."userId"
    ) AS "T1.user" ON TRUE
  `,
};

//#endregion

//#region ========== INCLUDE ==========

export const includeFk: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      \`T1\`.\`userId\` AS \`userId\`,
      \`T1\`.\`title\` AS \`title\`,
      \`T1\`.\`content\` AS \`content\`,
      \`T1\`.\`viewCount\` AS \`viewCount\`,
      \`T1\`.\`publishedAt\` AS \`publishedAt\`,
      \`T1.user\`.\`id\` AS \`user.id\`,
      \`T1.user\`.\`name\` AS \`user.name\`,
      \`T1.user\`.\`email\` AS \`user.email\`,
      \`T1.user\`.\`age\` AS \`user.age\`,
      \`T1.user\`.\`isActive\` AS \`user.isActive\`,
      \`T1.user\`.\`companyId\` AS \`user.companyId\`,
      \`T1.user\`.\`createdAt\` AS \`user.createdAt\`
    FROM \`TestDb\`.\`Post\` AS \`T1\`
    LEFT OUTER JOIN \`TestDb\`.\`User\` AS \`T1.user\` ON \`T1.user\`.\`id\` <=> \`T1\`.\`userId\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      [T1].[userId] AS [userId],
      [T1].[title] AS [title],
      [T1].[content] AS [content],
      [T1].[viewCount] AS [viewCount],
      [T1].[publishedAt] AS [publishedAt],
      [T1.user].[id] AS [user.id],
      [T1.user].[name] AS [user.name],
      [T1.user].[email] AS [user.email],
      [T1.user].[age] AS [user.age],
      [T1.user].[isActive] AS [user.isActive],
      [T1.user].[companyId] AS [user.companyId],
      [T1.user].[createdAt] AS [user.createdAt]
    FROM [TestDb].[TestSchema].[Post] AS [T1]
    LEFT OUTER JOIN [TestDb].[TestSchema].[User] AS [T1.user] ON (([T1.user].[id] IS NULL AND [T1].[userId] IS NULL) OR [T1.user].[id] = [T1].[userId])
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      "T1"."userId" AS "userId",
      "T1"."title" AS "title",
      "T1"."content" AS "content",
      "T1"."viewCount" AS "viewCount",
      "T1"."publishedAt" AS "publishedAt",
      "T1.user"."id" AS "user.id",
      "T1.user"."name" AS "user.name",
      "T1.user"."email" AS "user.email",
      "T1.user"."age" AS "user.age",
      "T1.user"."isActive" AS "user.isActive",
      "T1.user"."companyId" AS "user.companyId",
      "T1.user"."createdAt" AS "user.createdAt"
    FROM "TestSchema"."Post" AS "T1"
    LEFT OUTER JOIN "TestSchema"."User" AS "T1.user" ON "T1.user"."id" IS NOT DISTINCT FROM "T1"."userId"
  `,
};

export const includeFkt: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      \`T1\`.\`name\` AS \`name\`,
      \`T1\`.\`email\` AS \`email\`,
      \`T1\`.\`age\` AS \`age\`,
      \`T1\`.\`isActive\` AS \`isActive\`,
      \`T1\`.\`companyId\` AS \`companyId\`,
      \`T1\`.\`createdAt\` AS \`createdAt\`,
      \`T1.posts\`.\`id\` AS \`posts.id\`,
      \`T1.posts\`.\`userId\` AS \`posts.userId\`,
      \`T1.posts\`.\`title\` AS \`posts.title\`,
      \`T1.posts\`.\`content\` AS \`posts.content\`,
      \`T1.posts\`.\`viewCount\` AS \`posts.viewCount\`,
      \`T1.posts\`.\`publishedAt\` AS \`posts.publishedAt\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
    LEFT OUTER JOIN \`TestDb\`.\`Post\` AS \`T1.posts\` ON \`T1.posts\`.\`userId\` <=> \`T1\`.\`id\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      [T1].[name] AS [name],
      [T1].[email] AS [email],
      [T1].[age] AS [age],
      [T1].[isActive] AS [isActive],
      [T1].[companyId] AS [companyId],
      [T1].[createdAt] AS [createdAt],
      [T1.posts].[id] AS [posts.id],
      [T1.posts].[userId] AS [posts.userId],
      [T1.posts].[title] AS [posts.title],
      [T1.posts].[content] AS [posts.content],
      [T1.posts].[viewCount] AS [posts.viewCount],
      [T1.posts].[publishedAt] AS [posts.publishedAt]
    FROM [TestDb].[TestSchema].[User] AS [T1]
    LEFT OUTER JOIN [TestDb].[TestSchema].[Post] AS [T1.posts] ON (([T1.posts].[userId] IS NULL AND [T1].[id] IS NULL) OR [T1.posts].[userId] = [T1].[id])
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      "T1"."name" AS "name",
      "T1"."email" AS "email",
      "T1"."age" AS "age",
      "T1"."isActive" AS "isActive",
      "T1"."companyId" AS "companyId",
      "T1"."createdAt" AS "createdAt",
      "T1.posts"."id" AS "posts.id",
      "T1.posts"."userId" AS "posts.userId",
      "T1.posts"."title" AS "posts.title",
      "T1.posts"."content" AS "posts.content",
      "T1.posts"."viewCount" AS "posts.viewCount",
      "T1.posts"."publishedAt" AS "posts.publishedAt"
    FROM "TestSchema"."User" AS "T1"
    LEFT OUTER JOIN "TestSchema"."Post" AS "T1.posts" ON "T1.posts"."userId" IS NOT DISTINCT FROM "T1"."id"
  `,
};

export const include3Depth: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      \`T1\`.\`userId\` AS \`userId\`,
      \`T1\`.\`title\` AS \`title\`,
      \`T1\`.\`content\` AS \`content\`,
      \`T1\`.\`viewCount\` AS \`viewCount\`,
      \`T1\`.\`publishedAt\` AS \`publishedAt\`,
      \`T1.user\`.\`id\` AS \`user.id\`,
      \`T1.user\`.\`name\` AS \`user.name\`,
      \`T1.user\`.\`email\` AS \`user.email\`,
      \`T1.user\`.\`age\` AS \`user.age\`,
      \`T1.user\`.\`isActive\` AS \`user.isActive\`,
      \`T1.user\`.\`companyId\` AS \`user.companyId\`,
      \`T1.user\`.\`createdAt\` AS \`user.createdAt\`,
      \`T1.user.posts\`.\`id\` AS \`user.posts.id\`,
      \`T1.user.posts\`.\`userId\` AS \`user.posts.userId\`,
      \`T1.user.posts\`.\`title\` AS \`user.posts.title\`,
      \`T1.user.posts\`.\`content\` AS \`user.posts.content\`,
      \`T1.user.posts\`.\`viewCount\` AS \`user.posts.viewCount\`,
      \`T1.user.posts\`.\`publishedAt\` AS \`user.posts.publishedAt\`,
      \`T1.user.posts.user\`.\`id\` AS \`user.posts.user.id\`,
      \`T1.user.posts.user\`.\`name\` AS \`user.posts.user.name\`,
      \`T1.user.posts.user\`.\`email\` AS \`user.posts.user.email\`,
      \`T1.user.posts.user\`.\`age\` AS \`user.posts.user.age\`,
      \`T1.user.posts.user\`.\`isActive\` AS \`user.posts.user.isActive\`,
      \`T1.user.posts.user\`.\`companyId\` AS \`user.posts.user.companyId\`,
      \`T1.user.posts.user\`.\`createdAt\` AS \`user.posts.user.createdAt\`
    FROM \`TestDb\`.\`Post\` AS \`T1\`
    LEFT OUTER JOIN \`TestDb\`.\`User\` AS \`T1.user\` ON \`T1.user\`.\`id\` <=> \`T1\`.\`userId\`
    LEFT OUTER JOIN \`TestDb\`.\`Post\` AS \`T1.user.posts\` ON \`T1.user.posts\`.\`userId\` <=> \`T1.user\`.\`id\`
    LEFT OUTER JOIN \`TestDb\`.\`User\` AS \`T1.user.posts.user\` ON \`T1.user.posts.user\`.\`id\` <=> \`T1.user.posts\`.\`userId\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      [T1].[userId] AS [userId],
      [T1].[title] AS [title],
      [T1].[content] AS [content],
      [T1].[viewCount] AS [viewCount],
      [T1].[publishedAt] AS [publishedAt],
      [T1.user].[id] AS [user.id],
      [T1.user].[name] AS [user.name],
      [T1.user].[email] AS [user.email],
      [T1.user].[age] AS [user.age],
      [T1.user].[isActive] AS [user.isActive],
      [T1.user].[companyId] AS [user.companyId],
      [T1.user].[createdAt] AS [user.createdAt],
      [T1.user.posts].[id] AS [user.posts.id],
      [T1.user.posts].[userId] AS [user.posts.userId],
      [T1.user.posts].[title] AS [user.posts.title],
      [T1.user.posts].[content] AS [user.posts.content],
      [T1.user.posts].[viewCount] AS [user.posts.viewCount],
      [T1.user.posts].[publishedAt] AS [user.posts.publishedAt],
      [T1.user.posts.user].[id] AS [user.posts.user.id],
      [T1.user.posts.user].[name] AS [user.posts.user.name],
      [T1.user.posts.user].[email] AS [user.posts.user.email],
      [T1.user.posts.user].[age] AS [user.posts.user.age],
      [T1.user.posts.user].[isActive] AS [user.posts.user.isActive],
      [T1.user.posts.user].[companyId] AS [user.posts.user.companyId],
      [T1.user.posts.user].[createdAt] AS [user.posts.user.createdAt]
    FROM [TestDb].[TestSchema].[Post] AS [T1]
    LEFT OUTER JOIN [TestDb].[TestSchema].[User] AS [T1.user] ON (([T1.user].[id] IS NULL AND [T1].[userId] IS NULL) OR [T1.user].[id] = [T1].[userId])
    LEFT OUTER JOIN [TestDb].[TestSchema].[Post] AS [T1.user.posts] ON (([T1.user.posts].[userId] IS NULL AND [T1.user].[id] IS NULL) OR [T1.user.posts].[userId] = [T1.user].[id])
    LEFT OUTER JOIN [TestDb].[TestSchema].[User] AS [T1.user.posts.user] ON (([T1.user.posts.user].[id] IS NULL AND [T1.user.posts].[userId] IS NULL) OR [T1.user.posts.user].[id] = [T1.user.posts].[userId])
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      "T1"."userId" AS "userId",
      "T1"."title" AS "title",
      "T1"."content" AS "content",
      "T1"."viewCount" AS "viewCount",
      "T1"."publishedAt" AS "publishedAt",
      "T1.user"."id" AS "user.id",
      "T1.user"."name" AS "user.name",
      "T1.user"."email" AS "user.email",
      "T1.user"."age" AS "user.age",
      "T1.user"."isActive" AS "user.isActive",
      "T1.user"."companyId" AS "user.companyId",
      "T1.user"."createdAt" AS "user.createdAt",
      "T1.user.posts"."id" AS "user.posts.id",
      "T1.user.posts"."userId" AS "user.posts.userId",
      "T1.user.posts"."title" AS "user.posts.title",
      "T1.user.posts"."content" AS "user.posts.content",
      "T1.user.posts"."viewCount" AS "user.posts.viewCount",
      "T1.user.posts"."publishedAt" AS "user.posts.publishedAt",
      "T1.user.posts.user"."id" AS "user.posts.user.id",
      "T1.user.posts.user"."name" AS "user.posts.user.name",
      "T1.user.posts.user"."email" AS "user.posts.user.email",
      "T1.user.posts.user"."age" AS "user.posts.user.age",
      "T1.user.posts.user"."isActive" AS "user.posts.user.isActive",
      "T1.user.posts.user"."companyId" AS "user.posts.user.companyId",
      "T1.user.posts.user"."createdAt" AS "user.posts.user.createdAt"
    FROM "TestSchema"."Post" AS "T1"
    LEFT OUTER JOIN "TestSchema"."User" AS "T1.user" ON "T1.user"."id" IS NOT DISTINCT FROM "T1"."userId"
    LEFT OUTER JOIN "TestSchema"."Post" AS "T1.user.posts" ON "T1.user.posts"."userId" IS NOT DISTINCT FROM "T1.user"."id"
    LEFT OUTER JOIN "TestSchema"."User" AS "T1.user.posts.user" ON "T1.user.posts.user"."id" IS NOT DISTINCT FROM "T1.user.posts"."userId"
  `,
};

//#endregion
