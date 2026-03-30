import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

export const year: ExpectedSql = {
  mysql: mysql`
    SELECT YEAR(\`T1\`.\`createdAt\`) AS \`yearPart\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT YEAR([T1].[createdAt]) AS [yearPart]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT EXTRACT(YEAR FROM "T1"."createdAt")::INTEGER AS "yearPart"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const month: ExpectedSql = {
  mysql: mysql`
    SELECT MONTH(\`T1\`.\`createdAt\`) AS \`monthPart\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT MONTH([T1].[createdAt]) AS [monthPart]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT EXTRACT(MONTH FROM "T1"."createdAt")::INTEGER AS "monthPart"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const day: ExpectedSql = {
  mysql: mysql`
    SELECT DAY(\`T1\`.\`createdAt\`) AS \`dayPart\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT DAY([T1].[createdAt]) AS [dayPart]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT EXTRACT(DAY FROM "T1"."createdAt")::INTEGER AS "dayPart"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const hour: ExpectedSql = {
  mysql: mysql`
    SELECT HOUR(\`T1\`.\`createdAt\`) AS \`hourPart\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT DATEPART(HOUR, [T1].[createdAt]) AS [hourPart]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT EXTRACT(HOUR FROM "T1"."createdAt")::INTEGER AS "hourPart"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const minute: ExpectedSql = {
  mysql: mysql`
    SELECT MINUTE(\`T1\`.\`createdAt\`) AS \`minutePart\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT DATEPART(MINUTE, [T1].[createdAt]) AS [minutePart]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT EXTRACT(MINUTE FROM "T1"."createdAt")::INTEGER AS "minutePart"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const second: ExpectedSql = {
  mysql: mysql`
    SELECT SECOND(\`T1\`.\`createdAt\`) AS \`secondPart\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT DATEPART(SECOND, [T1].[createdAt]) AS [secondPart]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT EXTRACT(SECOND FROM "T1"."createdAt")::INTEGER AS "secondPart"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const dateDiffDay: ExpectedSql = {
  mysql: mysql`
    SELECT TIMESTAMPDIFF(DAY, \`T1\`.\`createdAt\`, '2024-01-01 00:00:00') AS \`daysDiff\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT DATEDIFF(DAY, [T1].[createdAt], '2024-01-01 00:00:00') AS [daysDiff]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT ('2024-01-01 00:00:00'::timestamp::DATE - "T1"."createdAt"::DATE) AS "daysDiff"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const dateDiffYear: ExpectedSql = {
  mysql: mysql`
    SELECT TIMESTAMPDIFF(YEAR, \`T1\`.\`createdAt\`, '2024-01-01 00:00:00') AS \`yearsDiff\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT DATEDIFF(YEAR, [T1].[createdAt], '2024-01-01 00:00:00') AS [yearsDiff]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT EXTRACT(YEAR FROM AGE('2024-01-01 00:00:00'::timestamp, "T1"."createdAt"))::INTEGER AS "yearsDiff"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const dateDiffMonth: ExpectedSql = {
  mysql: mysql`
    SELECT TIMESTAMPDIFF(MONTH, \`T1\`.\`createdAt\`, '2024-01-01 00:00:00') AS \`monthsDiff\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT DATEDIFF(MONTH, [T1].[createdAt], '2024-01-01 00:00:00') AS [monthsDiff]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT (EXTRACT(YEAR FROM AGE('2024-01-01 00:00:00'::timestamp, "T1"."createdAt")) * 12 + EXTRACT(MONTH FROM AGE('2024-01-01 00:00:00'::timestamp, "T1"."createdAt")))::INTEGER AS "monthsDiff"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const dateDiffHour: ExpectedSql = {
  mysql: mysql`
    SELECT TIMESTAMPDIFF(HOUR, \`T1\`.\`createdAt\`, '2024-01-01 00:00:00') AS \`hoursDiff\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT DATEDIFF(HOUR, [T1].[createdAt], '2024-01-01 00:00:00') AS [hoursDiff]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT EXTRACT(EPOCH FROM ('2024-01-01 00:00:00'::timestamp - "T1"."createdAt"))::INTEGER / 3600 AS "hoursDiff"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const dateDiffMinute: ExpectedSql = {
  mysql: mysql`
    SELECT TIMESTAMPDIFF(MINUTE, \`T1\`.\`createdAt\`, '2024-01-01 00:00:00') AS \`minutesDiff\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT DATEDIFF(MINUTE, [T1].[createdAt], '2024-01-01 00:00:00') AS [minutesDiff]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT EXTRACT(EPOCH FROM ('2024-01-01 00:00:00'::timestamp - "T1"."createdAt"))::INTEGER / 60 AS "minutesDiff"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const dateDiffSecond: ExpectedSql = {
  mysql: mysql`
    SELECT TIMESTAMPDIFF(SECOND, \`T1\`.\`createdAt\`, '2024-01-01 00:00:00') AS \`secondsDiff\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT DATEDIFF(SECOND, [T1].[createdAt], '2024-01-01 00:00:00') AS [secondsDiff]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT EXTRACT(EPOCH FROM ('2024-01-01 00:00:00'::timestamp - "T1"."createdAt"))::INTEGER AS "secondsDiff"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const dateAddMonth: ExpectedSql = {
  mysql: mysql`
    SELECT DATE_ADD(\`T1\`.\`createdAt\`, INTERVAL 1 MONTH) AS \`nextMonth\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT DATEADD(MONTH, 1, [T1].[createdAt]) AS [nextMonth]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT "T1"."createdAt" + INTERVAL '1month' * 1 AS "nextMonth"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const dateAddYear: ExpectedSql = {
  mysql: mysql`
    SELECT DATE_ADD(\`T1\`.\`createdAt\`, INTERVAL 1 YEAR) AS \`nextYear\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT DATEADD(YEAR, 1, [T1].[createdAt]) AS [nextYear]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT "T1"."createdAt" + INTERVAL '1year' * 1 AS "nextYear"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const dateAddDay: ExpectedSql = {
  mysql: mysql`
    SELECT DATE_ADD(\`T1\`.\`createdAt\`, INTERVAL 7 DAY) AS \`nextWeek\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT DATEADD(DAY, 7, [T1].[createdAt]) AS [nextWeek]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT "T1"."createdAt" + INTERVAL '1day' * 7 AS "nextWeek"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const dateAddHour: ExpectedSql = {
  mysql: mysql`
    SELECT DATE_ADD(\`T1\`.\`createdAt\`, INTERVAL 2 HOUR) AS \`twoHoursLater\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT DATEADD(HOUR, 2, [T1].[createdAt]) AS [twoHoursLater]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT "T1"."createdAt" + INTERVAL '1hour' * 2 AS "twoHoursLater"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const dateAddMinute: ExpectedSql = {
  mysql: mysql`
    SELECT DATE_ADD(\`T1\`.\`createdAt\`, INTERVAL 30 MINUTE) AS \`thirtyMinLater\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT DATEADD(MINUTE, 30, [T1].[createdAt]) AS [thirtyMinLater]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT "T1"."createdAt" + INTERVAL '1minute' * 30 AS "thirtyMinLater"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const dateAddSecond: ExpectedSql = {
  mysql: mysql`
    SELECT DATE_ADD(\`T1\`.\`createdAt\`, INTERVAL 45 SECOND) AS \`fortyFiveSecLater\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT DATEADD(SECOND, 45, [T1].[createdAt]) AS [fortyFiveSecLater]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT "T1"."createdAt" + INTERVAL '1second' * 45 AS "fortyFiveSecLater"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const formatDate: ExpectedSql = {
  mysql: mysql`
    SELECT DATE_FORMAT(\`T1\`.\`createdAt\`, '%Y-%m-%d %H:%i:%s') AS \`formatted\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT FORMAT([T1].[createdAt], 'yyyy-MM-dd HH:mm:ss') AS [formatted]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT TO_CHAR("T1"."createdAt", 'YYYY-MM-DD HH24:MI:SS') AS "formatted"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const isoWeek: ExpectedSql = {
  mysql: mysql`
    SELECT WEEK(CAST(\`T1\`.\`createdAt\` AS DATE), 1) AS \`week\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT DATEPART(ISO_WEEK, CAST([T1].[createdAt] AS DATE)) AS [week]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT EXTRACT(WEEK FROM CAST("T1"."createdAt" AS DATE))::INTEGER AS "week"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const isoWeekStartDate: ExpectedSql = {
  mysql: mysql`
    SELECT DATE_SUB(CAST(\`T1\`.\`createdAt\` AS DATE), INTERVAL (WEEKDAY(CAST(\`T1\`.\`createdAt\` AS DATE))) DAY) AS \`weekStart\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT DATEADD(DAY, 1 - ((DATEDIFF(DAY, 0, CAST([T1].[createdAt] AS DATE)) + 6) % 7 + 1), CAST(CAST([T1].[createdAt] AS DATE) AS DATE)) AS [weekStart]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT DATE_TRUNC('week', CAST("T1"."createdAt" AS DATE))::DATE AS "weekStart"
    FROM "TestSchema"."User" AS "T1"
  `,
};

export const isoYearMonth: ExpectedSql = {
  mysql: mysql`
    SELECT DATE_FORMAT(CAST(\`T1\`.\`createdAt\` AS DATE), '%Y%m') AS \`yearMonth\`
    FROM \`TestDb\`.\`User\` AS \`T1\`
  `,
  mssql: tsql`
    SELECT FORMAT(CAST([T1].[createdAt] AS DATE), 'yyyyMM') AS [yearMonth]
    FROM [TestDb].[TestSchema].[User] AS [T1]
  `,
  postgresql: pgsql`
    SELECT TO_CHAR(CAST("T1"."createdAt" AS DATE), 'YYYYMM') AS "yearMonth"
    FROM "TestSchema"."User" AS "T1"
  `,
};
