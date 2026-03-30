import { mysql, pgsql, tsql, DateTime, DateOnly, Time, Uuid } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

// For DateTime value tests
export const testDateTime = new DateTime(2024, 1, 15, 10, 30, 0);
export const testDateOnly = new DateOnly(2024, 1, 15);
export const testTime = new Time(10, 30, 0);
export const testUuid = new Uuid("12345678-1234-1234-1234-123456789012");

export const eqNull: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE \`T1\`.\`email\` <=> NULL
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE (([T1].[email] IS NULL AND NULL IS NULL) OR [T1].[email] = NULL)
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE "T1"."email" IS NOT DISTINCT FROM NULL
  `,
};

export const eqValue: ExpectedSql = {
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
    WHERE "T1"."id" IS NOT DISTINCT FROM 1
  `,
};

export const gt: ExpectedSql = {
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

export const lt: ExpectedSql = {
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

export const gte: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE \`T1\`.\`age\` >= 18
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE [T1].[age] >= 18
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE "T1"."age" >= 18
  `,
};

export const lte: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE \`T1\`.\`age\` <= 65
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE [T1].[age] <= 65
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE "T1"."age" <= 65
  `,
};

export const between: ExpectedSql = {
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

export const betweenFromOnly: ExpectedSql = {
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

export const betweenToOnly: ExpectedSql = {
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

export const betweenNone: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE 1=1
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE 1=1
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE TRUE
  `,
};

export const betweenColumns: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`MonthlySales\` AS \`T1\`
    WHERE \`T1\`.\`feb\` BETWEEN \`T1\`.\`jan\` AND \`T1\`.\`mar\`
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[MonthlySales] AS [T1]
    WHERE [T1].[feb] BETWEEN [T1].[jan] AND [T1].[mar]
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."MonthlySales" AS "T1"
    WHERE "T1"."feb" BETWEEN "T1"."jan" AND "T1"."mar"
  `,
};

export const regexpMysqlPostgresql: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE \`T1\`.\`name\` REGEXP '^test.*'
  `,
  mssql: tsql``,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE "T1"."name" ~ '^test.*'
  `,
};

export const inEmpty: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE 1=0
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE 1=0
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE FALSE
  `,
};

//#region ========== DateTime/DateOnly/Time Value Tests ==========

export const eqDateTime: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE \`T1\`.\`createdAt\` <=> '2024-01-15 10:30:00'
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE (([T1].[createdAt] IS NULL AND '2024-01-15 10:30:00' IS NULL) OR [T1].[createdAt] = '2024-01-15 10:30:00')
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    WHERE "T1"."createdAt" IS NOT DISTINCT FROM '2024-01-15 10:30:00'::timestamp
  `,
};

//#endregion

//#region ========== inQuery Tests ==========

export const inQuery: ExpectedSql = {
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
