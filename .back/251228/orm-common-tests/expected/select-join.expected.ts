import { TDialect } from "../../src/types/column-primitive";
import { mysql, pgsql, tsql } from "@simplysm/sd-core-common";

type ExpectedSql = Record<TDialect, string>;

// ============================================
// 기본 join (1:N) - User -> Posts
// ============================================
export const basicJoin: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`,
      \`TBL.posts\`.\`id\` as \`posts.id\`,
      \`TBL.posts\`.\`userId\` as \`posts.userId\`,
      \`TBL.posts\`.\`title\` as \`posts.title\`,
      \`TBL.posts\`.\`content\` as \`posts.content\`,
      \`TBL.posts\`.\`viewCount\` as \`posts.viewCount\`,
      \`TBL.posts\`.\`publishedAt\` as \`posts.publishedAt\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    LEFT OUTER JOIN \`TestDb\`.\`Post\` as \`TBL.posts\` ON \`TBL.posts\`.\`userId\` <=> \`TBL\`.\`id\`
  `,
  mssql: tsql`
    SELECT
      [TBL].[id] as [id],
      [TBL].[name] as [name],
      [TBL].[email] as [email],
      [TBL].[age] as [age],
      [TBL].[isActive] as [isActive],
      [TBL].[companyId] as [companyId],
      [TBL].[createdAt] as [createdAt],
      [TBL.posts].[id] as [posts.id],
      [TBL.posts].[userId] as [posts.userId],
      [TBL.posts].[title] as [posts.title],
      [TBL.posts].[content] as [posts.content],
      [TBL.posts].[viewCount] as [posts.viewCount],
      [TBL.posts].[publishedAt] as [posts.publishedAt]
    FROM [TestDb].[dbo].[User] as [TBL]
    LEFT OUTER JOIN [TestDb].[dbo].[Post] as [TBL.posts] ON (([TBL.posts].[userId] IS NULL AND [TBL].[id] IS NULL) OR [TBL.posts].[userId] = [TBL].[id])
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."id" as "id",
      "TBL"."name" as "name",
      "TBL"."email" as "email",
      "TBL"."age" as "age",
      "TBL"."isActive" as "isActive",
      "TBL"."companyId" as "companyId",
      "TBL"."createdAt" as "createdAt",
      "TBL.posts"."id" as "posts.id",
      "TBL.posts"."userId" as "posts.userId",
      "TBL.posts"."title" as "posts.title",
      "TBL.posts"."content" as "posts.content",
      "TBL.posts"."viewCount" as "posts.viewCount",
      "TBL.posts"."publishedAt" as "posts.publishedAt"
    FROM "TestDb"."public"."User" as "TBL"
    LEFT OUTER JOIN "TestDb"."public"."Post" as "TBL.posts" ON (("TBL.posts"."userId" IS NULL AND "TBL"."id" IS NULL) OR "TBL.posts"."userId" = "TBL"."id")
  `,
};

// ============================================
// joinSingle (N:1) - Post -> User
// ============================================
export const joinSingle: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL.user\`.\`name\` as \`userName\`
    FROM \`TestDb\`.\`Post\` as \`TBL\`
    LEFT OUTER JOIN \`TestDb\`.\`User\` as \`TBL.user\` ON \`TBL.user\`.\`id\` <=> \`TBL\`.\`userId\`
  `,
  mssql: tsql`
    SELECT
      [TBL.user].[name] as [userName]
    FROM [TestDb].[dbo].[Post] as [TBL]
    LEFT OUTER JOIN [TestDb].[dbo].[User] as [TBL.user] ON (([TBL.user].[id] IS NULL AND [TBL].[userId] IS NULL) OR [TBL.user].[id] = [TBL].[userId])
  `,
  postgresql: pgsql`
    SELECT
      "TBL.user"."name" as "userName"
    FROM "TestDb"."public"."Post" as "TBL"
    LEFT OUTER JOIN "TestDb"."public"."User" as "TBL.user" ON (("TBL.user"."id" IS NULL AND "TBL"."userId" IS NULL) OR "TBL.user"."id" = "TBL"."userId")
  `,
};

