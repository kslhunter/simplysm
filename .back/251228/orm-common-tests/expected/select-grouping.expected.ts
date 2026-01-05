import { TDialect } from "../../src/types/column-primitive";
import { mysql, pgsql, tsql } from "@simplysm/sd-core-common";

type ExpectedSql = Record<TDialect, string>;

// ============================================
// groupBy 단일 컬럼
// ============================================
export const groupBySingle: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`isActive\` as \`isActive\`,
      COUNT(DISTINCT(\`TBL\`.\`id\`)) as \`cnt\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    GROUP BY \`TBL\`.\`isActive\`
  `,
  mssql: tsql`
    SELECT
      [TBL].[isActive] as [isActive],
      COUNT(DISTINCT([TBL].[id])) as [cnt]
    FROM [TestDb].[dbo].[User] as [TBL]
    GROUP BY [TBL].[isActive]
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."isActive" as "isActive",
      COUNT(DISTINCT("TBL"."id")) as "cnt"
    FROM "TestDb"."public"."User" as "TBL"
    GROUP BY "TBL"."isActive"
  `,
};

// ============================================
// groupBy 다중 컬럼
// ============================================
export const groupByMultiple: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`age\` as \`age\`,
      COUNT(DISTINCT(\`TBL\`.\`id\`)) as \`cnt\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    GROUP BY \`TBL\`.\`isActive\`, \`TBL\`.\`age\`
  `,
  mssql: tsql`
    SELECT
      [TBL].[isActive] as [isActive],
      [TBL].[age] as [age],
      COUNT(DISTINCT([TBL].[id])) as [cnt]
    FROM [TestDb].[dbo].[User] as [TBL]
    GROUP BY [TBL].[isActive], [TBL].[age]
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."isActive" as "isActive",
      "TBL"."age" as "age",
      COUNT(DISTINCT("TBL"."id")) as "cnt"
    FROM "TestDb"."public"."User" as "TBL"
    GROUP BY "TBL"."isActive", "TBL"."age"
  `,
};

// ============================================
// 집계 함수
// ============================================
export const aggregateFunctions: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`isActive\` as \`isActive\`,
      COUNT(DISTINCT(\`TBL\`.\`id\`)) as \`cnt\`,
      SUM(\`TBL\`.\`age\`) as \`sumAge\`,
      AVG(\`TBL\`.\`age\`) as \`avgAge\`,
      MAX(\`TBL\`.\`age\`) as \`maxAge\`,
      MIN(\`TBL\`.\`age\`) as \`minAge\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    GROUP BY \`TBL\`.\`isActive\`
  `,
  mssql: tsql`
    SELECT
      [TBL].[isActive] as [isActive],
      COUNT(DISTINCT([TBL].[id])) as [cnt],
      SUM([TBL].[age]) as [sumAge],
      AVG([TBL].[age]) as [avgAge],
      MAX([TBL].[age]) as [maxAge],
      MIN([TBL].[age]) as [minAge]
    FROM [TestDb].[dbo].[User] as [TBL]
    GROUP BY [TBL].[isActive]
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."isActive" as "isActive",
      COUNT(DISTINCT("TBL"."id")) as "cnt",
      SUM("TBL"."age") as "sumAge",
      AVG("TBL"."age") as "avgAge",
      MAX("TBL"."age") as "maxAge",
      MIN("TBL"."age") as "minAge"
    FROM "TestDb"."public"."User" as "TBL"
    GROUP BY "TBL"."isActive"
  `,
};

// ============================================
// having
// ============================================
export const having: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`isActive\` as \`isActive\`,
      COUNT(DISTINCT(\`TBL\`.\`id\`)) as \`cnt\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    GROUP BY \`TBL\`.\`isActive\`
    HAVING COUNT(DISTINCT(\`TBL\`.\`isActive\`)) > 5
  `,
  mssql: tsql`
    SELECT
      [TBL].[isActive] as [isActive],
      COUNT(DISTINCT([TBL].[id])) as [cnt]
    FROM [TestDb].[dbo].[User] as [TBL]
    GROUP BY [TBL].[isActive]
    HAVING COUNT(DISTINCT([TBL].[isActive])) > 5
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."isActive" as "isActive",
      COUNT(DISTINCT("TBL"."id")) as "cnt"
    FROM "TestDb"."public"."User" as "TBL"
    GROUP BY "TBL"."isActive"
    HAVING COUNT(DISTINCT("TBL"."isActive")) > 5
  `,
};

// ============================================
// 다중 having
// ============================================
export const havingMultiple: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`isActive\` as \`isActive\`,
      \`TBL\`.\`age\` as \`age\`,
      COUNT(DISTINCT(\`TBL\`.\`id\`)) as \`cnt\`,
      AVG(\`TBL\`.\`age\`) as \`avgAge\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    GROUP BY \`TBL\`.\`isActive\`
    HAVING COUNT(DISTINCT(\`TBL\`.\`isActive\`)) > 5 AND AVG(\`TBL\`.\`age\`) >= 20
  `,
  mssql: tsql`
    SELECT
      [TBL].[isActive] as [isActive],
      [TBL].[age] as [age],
      COUNT(DISTINCT([TBL].[id])) as [cnt],
      AVG([TBL].[age]) as [avgAge]
    FROM [TestDb].[dbo].[User] as [TBL]
    GROUP BY [TBL].[isActive]
    HAVING COUNT(DISTINCT([TBL].[isActive])) > 5 AND AVG([TBL].[age]) >= 20
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."isActive" as "isActive",
      "TBL"."age" as "age",
      COUNT(DISTINCT("TBL"."id")) as "cnt",
      AVG("TBL"."age") as "avgAge"
    FROM "TestDb"."public"."User" as "TBL"
    GROUP BY "TBL"."isActive"
    HAVING COUNT(DISTINCT("TBL"."isActive")) > 5 AND AVG("TBL"."age") >= 20
  `,
};

// ============================================
// where + groupBy + having + orderBy 복합
// ============================================
export const complexQuery: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`isActive\` as \`isActive\`,
      COUNT(DISTINCT(\`TBL\`.\`id\`)) as \`cnt\`,
      AVG(\`TBL\`.\`age\`) as \`avgAge\`
    FROM \`TestDb\`.\`User\` as \`TBL\`
    WHERE \`TBL\`.\`age\` IS NOT NULL
    GROUP BY \`TBL\`.\`isActive\`
    HAVING COUNT(DISTINCT(\`TBL\`.\`isActive\`)) > 5
    ORDER BY COUNT(DISTINCT(\`TBL\`.\`isActive\`)) DESC
  `,
  mssql: tsql`
    SELECT
      [TBL].[isActive] as [isActive],
      COUNT(DISTINCT([TBL].[id])) as [cnt],
      AVG([TBL].[age]) as [avgAge]
    FROM [TestDb].[dbo].[User] as [TBL]
    WHERE [TBL].[age] IS NOT NULL
    GROUP BY [TBL].[isActive]
    HAVING COUNT(DISTINCT([TBL].[isActive])) > 5
    ORDER BY COUNT(DISTINCT([TBL].[isActive])) DESC
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."isActive" as "isActive",
      COUNT(DISTINCT("TBL"."id")) as "cnt",
      AVG("TBL"."age") as "avgAge"
    FROM "TestDb"."public"."User" as "TBL"
    WHERE "TBL"."age" IS NOT NULL
    GROUP BY "TBL"."isActive"
    HAVING COUNT(DISTINCT("TBL"."isActive")) > 5
    ORDER BY COUNT(DISTINCT("TBL"."isActive")) DESC
  `,
};
