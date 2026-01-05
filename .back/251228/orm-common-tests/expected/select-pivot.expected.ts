import { TDialect } from "../../src/types/column-primitive";
import { mysql, pgsql, tsql } from "@simplysm/sd-core-common";

type ExpectedSql = Record<TDialect, string>;

// ============================================
// PIVOT - 기본 (월별 금액 합계)
// ============================================
export const pivotBasic: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`category\` as \`category\`,
      SUM(CASE WHEN \`TBL\`.\`month\` = 'Jan' THEN \`TBL\`.\`amount\` ELSE NULL END) as \`Jan\`,
      SUM(CASE WHEN \`TBL\`.\`month\` = 'Feb' THEN \`TBL\`.\`amount\` ELSE NULL END) as \`Feb\`,
      SUM(CASE WHEN \`TBL\`.\`month\` = 'Mar' THEN \`TBL\`.\`amount\` ELSE NULL END) as \`Mar\`
    FROM \`TestDb\`.\`Sales\` as \`TBL\`
    GROUP BY \`TBL\`.\`id\`, \`TBL\`.\`category\`
  `,
  mssql: tsql`
    SELECT
      [PVT].[id] as [id],
      [PVT].[category] as [category],
      [PVT].[Jan] as [Jan],
      [PVT].[Feb] as [Feb],
      [PVT].[Mar] as [Mar]
    FROM [TestDb].[dbo].[Sales] as [TBL]
    PIVOT (SUM([amount]) FOR [month] IN ([Jan], [Feb], [Mar])) as [PVT]
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."id" as "id",
      "TBL"."category" as "category",
      SUM(CASE WHEN "TBL"."month" = 'Jan' THEN "TBL"."amount" ELSE NULL END) as "Jan",
      SUM(CASE WHEN "TBL"."month" = 'Feb' THEN "TBL"."amount" ELSE NULL END) as "Feb",
      SUM(CASE WHEN "TBL"."month" = 'Mar' THEN "TBL"."amount" ELSE NULL END) as "Mar"
    FROM "TestDb"."public"."Sales" as "TBL"
    GROUP BY "TBL"."id", "TBL"."category"
  `,
};

// ============================================
// PIVOT - 기본값 지정
// ============================================
export const pivotWithDefault: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`category\` as \`category\`,
      SUM(CASE WHEN \`TBL\`.\`month\` = 'Jan' THEN \`TBL\`.\`amount\` ELSE 0 END) as \`Jan\`,
      SUM(CASE WHEN \`TBL\`.\`month\` = 'Feb' THEN \`TBL\`.\`amount\` ELSE 0 END) as \`Feb\`,
      SUM(CASE WHEN \`TBL\`.\`month\` = 'Mar' THEN \`TBL\`.\`amount\` ELSE 0 END) as \`Mar\`
    FROM \`TestDb\`.\`Sales\` as \`TBL\`
    GROUP BY \`TBL\`.\`id\`, \`TBL\`.\`category\`
  `,
  mssql: tsql`
    SELECT
      [PVT].[id] as [id],
      [PVT].[category] as [category],
      ISNULL([PVT].[Jan], 0) as [Jan],
      ISNULL([PVT].[Feb], 0) as [Feb],
      ISNULL([PVT].[Mar], 0) as [Mar]
    FROM [TestDb].[dbo].[Sales] as [TBL]
    PIVOT (SUM([amount]) FOR [month] IN ([Jan], [Feb], [Mar])) as [PVT]
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."id" as "id",
      "TBL"."category" as "category",
      SUM(CASE WHEN "TBL"."month" = 'Jan' THEN "TBL"."amount" ELSE 0 END) as "Jan",
      SUM(CASE WHEN "TBL"."month" = 'Feb' THEN "TBL"."amount" ELSE 0 END) as "Feb",
      SUM(CASE WHEN "TBL"."month" = 'Mar' THEN "TBL"."amount" ELSE 0 END) as "Mar"
    FROM "TestDb"."public"."Sales" as "TBL"
    GROUP BY "TBL"."id", "TBL"."category"
  `,
};

