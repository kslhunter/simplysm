/**
 * SELECT - Recursive CTE test expected SQL
 */
import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

//#region ========== Basic 재귀 CTE ==========

export const basicSubordinates: ExpectedSql = {
  mysql: mysql`
    WITH \`T2\` AS (
      SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`name\` AS \`name\`, \`T1\`.\`managerId\` AS \`managerId\`, 1 AS \`depth\`
      FROM \`TestDb\`.\`Employee\` AS \`T1\`
      WHERE \`T1\`.\`managerId\` <=> 1
      UNION ALL
      SELECT \`T2\`.\`id\` AS \`id\`, \`T2\`.\`name\` AS \`name\`, \`T2\`.\`managerId\` AS \`managerId\`, \`T2.self\`.\`depth\` + 1 AS \`depth\`
      FROM \`TestDb\`.\`Employee\` AS \`T2\`
      LEFT OUTER JOIN \`T2\` AS \`T2.self\` ON TRUE
      WHERE \`T2\`.\`managerId\` <=> \`T2.self\`.\`id\`
    )
    SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`name\` AS \`name\`, \`T1\`.\`managerId\` AS \`managerId\`, \`T1\`.\`depth\` AS \`depth\`
    FROM \`T2\` AS \`T1\`
  `,
  mssql: tsql`
    WITH [T2] AS (
      SELECT [T1].[id] AS [id], [T1].[name] AS [name], [T1].[managerId] AS [managerId], 1 AS [depth]
      FROM [TestDb].[TestSchema].[Employee] AS [T1]
      WHERE (([T1].[managerId] IS NULL AND 1 IS NULL) OR [T1].[managerId] = 1)
      UNION ALL
      SELECT [T2].[id] AS [id], [T2].[name] AS [name], [T2].[managerId] AS [managerId], [T2.self].[depth] + 1 AS [depth]
      FROM [TestDb].[TestSchema].[Employee] AS [T2]
      LEFT OUTER JOIN [T2] AS [T2.self] ON 1 = 1
      WHERE (([T2].[managerId] IS NULL AND [T2.self].[id] IS NULL) OR [T2].[managerId] = [T2.self].[id])
    )
    SELECT [T1].[id] AS [id], [T1].[name] AS [name], [T1].[managerId] AS [managerId], [T1].[depth] AS [depth]
    FROM [T2] AS [T1]
  `,
  postgresql: pgsql`
    WITH RECURSIVE "T2" AS (
      SELECT "T1"."id" AS "id", "T1"."name" AS "name", "T1"."managerId" AS "managerId", 1 AS "depth"
      FROM "TestSchema"."Employee" AS "T1"
      WHERE "T1"."managerId" IS NOT DISTINCT FROM 1
      UNION ALL
      SELECT "T2"."id" AS "id", "T2"."name" AS "name", "T2"."managerId" AS "managerId", "T2.self"."depth" + 1 AS "depth"
      FROM "TestSchema"."Employee" AS "T2"
      LEFT OUTER JOIN "T2" AS "T2.self" ON TRUE
      WHERE "T2"."managerId" IS NOT DISTINCT FROM "T2.self"."id"
    )
    SELECT "T1"."id" AS "id", "T1"."name" AS "name", "T1"."managerId" AS "managerId", "T1"."depth" AS "depth"
    FROM "T2" AS "T1"
  `,
};

export const depthLimit: ExpectedSql = {
  mysql: mysql`
    WITH \`T2\` AS (
      SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`name\` AS \`name\`, 1 AS \`depth\`
      FROM \`TestDb\`.\`Employee\` AS \`T1\`
      WHERE \`T1\`.\`managerId\` <=> 1
      UNION ALL
      SELECT \`T2\`.\`id\` AS \`id\`, \`T2\`.\`name\` AS \`name\`, \`T2.self\`.\`depth\` + 1 AS \`depth\`
      FROM \`TestDb\`.\`Employee\` AS \`T2\`
      LEFT OUTER JOIN \`T2\` AS \`T2.self\` ON TRUE
      WHERE \`T2\`.\`managerId\` <=> \`T2.self\`.\`id\` AND \`T2.self\`.\`depth\` < 3
    )
    SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`name\` AS \`name\`, \`T1\`.\`depth\` AS \`depth\`
    FROM \`T2\` AS \`T1\`
  `,
  mssql: tsql`
    WITH [T2] AS (
      SELECT [T1].[id] AS [id], [T1].[name] AS [name], 1 AS [depth]
      FROM [TestDb].[TestSchema].[Employee] AS [T1]
      WHERE (([T1].[managerId] IS NULL AND 1 IS NULL) OR [T1].[managerId] = 1)
      UNION ALL
      SELECT [T2].[id] AS [id], [T2].[name] AS [name], [T2.self].[depth] + 1 AS [depth]
      FROM [TestDb].[TestSchema].[Employee] AS [T2]
      LEFT OUTER JOIN [T2] AS [T2.self] ON 1 = 1
      WHERE (([T2].[managerId] IS NULL AND [T2.self].[id] IS NULL) OR [T2].[managerId] = [T2.self].[id]) AND [T2.self].[depth] < 3
    )
    SELECT [T1].[id] AS [id], [T1].[name] AS [name], [T1].[depth] AS [depth]
    FROM [T2] AS [T1]
  `,
  postgresql: pgsql`
    WITH RECURSIVE "T2" AS (
      SELECT "T1"."id" AS "id", "T1"."name" AS "name", 1 AS "depth"
      FROM "TestSchema"."Employee" AS "T1"
      WHERE "T1"."managerId" IS NOT DISTINCT FROM 1
      UNION ALL
      SELECT "T2"."id" AS "id", "T2"."name" AS "name", "T2.self"."depth" + 1 AS "depth"
      FROM "TestSchema"."Employee" AS "T2"
      LEFT OUTER JOIN "T2" AS "T2.self" ON TRUE
      WHERE "T2"."managerId" IS NOT DISTINCT FROM "T2.self"."id" AND "T2.self"."depth" < 3
    )
    SELECT "T1"."id" AS "id", "T1"."name" AS "name", "T1"."depth" AS "depth"
    FROM "T2" AS "T1"
  `,
};