// ============================================
// join with where 조건
// ============================================
export const joinWithWhere: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`,
      \`TBL.posts\`.\`id\` as \`posts.id\`,
      \`TBL.posts\`.\`userId\` as \`posts.userId\`,
      \`TBL.posts\`.\`title\` as \`posts.title\`,
      \`TBL.posts\`.\`content\` as \`posts.content\`,
      \`TBL.posts\`.\`viewCount\` as \`posts.viewCount\`,
      \`TBL.posts\`.\`publishedAt\` as \`posts.publishedAt\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    LEFT OUTER JOIN \`TestDb\`.\`Post\` as \`TBL.posts\` ON \`TBL.posts\`.\`userId\` <=> \`TBL\`.\`id\` AND \`TBL.posts\`.\`viewCount\` > 100
  `,
  mssql: tsql`
    SELECT
      [TBL].[id] as [id],
      [TBL].[name] as [name],
      [TBL].[email] as [email],
      [TBL].[age] as [age],
      [TBL].[isActive] as [isActive],
      [TBL].[companyId] as [companyId],
      [TBL].[createdAt] as [createdAt],
      [TBL.posts].[id] as [posts.id],
      [TBL.posts].[userId] as [posts.userId],
      [TBL.posts].[title] as [posts.title],
      [TBL.posts].[content] as [posts.content],
      [TBL.posts].[viewCount] as [posts.viewCount],
      [TBL.posts].[publishedAt] as [posts.publishedAt]
    FROM [TestDb].[dbo].[User] as [TBL]
    LEFT OUTER JOIN [TestDb].[dbo].[Post] as [TBL.posts] ON (([TBL.posts].[userId] IS NULL AND [TBL].[id] IS NULL) OR [TBL.posts].[userId] = [TBL].[id]) AND [TBL.posts].[viewCount] > 100
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."id" as "id",
      "TBL"."name" as "name",
      "TBL"."email" as "email",
      "TBL"."age" as "age",
      "TBL"."isActive" as "isActive",
      "TBL"."companyId" as "companyId",
      "TBL"."createdAt" as "createdAt",
      "TBL.posts"."id" as "posts.id",
      "TBL.posts"."userId" as "posts.userId",
      "TBL.posts"."title" as "posts.title",
      "TBL.posts"."content" as "posts.content",
      "TBL.posts"."viewCount" as "posts.viewCount",
      "TBL.posts"."publishedAt" as "posts.publishedAt"
    FROM "TestDb"."public"."User" as "TBL"
    LEFT OUTER JOIN "TestDb"."public"."Post" as "TBL.posts" ON (("TBL.posts"."userId" IS NULL AND "TBL"."id" IS NULL) OR "TBL.posts"."userId" = "TBL"."id") AND "TBL.posts"."viewCount" > 100
  `,
};

