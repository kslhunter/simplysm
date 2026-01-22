import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

export const rowNumber: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      \`T1\`.\`name\` AS \`name\`,
      \`T1\`.\`departmentId\` AS \`departmentId\`,
      ROW_NUMBER() OVER (PARTITION BY \`T1\`.\`departmentId\` ORDER BY \`T1\`.\`id\` ASC) AS \`rowNum\`
    FROM \`TestDb\`.\`Employee\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      [T1].[name] AS [name],
      [T1].[departmentId] AS [departmentId],
      ROW_NUMBER() OVER (PARTITION BY [T1].[departmentId] ORDER BY [T1].[id] ASC) AS [rowNum]
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      "T1"."name" AS "name",
      "T1"."departmentId" AS "departmentId",
      ROW_NUMBER() OVER (PARTITION BY "T1"."departmentId" ORDER BY "T1"."id" ASC) AS "rowNum"
    FROM "TestSchema"."Employee" AS "T1"
  `,
};

export const rank: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      \`T1\`.\`name\` AS \`name\`,
      RANK() OVER (ORDER BY \`T1\`.\`id\` DESC) AS \`rank\`
    FROM \`TestDb\`.\`Employee\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      [T1].[name] AS [name],
      RANK() OVER (ORDER BY [T1].[id] DESC) AS [rank]
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      "T1"."name" AS "name",
      RANK() OVER (ORDER BY "T1"."id" DESC) AS "rank"
    FROM "TestSchema"."Employee" AS "T1"
  `,
};

export const denseRank: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      DENSE_RANK() OVER (ORDER BY \`T1\`.\`id\` DESC) AS \`denseRank\`
    FROM \`TestDb\`.\`Employee\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      DENSE_RANK() OVER (ORDER BY [T1].[id] DESC) AS [denseRank]
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      DENSE_RANK() OVER (ORDER BY "T1"."id" DESC) AS "denseRank"
    FROM "TestSchema"."Employee" AS "T1"
  `,
};

export const ntile: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      NTILE(4) OVER (ORDER BY \`T1\`.\`id\` DESC) AS \`quartile\`
    FROM \`TestDb\`.\`Employee\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      NTILE(4) OVER (ORDER BY [T1].[id] DESC) AS [quartile]
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      NTILE(4) OVER (ORDER BY "T1"."id" DESC) AS "quartile"
    FROM "TestSchema"."Employee" AS "T1"
  `,
};

export const lag: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      \`T1\`.\`name\` AS \`name\`,
      LAG(\`T1\`.\`id\`, 1) OVER (PARTITION BY \`T1\`.\`departmentId\` ORDER BY \`T1\`.\`id\` ASC) AS \`prevId\`
    FROM \`TestDb\`.\`Employee\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      [T1].[name] AS [name],
      LAG([T1].[id], 1) OVER (PARTITION BY [T1].[departmentId] ORDER BY [T1].[id] ASC) AS [prevId]
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      "T1"."name" AS "name",
      LAG("T1"."id", 1) OVER (PARTITION BY "T1"."departmentId" ORDER BY "T1"."id" ASC) AS "prevId"
    FROM "TestSchema"."Employee" AS "T1"
  `,
};

export const lead: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      LEAD(\`T1\`.\`id\`, 1) OVER (ORDER BY \`T1\`.\`id\` ASC) AS \`nextId\`
    FROM \`TestDb\`.\`Employee\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      LEAD([T1].[id], 1) OVER (ORDER BY [T1].[id] ASC) AS [nextId]
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      LEAD("T1"."id", 1) OVER (ORDER BY "T1"."id" ASC) AS "nextId"
    FROM "TestSchema"."Employee" AS "T1"
  `,
};

export const lagWithDefault: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      LAG(\`T1\`.\`id\`, 1, 0) OVER (ORDER BY \`T1\`.\`id\` ASC) AS \`prevId\`
    FROM \`TestDb\`.\`Employee\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      LAG([T1].[id], 1, 0) OVER (ORDER BY [T1].[id] ASC) AS [prevId]
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      LAG("T1"."id", 1, 0) OVER (ORDER BY "T1"."id" ASC) AS "prevId"
    FROM "TestSchema"."Employee" AS "T1"
  `,
};

export const leadWithDefault: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      LEAD(\`T1\`.\`id\`, 1, -1) OVER (ORDER BY \`T1\`.\`id\` ASC) AS \`nextId\`
    FROM \`TestDb\`.\`Employee\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      LEAD([T1].[id], 1, -1) OVER (ORDER BY [T1].[id] ASC) AS [nextId]
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      LEAD("T1"."id", 1, -1) OVER (ORDER BY "T1"."id" ASC) AS "nextId"
    FROM "TestSchema"."Employee" AS "T1"
  `,
};

export const sumOver: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      SUM(\`T1\`.\`id\`) OVER (PARTITION BY \`T1\`.\`departmentId\` ORDER BY \`T1\`.\`id\` ASC) AS \`runningTotal\`
    FROM \`TestDb\`.\`Employee\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      SUM([T1].[id]) OVER (PARTITION BY [T1].[departmentId] ORDER BY [T1].[id] ASC) AS [runningTotal]
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      SUM("T1"."id") OVER (PARTITION BY "T1"."departmentId" ORDER BY "T1"."id" ASC) AS "runningTotal"
    FROM "TestSchema"."Employee" AS "T1"
  `,
};

