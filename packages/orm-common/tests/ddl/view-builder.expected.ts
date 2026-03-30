import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

export const queryBasic: ExpectedSql = {
  mysql: mysql`
    CREATE OR REPLACE VIEW \`TestDb\`.\`TestView\` AS
    SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`name\` AS \`name\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    CREATE OR ALTER VIEW [TestDb].[TestSchema].[TestView] AS
    SELECT [T1].[id] AS [id], [T1].[name] AS [name]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    CREATE OR REPLACE VIEW "TestSchema"."TestView" AS
    SELECT "T1"."id" AS "id", "T1"."name" AS "name"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const combined: ExpectedSql = {
  mysql: mysql`
    CREATE OR REPLACE VIEW \`CustomDb\`.\`TestView\` AS
    SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`email\` AS \`email\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    CREATE OR ALTER VIEW [CustomDb].[CustomSchema].[TestView] AS
    SELECT [T1].[id] AS [id], [T1].[email] AS [email]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    CREATE OR REPLACE VIEW "CustomSchema"."TestView" AS
    SELECT "T1"."id" AS "id", "T1"."email" AS "email"
    FROM "TestSchema"."User" AS "T1"
  `,
};