// ============================================
// PIVOT - select로 category만 (id 제외)
// MySQL/PostgreSQL: SELECT에서 id 제외, GROUP BY도 category만
// MSSQL: 서브쿼리로 필요한 컬럼만 선택 후 PIVOT 적용
// ============================================
export const pivotWithSelect: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`category\` as \`category\`,
      SUM(CASE WHEN CONCAT(IFNULL(\`TBL\`.\`month\`, ''), IFNULL('__', '')) = 'Jan__' THEN \`TBL\`.\`amount\` ELSE NULL END) as \`Jan__\`,
      SUM(CASE WHEN CONCAT(IFNULL(\`TBL\`.\`month\`, ''), IFNULL('__', '')) = 'Feb__' THEN \`TBL\`.\`amount\` ELSE NULL END) as \`Feb__\`,
      SUM(CASE WHEN CONCAT(IFNULL(\`TBL\`.\`month\`, ''), IFNULL('__', '')) = 'Mar__' THEN \`TBL\`.\`amount\` ELSE NULL END) as \`Mar__\`
    FROM \`TestDb\`.\`Sales\` as \`TBL\`
    GROUP BY \`TBL\`.\`category\`
  `,
  mssql: tsql`
    SELECT
      [PVT].[category] as [category],
      [PVT].[Jan__] as [Jan__],
      [PVT].[Feb__] as [Feb__],
      [PVT].[Mar__] as [Mar__]
    FROM (
      SELECT [category], ISNULL([month], N'') + ISNULL(N'__', N'') as [month], [amount]
      FROM [TestDb].[dbo].[Sales]
    ) as [TBL]
    PIVOT (SUM([amount]) FOR [month] IN ([Jan__], [Feb__], [Mar__])) as [PVT]
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."category" as "category",
      SUM(CASE WHEN COALESCE("TBL"."month", '') || COALESCE('__', '') = 'Jan__' THEN "TBL"."amount" ELSE NULL END) as "Jan__",
      SUM(CASE WHEN COALESCE("TBL"."month", '') || COALESCE('__', '') = 'Feb__' THEN "TBL"."amount" ELSE NULL END) as "Feb__",
      SUM(CASE WHEN COALESCE("TBL"."month", '') || COALESCE('__', '') = 'Mar__' THEN "TBL"."amount" ELSE NULL END) as "Mar__"
    FROM "TestDb"."public"."Sales" as "TBL"
    GROUP BY "TBL"."category"
  `,
};

// ============================================
// UNPIVOT - 기본 (월별 컬럼을 행으로)
// MySQL: LATERAL + UNION ALL 에뮬레이션
// PostgreSQL: LATERAL + VALUES 에뮬레이션
// MSSQL: 네이티브 UNPIVOT 지원
// ============================================
export const unpivotBasic: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`category\` as \`category\`,
      \`UPVT\`.\`amount\` as \`amount\`,
      \`UPVT\`.\`month\` as \`month\`
    FROM \`TestDb\`.\`MonthlySales\` as \`TBL\`
    CROSS JOIN LATERAL (
      SELECT \`TBL\`.\`jan\` as \`amount\`, 'jan' as \`month\`
      UNION ALL
      SELECT \`TBL\`.\`feb\` as \`amount\`, 'feb' as \`month\`
      UNION ALL
      SELECT \`TBL\`.\`mar\` as \`amount\`, 'mar' as \`month\`
    ) as \`UPVT\`
  `,
  mssql: tsql`
    SELECT
      [UPVT].[id] as [id],
      [UPVT].[category] as [category],
      [UPVT].[amount] as [amount],
      [UPVT].[month] as [month]
    FROM [TestDb].[dbo].[MonthlySales] as [TBL]
    UNPIVOT ([amount] FOR [month] IN ([jan], [feb], [mar])) as [UPVT]
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."id" as "id",
      "TBL"."category" as "category",
      "UPVT"."amount" as "amount",
      "UPVT"."month" as "month"
    FROM "TestDb"."public"."MonthlySales" as "TBL"
    CROSS JOIN LATERAL (
      VALUES ("TBL"."jan", 'jan'), ("TBL"."feb", 'feb'), ("TBL"."mar", 'mar')
    ) as "UPVT"("amount", "month")
  `,
};

// ============================================
// UNPIVOT - WHERE 필터링
// ============================================
export const unpivotWithWhere: ExpectedSql = {
  mysql: mysql`
    SELECT
      \`TBL\`.\`id\` as \`id\`,
      \`TBL\`.\`category\` as \`category\`,
      \`UPVT\`.\`amount\` as \`amount\`,
      \`UPVT\`.\`month\` as \`month\`
    FROM \`TestDb\`.\`MonthlySales\` as \`TBL\`
    CROSS JOIN LATERAL (
      SELECT \`TBL\`.\`jan\` as \`amount\`, 'jan' as \`month\`
      UNION ALL
      SELECT \`TBL\`.\`feb\` as \`amount\`, 'feb' as \`month\`
      UNION ALL
      SELECT \`TBL\`.\`mar\` as \`amount\`, 'mar' as \`month\`
    ) as \`UPVT\`
    WHERE \`UPVT\`.\`amount\` > 800
  `,
  mssql: tsql`
    SELECT
      [UPVT].[id] as [id],
      [UPVT].[category] as [category],
      [UPVT].[amount] as [amount],
      [UPVT].[month] as [month]
    FROM [TestDb].[dbo].[MonthlySales] as [TBL]
    UNPIVOT ([amount] FOR [month] IN ([jan], [feb], [mar])) as [UPVT]
    WHERE [UPVT].[amount] > 800
  `,
  postgresql: pgsql`
    SELECT
      "TBL"."id" as "id",
      "TBL"."category" as "category",
      "UPVT"."amount" as "amount",
      "UPVT"."month" as "month"
    FROM "TestDb"."public"."MonthlySales" as "TBL"
    CROSS JOIN LATERAL (
      VALUES ("TBL"."jan", 'jan'), ("TBL"."feb", 'feb'), ("TBL"."mar", 'mar')
    ) as "UPVT"("amount", "month")
    WHERE "UPVT"."amount" > 800
  `,
};