export const avgOver: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      AVG(\`T1\`.\`id\`) OVER (PARTITION BY \`T1\`.\`departmentId\`) AS \`avgId\`
    FROM \`TestDb\`.\`Employee\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      AVG([T1].[id]) OVER (PARTITION BY [T1].[departmentId]) AS [avgId]
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      AVG("T1"."id") OVER (PARTITION BY "T1"."departmentId") AS "avgId"
    FROM "TestSchema"."Employee" AS "T1"
  `,
};

export const countOver: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      COUNT(*) OVER (PARTITION BY \`T1\`.\`departmentId\`) AS \`deptCount\`
    FROM \`TestDb\`.\`Employee\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      COUNT(*) OVER (PARTITION BY [T1].[departmentId]) AS [deptCount]
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      COUNT(*) OVER (PARTITION BY "T1"."departmentId") AS "deptCount"
    FROM "TestSchema"."Employee" AS "T1"
  `,
};

export const firstLastValue: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      FIRST_VALUE(\`T1\`.\`name\`) OVER (PARTITION BY \`T1\`.\`departmentId\` ORDER BY \`T1\`.\`id\` ASC) AS \`firstInDept\`,
      LAST_VALUE(\`T1\`.\`name\`) OVER (PARTITION BY \`T1\`.\`departmentId\` ORDER BY \`T1\`.\`id\` ASC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS \`lastInDept\`
    FROM \`TestDb\`.\`Employee\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      FIRST_VALUE([T1].[name]) OVER (PARTITION BY [T1].[departmentId] ORDER BY [T1].[id] ASC) AS [firstInDept],
      LAST_VALUE([T1].[name]) OVER (PARTITION BY [T1].[departmentId] ORDER BY [T1].[id] ASC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS [lastInDept]
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      FIRST_VALUE("T1"."name") OVER (PARTITION BY "T1"."departmentId" ORDER BY "T1"."id" ASC) AS "firstInDept",
      LAST_VALUE("T1"."name") OVER (PARTITION BY "T1"."departmentId" ORDER BY "T1"."id" ASC ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS "lastInDept"
    FROM "TestSchema"."Employee" AS "T1"
  `,
};

export const combined: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      \`T1\`.\`name\` AS \`name\`,
      ROW_NUMBER() OVER (PARTITION BY \`T1\`.\`departmentId\` ORDER BY \`T1\`.\`id\` ASC) AS \`rowNum\`,
      RANK() OVER (PARTITION BY \`T1\`.\`departmentId\` ORDER BY \`T1\`.\`id\` DESC) AS \`rank\`,
      LAG(\`T1\`.\`name\`, 1) OVER (PARTITION BY \`T1\`.\`departmentId\` ORDER BY \`T1\`.\`id\` ASC) AS \`prevName\`
    FROM \`TestDb\`.\`Employee\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      [T1].[name] AS [name],
      ROW_NUMBER() OVER (PARTITION BY [T1].[departmentId] ORDER BY [T1].[id] ASC) AS [rowNum],
      RANK() OVER (PARTITION BY [T1].[departmentId] ORDER BY [T1].[id] DESC) AS [rank],
      LAG([T1].[name], 1) OVER (PARTITION BY [T1].[departmentId] ORDER BY [T1].[id] ASC) AS [prevName]
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      "T1"."name" AS "name",
      ROW_NUMBER() OVER (PARTITION BY "T1"."departmentId" ORDER BY "T1"."id" ASC) AS "rowNum",
      RANK() OVER (PARTITION BY "T1"."departmentId" ORDER BY "T1"."id" DESC) AS "rank",
      LAG("T1"."name", 1) OVER (PARTITION BY "T1"."departmentId" ORDER BY "T1"."id" ASC) AS "prevName"
    FROM "TestSchema"."Employee" AS "T1"
  `,
};

//#region ========== MIN/MAX OVER ==========

export const minOver: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      MIN(\`T1\`.\`id\`) OVER (PARTITION BY \`T1\`.\`departmentId\`) AS \`minId\`
    FROM \`TestDb\`.\`Employee\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      MIN([T1].[id]) OVER (PARTITION BY [T1].[departmentId]) AS [minId]
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      MIN("T1"."id") OVER (PARTITION BY "T1"."departmentId") AS "minId"
    FROM "TestSchema"."Employee" AS "T1"
  `,
};

export const maxOver: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      MAX(\`T1\`.\`id\`) OVER (PARTITION BY \`T1\`.\`departmentId\`) AS \`maxId\`
    FROM \`TestDb\`.\`Employee\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      MAX([T1].[id]) OVER (PARTITION BY [T1].[departmentId]) AS [maxId]
    FROM [TestDb].[TestSchema].[Employee] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      MAX("T1"."id") OVER (PARTITION BY "T1"."departmentId") AS "maxId"
    FROM "TestSchema"."Employee" AS "T1"
  `,
};

//#endregion
