import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

export const basicProc: ExpectedSql = {
  mysql: mysql`
    CREATE PROCEDURE \`TestDb\`.\`TestProc\`()
    BEGIN
    SELECT 1 AS result;
    END
  `,
  mssql: tsql`
    CREATE OR ALTER PROCEDURE [TestDb].[TestSchema].[TestProc]
    AS
    BEGIN
    SET NOCOUNT ON;
    SELECT 1 AS result
    END
  `,
  postgresql: pgsql`
    CREATE OR REPLACE FUNCTION "TestSchema"."TestProc"()
    RETURNS VOID AS $$
    BEGIN
    SELECT 1 AS result;
    END;
    $$ LANGUAGE plpgsql
  `,
};

export const complexProc: ExpectedSql = {
  mysql: mysql`
    CREATE PROCEDURE \`TestDb\`.\`GetUserById\`(IN \`userId\` BIGINT)
    BEGIN
    -- DBMSwrite matching query --;
    END
  `,
  mssql: tsql`
    CREATE OR ALTER PROCEDURE [TestDb].[TestSchema].[GetUserById] @userId BIGINT
    AS
    BEGIN
    SET NOCOUNT ON;
    -- DBMSwrite matching query --
    END
  `,
  postgresql: pgsql`
    CREATE OR REPLACE FUNCTION "TestSchema"."GetUserById"("userId" BIGINT)
    RETURNS TABLE("id" BIGINT, "name" VARCHAR(100), "email" VARCHAR(200)) AS $$
    BEGIN
    -- DBMSwrite matching query --;
    END;
    $$ LANGUAGE plpgsql
  `,
};