// ============================================
// join with select (특정 컬럼만)
// ============================================
export const joinWithSelect: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL.posts\`.\`id\` as \`posts.id\`,
      \`TBL.posts\`.\`title\` as \`posts.title\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    LEFT OUTER JOIN LATERAL (
      SELECT
        \`TBL.posts\`.\`id\` as \`id\`,
        \`TBL.posts\`.\`title\` as \`title\`
      FROM \`TestDb\`.\`Post\` as \`TBL.posts\`
      WHERE \`TBL.posts\`.\`userId\` <=> \`TBL\`.\`id\`
    ) as \`TBL.posts\` ON 1=1
  `,
  mssql: tsql`
    SELECT
      [TBL].[id] as [id],
      [TBL].[name] as [name],
      [TBL.posts].[id] as [posts.id],
      [TBL.posts].[title] as [posts.title]
    FROM [TestDb].[dbo].[User] as [TBL]
    OUTER APPLY (
      SELECT
        [TBL.posts].[id] as [id],
        [TBL.posts].[title] as [title]
      FROM [TestDb].[dbo].[Post] as [TBL.posts]
      WHERE (([TBL.posts].[userId] IS NULL AND [TBL].[id] IS NULL) OR [TBL.posts].[userId] = [TBL].[id])
    ) as [TBL.posts]
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."id" as "id",
      "TBL"."name" as "name",
      "TBL.posts"."id" as "posts.id",
      "TBL.posts"."title" as "posts.title"
    FROM "TestDb"."public"."User" as "TBL"
    LEFT OUTER JOIN LATERAL (
      SELECT
        "TBL.posts"."id" as "id",
        "TBL.posts"."title" as "title"
      FROM "TestDb"."public"."Post" as "TBL.posts"
      WHERE (("TBL.posts"."userId" IS NULL AND "TBL"."id" IS NULL) OR "TBL.posts"."userId" = "TBL"."id")
    ) as "TBL.posts" ON TRUE
  `,
};

// ============================================
// 메인 쿼리에 WHERE 조건 (join과 함께)
// ============================================
export const mainWhereWithJoin: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`,
      \`TBL.posts\`.\`id\` as \`posts.id\`,
      \`TBL.posts\`.\`userId\` as \`posts.userId\`,
      \`TBL.posts\`.\`title\` as \`posts.title\`,
      \`TBL.posts\`.\`content\` as \`posts.content\`,
      \`TBL.posts\`.\`viewCount\` as \`posts.viewCount\`,
      \`TBL.posts\`.\`publishedAt\` as \`posts.publishedAt\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    LEFT OUTER JOIN \`TestDb\`.\`Post\` as \`TBL.posts\` ON \`TBL.posts\`.\`userId\` <=> \`TBL\`.\`id\`
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
      [TBL].[createdAt] as [createdAt],
      [TBL.posts].[id] as [posts.id],
      [TBL.posts].[userId] as [posts.userId],
      [TBL.posts].[title] as [posts.title],
      [TBL.posts].[content] as [posts.content],
      [TBL.posts].[viewCount] as [posts.viewCount],
      [TBL.posts].[publishedAt] as [posts.publishedAt]
    FROM [TestDb].[dbo].[User] as [TBL]
    LEFT OUTER JOIN [TestDb].[dbo].[Post] as [TBL.posts] ON (([TBL.posts].[userId] IS NULL AND [TBL].[id] IS NULL) OR [TBL.posts].[userId] = [TBL].[id])
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
      "TBL"."createdAt" as "createdAt",
      "TBL.posts"."id" as "posts.id",
      "TBL.posts"."userId" as "posts.userId",
      "TBL.posts"."title" as "posts.title",
      "TBL.posts"."content" as "posts.content",
      "TBL.posts"."viewCount" as "posts.viewCount",
      "TBL.posts"."publishedAt" as "posts.publishedAt"
    FROM "TestDb"."public"."User" as "TBL"
    LEFT OUTER JOIN "TestDb"."public"."Post" as "TBL.posts" ON (("TBL.posts"."userId" IS NULL AND "TBL"."id" IS NULL) OR "TBL.posts"."userId" = "TBL"."id")
    WHERE "TBL"."isActive" = TRUE
  `,
};

