import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

//#region ========== View - Basic ==========

export const viewSelect: ExpectedSql = {
  mysql: mysql`SELECT * FROM \`TestDb\`.\`ActiveUsers\` AS \`T1\``,
  mssql: tsql`SELECT * FROM [TestDb].[TestSchema].[ActiveUsers] AS [T1]`,
  postgresql: pgsql`SELECT * FROM "TestSchema"."ActiveUsers" AS "T1"`,
};

export const viewSelectWhere: ExpectedSql = {
  mysql: mysql`
    SELECT * FROM \`TestDb\`.\`ActiveUsers\` AS \`T1\`
    WHERE \`T1\`.\`age\` > 20
  `,
  mssql: tsql`
    SELECT * FROM [TestDb].[TestSchema].[ActiveUsers] AS [T1]
    WHERE [T1].[age] > 20
  `,
  postgresql: pgsql`
    SELECT * FROM "TestSchema"."ActiveUsers" AS "T1"
    WHERE "T1"."age" > 20
  `,
};

export const viewSelectColumns: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      \`T1\`.\`name\` AS \`name\`
    FROM \`TestDb\`.\`ActiveUsers\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT
      [T1].[id] AS [id],
      [T1].[name] AS [name]
    FROM [TestDb].[TestSchema].[ActiveUsers] AS [T1]
  `,
  postgresql: pgsql`
    SELECT
      "T1"."id" AS "id",
      "T1"."name" AS "name"
    FROM "TestSchema"."ActiveUsers" AS "T1"
  `,
};

export const viewSelectOrderBy: ExpectedSql = {
  mysql: mysql`
    SELECT * FROM \`TestDb\`.\`ActiveUsers\` AS \`T1\`
    ORDER BY \`T1\`.\`name\` ASC
  `,
  mssql: tsql`
    SELECT * FROM [TestDb].[TestSchema].[ActiveUsers] AS [T1]
    ORDER BY [T1].[name] ASC
  `,
  postgresql: pgsql`
    SELECT * FROM "TestSchema"."ActiveUsers" AS "T1"
    ORDER BY "T1"."name" ASC
  `,
};

export const viewSelectOrderByLimit: ExpectedSql = {
  mysql: mysql`
    SELECT * FROM \`TestDb\`.\`ActiveUsers\` AS \`T1\`
    ORDER BY \`T1\`.\`id\`
    LIMIT 0, 10
  `,
  mssql: tsql`
    SELECT * FROM [TestDb].[TestSchema].[ActiveUsers] AS [T1]
    ORDER BY [T1].[id]
    OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
  `,
  postgresql: pgsql`
    SELECT * FROM "TestSchema"."ActiveUsers" AS "T1"
    ORDER BY "T1"."id"
    LIMIT 10 OFFSET 0
  `,
};

//#endregion

//#region ========== View - SELECT가 있는 뷰 ==========

export const userSummarySelect: ExpectedSql = {
  mysql: mysql`SELECT * FROM \`TestDb\`.\`UserSummary\` AS \`T1\``,
  mssql: tsql`SELECT * FROM [TestDb].[TestSchema].[UserSummary] AS [T1]`,
  postgresql: pgsql`SELECT * FROM "TestSchema"."UserSummary" AS "T1"`,
};

export const userSummarySelectColumn: ExpectedSql = {
  mysql: mysql`
    SELECT \`T1\`.\`name\` AS \`userName\`
    FROM \`TestDb\`.\`UserSummary\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT [T1].[name] AS [userName]
    FROM [TestDb].[TestSchema].[UserSummary] AS [T1]
  `,
  postgresql: pgsql`
    SELECT "T1"."name" AS "userName"
    FROM "TestSchema"."UserSummary" AS "T1"
  `,
};

//#endregion

//#region ========== View - DDL ==========

export const createActiveUsersView: ExpectedSql = {
  mysql: mysql`
    CREATE OR REPLACE VIEW \`TestDb\`.\`ActiveUsers\` AS
    SELECT * FROM \`TestDb\`.\`User\` AS \`T1\`
    WHERE \`T1\`.\`isActive\` <=> TRUE
  `,
  mssql: tsql`
    CREATE OR ALTER VIEW [TestDb].[TestSchema].[ActiveUsers] AS
    SELECT * FROM [TestDb].[TestSchema].[User] AS [T1]
    WHERE (([T1].[isActive] IS NULL AND 1 IS NULL) OR [T1].[isActive] = 1)
  `,
  postgresql: pgsql`
    CREATE OR REPLACE VIEW "TestSchema"."ActiveUsers" AS
    SELECT * FROM "TestSchema"."User" AS "T1"
    WHERE "T1"."isActive" IS NOT DISTINCT FROM TRUE
  `,
};

export const createUserSummaryView: ExpectedSql = {
  mysql: mysql`
    CREATE OR REPLACE VIEW \`TestDb\`.\`UserSummary\` AS
    SELECT
      \`T1\`.\`id\` AS \`id\`,
      \`T1\`.\`name\` AS \`name\`,
      \`T1\`.\`email\` AS \`email\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    CREATE OR ALTER VIEW [TestDb].[TestSchema].[UserSummary] AS
    SELECT
      [T1].[id] AS [id],
      [T1].[name] AS [name],
      [T1].[email] AS [email]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    CREATE OR REPLACE VIEW "TestSchema"."UserSummary" AS
    SELECT
      "T1"."id" AS "id",
      "T1"."name" AS "name",
      "T1"."email" AS "email"
    FROM "TestSchema"."User" AS "T1"
  `,
};

//#endregion
