/**
 * SELECT - ORDER BY test expected SQL
 */
import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

//#region ========== Basic ORDER BY ==========

export const orderAscDefault: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    ORDER BY \`T1\`.\`id\`
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    ORDER BY [T1].[id]
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    ORDER BY "T1"."id"
  `,
};

export const orderAscExplicit: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    ORDER BY \`T1\`.\`id\` ASC
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    ORDER BY [T1].[id] ASC
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    ORDER BY "T1"."id" ASC
  `,
};

export const orderDesc: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    ORDER BY \`T1\`.\`id\` DESC
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    ORDER BY [T1].[id] DESC
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    ORDER BY "T1"."id" DESC
  `,
};

//#endregion

//#region ========== Multiple Sort ==========

export const orderMultiple: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    ORDER BY \`T1\`.\`name\` ASC, \`T1\`.\`id\` DESC
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    ORDER BY [T1].[name] ASC, [T1].[id] DESC
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    ORDER BY "T1"."name" ASC, "T1"."id" DESC
  `,
};

//#endregion

//#region ========== Expression Sort ==========

export const orderExpression: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    ORDER BY CHAR_LENGTH(IFNULL(\`T1\`.\`name\`, '')) DESC
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    ORDER BY LEN(ISNULL([T1].[name], N'')) DESC
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    ORDER BY LENGTH(COALESCE("T1"."name", '')) DESC
  `,
};

//#endregion

//#region ========== Combination ==========

export const orderSelectCombo: ExpectedSql = {
  mysql: mysql`
    SELECT \`T1\`.\`id\` AS \`id\`, \`T1\`.\`name\` AS \`name\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
    ORDER BY \`T1\`.\`name\` ASC
  `,
  mssql: tsql`
    SELECT [T1].[id] AS [id], [T1].[name] AS [name]
    FROM [TestDb].[TestSchema].[User] AS [T1]
    ORDER BY [T1].[name] ASC
  `,
  postgresql: pgsql`
    SELECT "T1"."id" AS "id", "T1"."name" AS "name"
    FROM "TestSchema"."User" AS "T1"
    ORDER BY "T1"."name" ASC
  `,
};

export const orderLimitCombo: ExpectedSql = {
  mysql: mysql`
    SELECT *
    FROM \`TestDb\`.\`User\` AS \`T1\`
    ORDER BY \`T1\`.\`id\` DESC
    LIMIT 0, 10
  `,
  mssql: tsql`
    SELECT *
    FROM [TestDb].[TestSchema].[User] AS [T1]
    ORDER BY [T1].[id] DESC
    OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY
  `,
  postgresql: pgsql`
    SELECT *
    FROM "TestSchema"."User" AS "T1"
    ORDER BY "T1"."id" DESC
    LIMIT 10 OFFSET 0
  `,
};

//#endregion