// ============================================
// join 후 select로 컬럼 선택
// ============================================
export const joinThenSelect: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`userId\`,
      \`TBL\`.\`name\` as \`userName\`,
      \`TBL.posts\`.\`title\` as \`postTitle\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    LEFT OUTER JOIN \`TestDb\`.\`Post\` as \`TBL.posts\` ON \`TBL.posts\`.\`userId\` <=> \`TBL\`.\`id\`
  `,
  mssql: tsql`
    SELECT
      [TBL].[id] as [userId],
      [TBL].[name] as [userName],
      [TBL.posts].[title] as [postTitle]
    FROM [TestDb].[dbo].[User] as [TBL]
    LEFT OUTER JOIN [TestDb].[dbo].[Post] as [TBL.posts] ON (([TBL.posts].[userId] IS NULL AND [TBL].[id] IS NULL) OR [TBL.posts].[userId] = [TBL].[id])
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."id" as "userId",
      "TBL"."name" as "userName",
      "TBL.posts"."title" as "postTitle"
    FROM "TestDb"."public"."User" as "TBL"
    LEFT OUTER JOIN "TestDb"."public"."Post" as "TBL.posts" ON (("TBL.posts"."userId" IS NULL AND "TBL"."id" IS NULL) OR "TBL.posts"."userId" = "TBL"."id")
  `,
};

// ============================================
// 다단계 JOIN (Post → User → Company)
// ============================================
export const multiLevelJoin: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`title\` as \`postTitle\`,
      \`TBL.user\`.\`name\` as \`userName\`,
      \`TBL.user\`.\`companyName\` as \`companyName\`
    FROM \`TestDb\`.\`Post\` as \`TBL\`
    LEFT OUTER JOIN LATERAL (
      SELECT
        \`TBL.user\`.\`name\` as \`name\`,
        \`TBL.user.company\`.\`name\` as \`companyName\`
      FROM \`TestDb\`.\`User\` as \`TBL.user\`
      LEFT OUTER JOIN \`TestDb\`.\`Company\` as \`TBL.user.company\` ON \`TBL.user.company\`.\`id\` <=> \`TBL.user\`.\`companyId\`
      WHERE \`TBL.user\`.\`id\` <=> \`TBL\`.\`userId\`
    ) as \`TBL.user\` ON 1=1
  `,
  mssql: tsql`
    SELECT
      [TBL].[title] as [postTitle],
      [TBL.user].[name] as [userName],
      [TBL.user].[companyName] as [companyName]
    FROM [TestDb].[dbo].[Post] as [TBL]
    OUTER APPLY (
      SELECT
        [TBL.user].[name] as [name],
        [TBL.user.company].[name] as [companyName]
      FROM [TestDb].[dbo].[User] as [TBL.user]
      LEFT OUTER JOIN [TestDb].[dbo].[Company] as [TBL.user.company] ON (([TBL.user.company].[id] IS NULL AND [TBL.user].[companyId] IS NULL) OR [TBL.user.company].[id] = [TBL.user].[companyId])
      WHERE (([TBL.user].[id] IS NULL AND [TBL].[userId] IS NULL) OR [TBL.user].[id] = [TBL].[userId])
    ) as [TBL.user]
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."title" as "postTitle",
      "TBL.user"."name" as "userName",
      "TBL.user"."companyName" as "companyName"
    FROM "TestDb"."public"."Post" as "TBL"
    LEFT OUTER JOIN LATERAL (
      SELECT
        "TBL.user"."name" as "name",
        "TBL.user.company"."name" as "companyName"
      FROM "TestDb"."public"."User" as "TBL.user"
      LEFT OUTER JOIN "TestDb"."public"."Company" as "TBL.user.company" ON (("TBL.user.company"."id" IS NULL AND "TBL.user"."companyId" IS NULL) OR "TBL.user.company"."id" = "TBL.user"."companyId")
      WHERE (("TBL.user"."id" IS NULL AND "TBL"."userId" IS NULL) OR "TBL.user"."id" = "TBL"."userId")
    ) as "TBL.user" ON TRUE
  `,
};