export const upwardManagers: ExpectedSql = {
  mysql: mysql`
    WITH \`T2\` AS (
      SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`name\` AS \`name\`, \`T1\`.\`managerId\` AS \`managerId\`, 0 AS \`level\`
      FROM \`TestDb\`.\`Employee\` AS \`T1\`
      WHERE \`T1\`.\`id\` <=> 100
      UNION ALL
      SELECT \`T2\`.\`id\` AS \`id\`, \`T2\`.\`name\` AS \`name\`, \`T2\`.\`managerId\` AS \`managerId\`, \`T2.self\`.\`level\` - 1 AS \`level\`
      FROM \`TestDb\`.\`Employee\` AS \`T2\`
      LEFT OUTER JOIN \`T2\` AS \`T2.self\` ON TRUE
      WHERE \`T2\`.\`id\` <=> \`T2.self\`.\`managerId\`
    )
    SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`name\` AS \`name\`, \`T1\`.\`level\` AS \`level\`
    FROM \`T2\` AS \`T1\`
  `,
  mssql: tsql`
    WITH [T2] AS (
      SELECT [T1].[id] AS [id], [T1].[name] AS [name], [T1].[managerId] AS [managerId], 0 AS [level]
      FROM [TestDb].[TestSchema].[Employee] AS [T1]
      WHERE (([T1].[id] IS NULL AND 100 IS NULL) OR [T1].[id] = 100)
      UNION ALL
      SELECT [T2].[id] AS [id], [T2].[name] AS [name], [T2].[managerId] AS [managerId], [T2.self].[level] - 1 AS [level]
      FROM [TestDb].[TestSchema].[Employee] AS [T2]
      LEFT OUTER JOIN [T2] AS [T2.self] ON 1 = 1
      WHERE (([T2].[id] IS NULL AND [T2.self].[managerId] IS NULL) OR [T2].[id] = [T2.self].[managerId])
    )
    SELECT [T1].[id] AS [id], [T1].[name] AS [name], [T1].[level] AS [level]
    FROM [T2] AS [T1]
  `,
  postgresql: pgsql`
    WITH RECURSIVE "T2" AS (
      SELECT "T1"."id" AS "id", "T1"."name" AS "name", "T1"."managerId" AS "managerId", 0 AS "level"
      FROM "TestSchema"."Employee" AS "T1"
      WHERE "T1"."id" IS NOT DISTINCT FROM 100
      UNION ALL
      SELECT "T2"."id" AS "id", "T2"."name" AS "name", "T2"."managerId" AS "managerId", "T2.self"."level" - 1 AS "level"
      FROM "TestSchema"."Employee" AS "T2"
      LEFT OUTER JOIN "T2" AS "T2.self" ON TRUE
      WHERE "T2"."id" IS NOT DISTINCT FROM "T2.self"."managerId"
    )
    SELECT "T1"."id" AS "id", "T1"."name" AS "name", "T1"."level" AS "level"
    FROM "T2" AS "T1"
  `,
};

//#endregion

//#region ========== CTE + 후processing ==========

