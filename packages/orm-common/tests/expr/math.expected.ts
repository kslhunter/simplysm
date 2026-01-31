import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

export const abs: ExpectedSql = {
  mysql: mysql`
    SELECT ABS(\`T1\`.\`age\`) AS \`absAge\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT ABS([T1].[age]) AS [absAge]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT ABS("T1"."age") AS "absAge"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const round: ExpectedSql = {
  mysql: mysql`
    SELECT ROUND(\`T1\`.\`age\`, 2) AS \`rounded\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT ROUND([T1].[age], 2) AS [rounded]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT ROUND("T1"."age", 2) AS "rounded"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const ceil: ExpectedSql = {
  mysql: mysql`
    SELECT CEIL(\`T1\`.\`age\`) AS \`ceiled\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT CEILING([T1].[age]) AS [ceiled]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT CEIL("T1"."age") AS "ceiled"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const floor: ExpectedSql = {
  mysql: mysql`
    SELECT FLOOR(\`T1\`.\`age\`) AS \`floored\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT FLOOR([T1].[age]) AS [floored]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT FLOOR("T1"."age") AS "floored"
    FROM "TestSchema"."User" AS "T1"
  `,
};