// ============================================
// 중첩 join (1:N -> 1:N) - Company -> Users -> Orders
// ============================================
export const nestedJoin: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`foundedAt\` as \`foundedAt\`,
      \`TBL.users\`.\`id\` as \`users.id\`,
      \`TBL.users\`.\`name\` as \`users.name\`,
      \`TBL.users\`.\`email\` as \`users.email\`,
      \`TBL.users\`.\`age\` as \`users.age\`,
      \`TBL.users\`.\`isActive\` as \`users.isActive\`,
      \`TBL.users\`.\`companyId\` as \`users.companyId\`,
      \`TBL.users\`.\`createdAt\` as \`users.createdAt\`,
      \`TBL.users\`.\`orders.id\` as \`users.orders.id\`,
      \`TBL.users\`.\`orders.userId\` as \`users.orders.userId\`,
      \`TBL.users\`.\`orders.amount\` as \`users.orders.amount\`,
      \`TBL.users\`.\`orders.createdAt\` as \`users.orders.createdAt\`
    FROM \`TestDb\`.\`Company\` as \`TBL\`
    LEFT OUTER JOIN LATERAL (
      SELECT
        \`TBL.users\`.\`id\` as \`id\`,
        \`TBL.users\`.\`name\` as \`name\`,
        \`TBL.users\`.\`email\` as \`email\`,
        \`TBL.users\`.\`age\` as \`age\`,
        \`TBL.users\`.\`isActive\` as \`isActive\`,
        \`TBL.users\`.\`companyId\` as \`companyId\`,
        \`TBL.users\`.\`createdAt\` as \`createdAt\`,
        \`TBL.users.orders\`.\`id\` as \`orders.id\`,
        \`TBL.users.orders\`.\`userId\` as \`orders.userId\`,
        \`TBL.users.orders\`.\`amount\` as \`orders.amount\`,
        \`TBL.users.orders\`.\`createdAt\` as \`orders.createdAt\`
      FROM \`TestDb\`.\`User\` as \`TBL.users\`
      LEFT OUTER JOIN \`TestDb\`.\`Order\` as \`TBL.users.orders\` ON \`TBL.users.orders\`.\`userId\` <=> \`TBL.users\`.\`id\`
      WHERE \`TBL.users\`.\`companyId\` <=> \`TBL\`.\`id\`
    ) as \`TBL.users\` ON 1=1
  `,
  mssql: tsql`
    SELECT
      [TBL].[id] as [id],
      [TBL].[name] as [name],
      [TBL].[foundedAt] as [foundedAt],
      [TBL.users].[id] as [users.id],
      [TBL.users].[name] as [users.name],
      [TBL.users].[email] as [users.email],
      [TBL.users].[age] as [users.age],
      [TBL.users].[isActive] as [users.isActive],
      [TBL.users].[companyId] as [users.companyId],
      [TBL.users].[createdAt] as [users.createdAt],
      [TBL.users].[orders.id] as [users.orders.id],
      [TBL.users].[orders.userId] as [users.orders.userId],
      [TBL.users].[orders.amount] as [users.orders.amount],
      [TBL.users].[orders.createdAt] as [users.orders.createdAt]
    FROM [TestDb].[dbo].[Company] as [TBL]
    OUTER APPLY (
      SELECT
        [TBL.users].[id] as [id],
        [TBL.users].[name] as [name],
        [TBL.users].[email] as [email],
        [TBL.users].[age] as [age],
        [TBL.users].[isActive] as [isActive],
        [TBL.users].[companyId] as [companyId],
        [TBL.users].[createdAt] as [createdAt],
        [TBL.users.orders].[id] as [orders.id],
        [TBL.users.orders].[userId] as [orders.userId],
        [TBL.users.orders].[amount] as [orders.amount],
        [TBL.users.orders].[createdAt] as [orders.createdAt]
      FROM [TestDb].[dbo].[User] as [TBL.users]
      LEFT OUTER JOIN [TestDb].[dbo].[Order] as [TBL.users.orders] ON (([TBL.users.orders].[userId] IS NULL AND [TBL.users].[id] IS NULL) OR [TBL.users.orders].[userId] = [TBL.users].[id])
      WHERE (([TBL.users].[companyId] IS NULL AND [TBL].[id] IS NULL) OR [TBL.users].[companyId] = [TBL].[id])
    ) as [TBL.users]
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."id" as "id",
      "TBL"."name" as "name",
      "TBL"."foundedAt" as "foundedAt",
      "TBL.users"."id" as "users.id",
      "TBL.users"."name" as "users.name",
      "TBL.users"."email" as "users.email",
      "TBL.users"."age" as "users.age",
      "TBL.users"."isActive" as "users.isActive",
      "TBL.users"."companyId" as "users.companyId",
      "TBL.users"."createdAt" as "users.createdAt",
      "TBL.users"."orders.id" as "users.orders.id",
      "TBL.users"."orders.userId" as "users.orders.userId",
      "TBL.users"."orders.amount" as "users.orders.amount",
      "TBL.users"."orders.createdAt" as "users.orders.createdAt"
    FROM "TestDb"."public"."Company" as "TBL"
    LEFT OUTER JOIN LATERAL (
      SELECT
        "TBL.users"."id" as "id",
        "TBL.users"."name" as "name",
        "TBL.users"."email" as "email",
        "TBL.users"."age" as "age",
        "TBL.users"."isActive" as "isActive",
        "TBL.users"."companyId" as "companyId",
        "TBL.users"."createdAt" as "createdAt",
        "TBL.users.orders"."id" as "orders.id",
        "TBL.users.orders"."userId" as "orders.userId",
        "TBL.users.orders"."amount" as "orders.amount",
        "TBL.users.orders"."createdAt" as "orders.createdAt"
      FROM "TestDb"."public"."User" as "TBL.users"
      LEFT OUTER JOIN "TestDb"."public"."Order" as "TBL.users.orders" ON (("TBL.users.orders"."userId" IS NULL AND "TBL.users"."id" IS NULL) OR "TBL.users.orders"."userId" = "TBL.users"."id")
      WHERE (("TBL.users"."companyId" IS NULL AND "TBL"."id" IS NULL) OR "TBL.users"."companyId" = "TBL"."id")
    ) as "TBL.users" ON TRUE
  `,
};