export const cteWithOrderBy: ExpectedSql = {
  mysql: mysql`
    WITH \`T2\` AS (
      SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`name\` AS \`name\`, 1 AS \`depth\`
      FROM \`TestDb\`.\`Employee\` AS \`T1\`
      WHERE \`T1\`.\`managerId\` <=> 1
      UNION ALL
      SELECT \`T2\`.\`id\` AS \`id\`, \`T2\`.\`name\` AS \`name\`, \`T2.self\`.\`depth\` + 1 AS \`depth\`
      FROM \`TestDb\`.\`Employee\` AS \`T2\`
      LEFT OUTER JOIN \`T2\` AS \`T2.self\` ON TRUE
      WHERE \`T2\`.\`managerId\` <=> \`T2.self\`.\`id\`
    )
    SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`name\` AS \`name\`, \`T1\`.\`depth\` AS \`depth\`
    FROM \`T2\` AS \`T1\`
    ORDER BY \`T1\`.\`depth\` ASC, \`T1\`.\`name\` ASC
  `,
  mssql: tsql`
    WITH [T2] AS (
      SELECT [T1].[id] AS [id], [T1].[name] AS [name], 1 AS [depth]
      FROM [TestDb].[TestSchema].[Employee] AS [T1]
      WHERE (([T1].[managerId] IS NULL AND 1 IS NULL) OR [T1].[managerId] = 1)
      UNION ALL
      SELECT [T2].[id] AS [id], [T2].[name] AS [name], [T2.self].[depth] + 1 AS [depth]
      FROM [TestDb].[TestSchema].[Employee] AS [T2]
      LEFT OUTER JOIN [T2] AS [T2.self] ON 1 = 1
      WHERE (([T2].[managerId] IS NULL AND [T2.self].[id] IS NULL) OR [T2].[managerId] = [T2.self].[id])
    )
    SELECT [T1].[id] AS [id], [T1].[name] AS [name], [T1].[depth] AS [depth]
    FROM [T2] AS [T1]
    ORDER BY [T1].[depth] ASC, [T1].[name] ASC
  `,
  postgresql: pgsql`
    WITH RECURSIVE "T2" AS (
      SELECT "T1"."id" AS "id", "T1"."name" AS "name", 1 AS "depth"
      FROM "TestSchema"."Employee" AS "T1"
      WHERE "T1"."managerId" IS NOT DISTINCT FROM 1
      UNION ALL
      SELECT "T2"."id" AS "id", "T2"."name" AS "name", "T2.self"."depth" + 1 AS "depth"
      FROM "TestSchema"."Employee" AS "T2"
      LEFT OUTER JOIN "T2" AS "T2.self" ON TRUE
      WHERE "T2"."managerId" IS NOT DISTINCT FROM "T2.self"."id"
    )
    SELECT "T1"."id" AS "id", "T1"."name" AS "name", "T1"."depth" AS "depth"
    FROM "T2" AS "T1"
    ORDER BY "T1"."depth" ASC, "T1"."name" ASC
  `,
};

export const cteWithWhere: ExpectedSql = {
  mysql: mysql`
    WITH \`T2\` AS (
      SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`name\` AS \`name\`, 1 AS \`depth\`
      FROM \`TestDb\`.\`Employee\` AS \`T1\`
      WHERE \`T1\`.\`managerId\` <=> 1
      UNION ALL
      SELECT \`T2\`.\`id\` AS \`id\`, \`T2\`.\`name\` AS \`name\`, \`T2.self\`.\`depth\` + 1 AS \`depth\`
      FROM \`TestDb\`.\`Employee\` AS \`T2\`
      LEFT OUTER JOIN \`T2\` AS \`T2.self\` ON TRUE
      WHERE \`T2\`.\`managerId\` <=> \`T2.self\`.\`id\`
    )
    SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`name\` AS \`name\`, \`T1\`.\`depth\` AS \`depth\`
    FROM \`T2\` AS \`T1\`
    WHERE \`T1\`.\`depth\` > 1
  `,
  mssql: tsql`
    WITH [T2] AS (
      SELECT [T1].[id] AS [id], [T1].[name] AS [name], 1 AS [depth]
      FROM [TestDb].[TestSchema].[Employee] AS [T1]
      WHERE (([T1].[managerId] IS NULL AND 1 IS NULL) OR [T1].[managerId] = 1)
      UNION ALL
      SELECT [T2].[id] AS [id], [T2].[name] AS [name], [T2.self].[depth] + 1 AS [depth]
      FROM [TestDb].[TestSchema].[Employee] AS [T2]
      LEFT OUTER JOIN [T2] AS [T2.self] ON 1 = 1
      WHERE (([T2].[managerId] IS NULL AND [T2.self].[id] IS NULL) OR [T2].[managerId] = [T2.self].[id])
    )
    SELECT [T1].[id] AS [id], [T1].[name] AS [name], [T1].[depth] AS [depth]
    FROM [T2] AS [T1]
    WHERE [T1].[depth] > 1
  `,
  postgresql: pgsql`
    WITH RECURSIVE "T2" AS (
      SELECT "T1"."id" AS "id", "T1"."name" AS "name", 1 AS "depth"
      FROM "TestSchema"."Employee" AS "T1"
      WHERE "T1"."managerId" IS NOT DISTINCT FROM 1
      UNION ALL
      SELECT "T2"."id" AS "id", "T2"."name" AS "name", "T2.self"."depth" + 1 AS "depth"
      FROM "TestSchema"."Employee" AS "T2"
      LEFT OUTER JOIN "T2" AS "T2.self" ON TRUE
      WHERE "T2"."managerId" IS NOT DISTINCT FROM "T2.self"."id"
    )
    SELECT "T1"."id" AS "id", "T1"."name" AS "name", "T1"."depth" AS "depth"
    FROM "T2" AS "T1"
    WHERE "T1"."depth" > 1
  `,
};

//#endregion