// ============================================
// 중첩 joinSingle (N:1 -> N:1) - Order -> User -> Company
// ============================================
export const nestedJoinSingle: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`userId\` as \`userId\`,
      \`TBL\`.\`amount\` as \`amount\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`,
      \`TBL.user\`.\`id\` as \`user.id\`,
      \`TBL.user\`.\`name\` as \`user.name\`,
      \`TBL.user\`.\`email\` as \`user.email\`,
      \`TBL.user\`.\`age\` as \`user.age\`,
      \`TBL.user\`.\`isActive\` as \`user.isActive\`,
      \`TBL.user\`.\`companyId\` as \`user.companyId\`,
      \`TBL.user\`.\`createdAt\` as \`user.createdAt\`,
      \`TBL.user\`.\`company.id\` as \`user.company.id\`,
      \`TBL.user\`.\`company.name\` as \`user.company.name\`,
      \`TBL.user\`.\`company.foundedAt\` as \`user.company.foundedAt\`
    FROM \`TestDb\`.\`Order\` as \`TBL\`
    LEFT OUTER JOIN LATERAL (
      SELECT
        \`TBL.user\`.\`id\` as \`id\`,
        \`TBL.user\`.\`name\` as \`name\`,
        \`TBL.user\`.\`email\` as \`email\`,
        \`TBL.user\`.\`age\` as \`age\`,
        \`TBL.user\`.\`isActive\` as \`isActive\`,
        \`TBL.user\`.\`companyId\` as \`companyId\`,
        \`TBL.user\`.\`createdAt\` as \`createdAt\`,
        \`TBL.user.company\`.\`id\` as \`company.id\`,
        \`TBL.user.company\`.\`name\` as \`company.name\`,
        \`TBL.user.company\`.\`foundedAt\` as \`company.foundedAt\`
      FROM \`TestDb\`.\`User\` as \`TBL.user\`
      LEFT OUTER JOIN \`TestDb\`.\`Company\` as \`TBL.user.company\` ON \`TBL.user.company\`.\`id\` <=> \`TBL.user\`.\`companyId\`
      WHERE \`TBL.user\`.\`id\` <=> \`TBL\`.\`userId\`
    ) as \`TBL.user\` ON 1=1
  `,
  mssql: tsql`
    SELECT
      [TBL].[id] as [id],
      [TBL].[userId] as [userId],
      [TBL].[amount] as [amount],
      [TBL].[createdAt] as [createdAt],
      [TBL.user].[id] as [user.id],
      [TBL.user].[name] as [user.name],
      [TBL.user].[email] as [user.email],
      [TBL.user].[age] as [user.age],
      [TBL.user].[isActive] as [user.isActive],
      [TBL.user].[companyId] as [user.companyId],
      [TBL.user].[createdAt] as [user.createdAt],
      [TBL.user].[company.id] as [user.company.id],
      [TBL.user].[company.name] as [user.company.name],
      [TBL.user].[company.foundedAt] as [user.company.foundedAt]
    FROM [TestDb].[dbo].[Order] as [TBL]
    OUTER APPLY (
      SELECT
        [TBL.user].[id] as [id],
        [TBL.user].[name] as [name],
        [TBL.user].[email] as [email],
        [TBL.user].[age] as [age],
        [TBL.user].[isActive] as [isActive],
        [TBL.user].[companyId] as [companyId],
        [TBL.user].[createdAt] as [createdAt],
        [TBL.user.company].[id] as [company.id],
        [TBL.user.company].[name] as [company.name],
        [TBL.user.company].[foundedAt] as [company.foundedAt]
      FROM [TestDb].[dbo].[User] as [TBL.user]
      LEFT OUTER JOIN [TestDb].[dbo].[Company] as [TBL.user.company] ON (([TBL.user.company].[id] IS NULL AND [TBL.user].[companyId] IS NULL) OR [TBL.user.company].[id] = [TBL.user].[companyId])
      WHERE (([TBL.user].[id] IS NULL AND [TBL].[userId] IS NULL) OR [TBL.user].[id] = [TBL].[userId])
    ) as [TBL.user]
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."id" as "id",
      "TBL"."userId" as "userId",
      "TBL"."amount" as "amount",
      "TBL"."createdAt" as "createdAt",
      "TBL.user"."id" as "user.id",
      "TBL.user"."name" as "user.name",
      "TBL.user"."email" as "user.email",
      "TBL.user"."age" as "user.age",
      "TBL.user"."isActive" as "user.isActive",
      "TBL.user"."companyId" as "user.companyId",
      "TBL.user"."createdAt" as "user.createdAt",
      "TBL.user"."company.id" as "user.company.id",
      "TBL.user"."company.name" as "user.company.name",
      "TBL.user"."company.foundedAt" as "user.company.foundedAt"
    FROM "TestDb"."public"."Order" as "TBL"
    LEFT OUTER JOIN LATERAL (
      SELECT
        "TBL.user"."id" as "id",
        "TBL.user"."name" as "name",
        "TBL.user"."email" as "email",
        "TBL.user"."age" as "age",
        "TBL.user"."isActive" as "isActive",
        "TBL.user"."companyId" as "companyId",
        "TBL.user"."createdAt" as "createdAt",
        "TBL.user.company"."id" as "company.id",
        "TBL.user.company"."name" as "company.name",
        "TBL.user.company"."foundedAt" as "company.foundedAt"
      FROM "TestDb"."public"."User" as "TBL.user"
      LEFT OUTER JOIN "TestDb"."public"."Company" as "TBL.user.company" ON (("TBL.user.company"."id" IS NULL AND "TBL.user"."companyId" IS NULL) OR "TBL.user.company"."id" = "TBL.user"."companyId")
      WHERE (("TBL.user"."id" IS NULL AND "TBL"."userId" IS NULL) OR "TBL.user"."id" = "TBL"."userId")
    ) as "TBL.user" ON TRUE
  `,
};

// ============================================
// 병렬 join - User -> Company, Orders (동일 레벨에서 두 개의 join)
// ============================================
export const parallelJoins: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`name\` as \`name\`,
      \`TBL\`.\`email\` as \`email\`,
      \`TBL\`.\`age\` as \`age\`,
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`companyId\` as \`companyId\`,
      \`TBL\`.\`createdAt\` as \`createdAt\`,
      \`TBL.company\`.\`id\` as \`company.id\`,
      \`TBL.company\`.\`name\` as \`company.name\`,
      \`TBL.company\`.\`foundedAt\` as \`company.foundedAt\`,
      \`TBL.orders\`.\`id\` as \`orders.id\`,
      \`TBL.orders\`.\`userId\` as \`orders.userId\`,
      \`TBL.orders\`.\`amount\` as \`orders.amount\`,
      \`TBL.orders\`.\`createdAt\` as \`orders.createdAt\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    LEFT OUTER JOIN \`TestDb\`.\`Company\` as \`TBL.company\` ON \`TBL.company\`.\`id\` <=> \`TBL\`.\`companyId\`
    LEFT OUTER JOIN \`TestDb\`.\`Order\` as \`TBL.orders\` ON \`TBL.orders\`.\`userId\` <=> \`TBL\`.\`id\`
  `,
  mssql: tsql`
    SELECT
      [TBL].[id] as [id],
      [TBL].[name] as [name],
      [TBL].[email] as [email],
      [TBL].[age] as [age],
      [TBL].[isActive] as [isActive],
      [TBL].[companyId] as [companyId],
      [TBL].[createdAt] as [createdAt],
      [TBL.company].[id] as [company.id],
      [TBL.company].[name] as [company.name],
      [TBL.company].[foundedAt] as [company.foundedAt],
      [TBL.orders].[id] as [orders.id],
      [TBL.orders].[userId] as [orders.userId],
      [TBL.orders].[amount] as [orders.amount],
      [TBL.orders].[createdAt] as [orders.createdAt]
    FROM [TestDb].[dbo].[User] as [TBL]
    LEFT OUTER JOIN [TestDb].[dbo].[Company] as [TBL.company] ON (([TBL.company].[id] IS NULL AND [TBL].[companyId] IS NULL) OR [TBL.company].[id] = [TBL].[companyId])
    LEFT OUTER JOIN [TestDb].[dbo].[Order] as [TBL.orders] ON (([TBL.orders].[userId] IS NULL AND [TBL].[id] IS NULL) OR [TBL.orders].[userId] = [TBL].[id])
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."id" as "id",
      "TBL"."name" as "name",
      "TBL"."email" as "email",
      "TBL"."age" as "age",
      "TBL"."isActive" as "isActive",
      "TBL"."companyId" as "companyId",
      "TBL"."createdAt" as "createdAt",
      "TBL.company"."id" as "company.id",
      "TBL.company"."name" as "company.name",
      "TBL.company"."foundedAt" as "company.foundedAt",
      "TBL.orders"."id" as "orders.id",
      "TBL.orders"."userId" as "orders.userId",
      "TBL.orders"."amount" as "orders.amount",
      "TBL.orders"."createdAt" as "orders.createdAt"
    FROM "TestDb"."public"."User" as "TBL"
    LEFT OUTER JOIN "TestDb"."public"."Company" as "TBL.company" ON (("TBL.company"."id" IS NULL AND "TBL"."companyId" IS NULL) OR "TBL.company"."id" = "TBL"."companyId")
    LEFT OUTER JOIN "TestDb"."public"."Order" as "TBL.orders" ON (("TBL.orders"."userId" IS NULL AND "TBL"."id" IS NULL) OR "TBL.orders"."userId" = "TBL"."id")
  `,
};
