import { TDialect } from "../../src/types/column-primitive";
import { mysql, pgsql, tsql } from "@simplysm/sd-core-common";

type ExpectedSql = Record<TDialect, string>;

// ============================================
// createDatabase
// ============================================
export const createDatabase: ExpectedSql = {
  mysql: mysql`
    CREATE DATABASE \`TestDb\`;
    ALTER DATABASE \`TestDb\` CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
  `,
  mssql: tsql`CREATE DATABASE [TestDb] COLLATE Korean_Wansung_CS_AS`,
  postgresql: pgsql`CREATE DATABASE "TestDb"`,
};

// ============================================
// clearDatabase
// ============================================
export const clearDatabase: ExpectedSql = {
  mysql: mysql`
    DROP PROCEDURE IF EXISTS \`TestDb\`.\`__sd_clear_db__\`;
    CREATE PROCEDURE \`TestDb\`.\`__sd_clear_db__\`()
    BEGIN
      DECLARE done INT DEFAULT FALSE;
      DECLARE v_name VARCHAR(255);
      DECLARE v_type VARCHAR(50);

      -- 프로시저 조회 커서
      DECLARE cur_proc CURSOR FOR
        SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES
        WHERE ROUTINE_SCHEMA = 'TestDb' AND ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME <> '__sd_clear_db__';

      -- 함수 조회 커서
      DECLARE cur_func CURSOR FOR
        SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES
        WHERE ROUTINE_SCHEMA = 'TestDb' AND ROUTINE_TYPE = 'FUNCTION';

      -- 뷰 조회 커서
      DECLARE cur_view CURSOR FOR
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS
        WHERE TABLE_SCHEMA = 'TestDb';

      -- 테이블 조회 커서
      DECLARE cur_table CURSOR FOR
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = 'TestDb' AND TABLE_TYPE = 'BASE TABLE';

      DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

      SET FOREIGN_KEY_CHECKS = 0;

      -- 프로시저 삭제
      OPEN cur_proc;
      proc_loop: LOOP
        FETCH cur_proc INTO v_name;
        IF done THEN LEAVE proc_loop; END IF;
        SET @sql = CONCAT('DROP PROCEDURE IF EXISTS \`TestDb\`.\`', v_name, '\`');
        PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
      END LOOP;
      CLOSE cur_proc;
      SET done = FALSE;

      -- 함수 삭제
      OPEN cur_func;
      func_loop: LOOP
        FETCH cur_func INTO v_name;
        IF done THEN LEAVE func_loop; END IF;
        SET @sql = CONCAT('DROP FUNCTION IF EXISTS \`TestDb\`.\`', v_name, '\`');
        PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
      END LOOP;
      CLOSE cur_func;
      SET done = FALSE;

      -- 뷰 삭제
      OPEN cur_view;
      view_loop: LOOP
        FETCH cur_view INTO v_name;
        IF done THEN LEAVE view_loop; END IF;
        SET @sql = CONCAT('DROP VIEW IF EXISTS \`TestDb\`.\`', v_name, '\`');
        PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
      END LOOP;
      CLOSE cur_view;
      SET done = FALSE;

      -- 테이블 삭제
      OPEN cur_table;
      table_loop: LOOP
        FETCH cur_table INTO v_name;
        IF done THEN LEAVE table_loop; END IF;
        SET @sql = CONCAT('DROP TABLE IF EXISTS \`TestDb\`.\`', v_name, '\`');
        PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
      END LOOP;
      CLOSE cur_table;

      SET FOREIGN_KEY_CHECKS = 1;
    END;
    CALL \`TestDb\`.\`__sd_clear_db__\`();
    DROP PROCEDURE IF EXISTS \`TestDb\`.\`__sd_clear_db__\`;
  `,
  mssql: tsql`
    DECLARE @sql NVARCHAR(MAX);
    SET @sql = N'';

    -- 프로시저 초기화
    SELECT @sql = @sql + 'DROP PROCEDURE ' + QUOTENAME(sch.name) + '.' + QUOTENAME(o.name) +';' + CHAR(13) + CHAR(10)
    FROM [TestDb].sys.sql_modules m
    INNER JOIN [TestDb].sys.objects o ON m.object_id=o.object_id
    INNER JOIN [TestDb].sys.schemas sch ON sch.schema_id = [o].schema_id
    WHERE type_desc like '%PROCEDURE%'

    -- 함수 초기화
    SELECT @sql = @sql + 'DROP FUNCTION [TestDb].' + QUOTENAME(sch.name) + '.' + QUOTENAME(o.name) + N';' + CHAR(13) + CHAR(10)
    FROM [TestDb].sys.sql_modules m
    INNER JOIN [TestDb].sys.objects o ON m.object_id=o.object_id
    INNER JOIN [TestDb].sys.schemas sch ON sch.schema_id = [o].schema_id
    WHERE type_desc like '%function%' AND sch.name <> 'sys'

    -- 뷰 초기화
    SELECT @sql = @sql + 'DROP VIEW ' + QUOTENAME(sch.name) + '.' + QUOTENAME(v.name) + N';' + CHAR(13) + CHAR(10)
    FROM [TestDb].sys.views v
    INNER JOIN [TestDb].sys.schemas sch ON sch.schema_id = [v].schema_id
    WHERE sch.name <> 'sys'

    -- 테이블 FK 끊기 초기화
    SELECT @sql = @sql + N'ALTER TABLE [TestDb].' + QUOTENAME(sch.name) + '.' + QUOTENAME([tbl].[name]) + N' DROP CONSTRAINT ' + QUOTENAME([obj].[name]) + N';' + CHAR(13) + CHAR(10)
    FROM [TestDb].sys.tables [tbl]
    INNER JOIN [TestDb].sys.objects AS [obj] ON [obj].[parent_object_id] = [tbl].[object_id] AND [obj].[type] = 'F'
    INNER JOIN [TestDb].sys.schemas sch ON sch.schema_id = [tbl].schema_id

    -- 테이블 삭제
    SELECT @sql = @sql + N'DROP TABLE [TestDb].' + QUOTENAME(sch.name) + '.' + QUOTENAME([tbl].[name]) + N';' + CHAR(13) + CHAR(10)
    FROM [TestDb].sys.tables [tbl]
    INNER JOIN [TestDb].sys.schemas sch ON sch.schema_id = [tbl].schema_id
    WHERE [type]= 'U'

    EXEC(@sql);
  `,
  postgresql: pgsql`
    DO $$
    DECLARE
      r RECORD;
    BEGIN
      -- 함수 삭제 (시스템 스키마 제외, 집계함수 제외)
      FOR r IN (
        SELECT n.nspname as schema, p.proname as name, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname NOT IN ('pg_catalog', 'information_schema') AND NOT p.proisagg
      ) LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS "' || r.schema || '"."' || r.name || '"(' || r.args || ') CASCADE';
      END LOOP;

      -- 뷰 삭제 (시스템 스키마 제외)
      FOR r IN (
        SELECT schemaname, viewname FROM pg_views
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ) LOOP
        EXECUTE 'DROP VIEW IF EXISTS "' || r.schemaname || '"."' || r.viewname || '" CASCADE';
      END LOOP;

      -- 테이블 삭제 (시스템 스키마 제외, FK 자동 삭제를 위해 CASCADE)
      FOR r IN (
        SELECT schemaname, tablename FROM pg_tables
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ) LOOP
        EXECUTE 'DROP TABLE IF EXISTS "' || r.schemaname || '"."' || r.tablename || '" CASCADE';
      END LOOP;
    END$$;
  `,
};

// ============================================
// createTable - 기본 테이블 (PK + AUTO_INCREMENT)
// ============================================
export const createTableBasic: ExpectedSql = {
  mysql: mysql`
    CREATE TABLE \`TestDb\`.\`User\` (
      \`id\` INT NOT NULL AUTO_INCREMENT,
      \`name\` VARCHAR(100) NOT NULL,
      \`email\` VARCHAR(255) NULL,
      \`age\` INT NULL DEFAULT 0,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
  `,
  mssql: tsql`
    CREATE TABLE [TestDb].[dbo].[User] (
      [id] INT IDENTITY(1,1) NOT NULL,
      [name] NVARCHAR(100) NOT NULL,
      [email] NVARCHAR(255) NULL,
      [age] INT NULL DEFAULT 0,
      CONSTRAINT [PK_User] PRIMARY KEY ([id] ASC)
    );
  `,
  postgresql: pgsql`
    CREATE TABLE "TestDb"."public"."User" (
      "id" SERIAL NOT NULL,
      "name" VARCHAR(100) NOT NULL,
      "email" VARCHAR(255) NULL,
      "age" INTEGER NULL DEFAULT 0,
      CONSTRAINT "PK_User" PRIMARY KEY ("id")
    );
  `,
};

// ============================================
// createTable - 복합 PK
// ============================================
export const createTableCompositePk: ExpectedSql = {
  mysql: mysql`
    CREATE TABLE \`TestDb\`.\`OrderItem\` (
      \`orderId\` INT NOT NULL,
      \`productId\` INT NOT NULL,
      \`quantity\` INT NOT NULL,
      PRIMARY KEY (\`orderId\`, \`productId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
  `,
  mssql: tsql`
    CREATE TABLE [TestDb].[dbo].[OrderItem] (
      [orderId] INT NOT NULL,
      [productId] INT NOT NULL,
      [quantity] INT NOT NULL,
      CONSTRAINT [PK_OrderItem] PRIMARY KEY ([orderId] ASC, [productId] ASC)
    );
  `,
  postgresql: pgsql`
    CREATE TABLE "TestDb"."public"."OrderItem" (
      "orderId" INTEGER NOT NULL,
      "productId" INTEGER NOT NULL,
      "quantity" INTEGER NOT NULL,
      CONSTRAINT "PK_OrderItem" PRIMARY KEY ("orderId", "productId")
    );
  `,
};

// ============================================
// createIndex - 단일 컬럼
// ============================================
export const createIndexSingle: ExpectedSql = {
  mysql: mysql`CREATE INDEX \`IDX_User_email\` ON \`TestDb\`.\`User\`(\`email\` ASC);`,
  mssql: tsql`CREATE INDEX [IDX_User_email] ON [TestDb].[dbo].[User]([email] ASC);`,
  postgresql: pgsql`CREATE INDEX "IDX_User_email" ON "TestDb"."public"."User"("email" ASC);`,
};

// ============================================
// createIndex - UNIQUE
// ============================================
export const createIndexUnique: ExpectedSql = {
  mysql: mysql`CREATE UNIQUE INDEX \`IDX_User_email_unique\` ON \`TestDb\`.\`User\`(\`email\` ASC);`,
  mssql: tsql`CREATE UNIQUE INDEX [IDX_User_email_unique] ON [TestDb].[dbo].[User]([email] ASC);`,
  postgresql: pgsql`CREATE UNIQUE INDEX "IDX_User_email_unique" ON "TestDb"."public"."User"("email" ASC);`,
};

// ============================================
// createIndex - 복합 컬럼
// ============================================
export const createIndexComposite: ExpectedSql = {
  mysql: mysql`CREATE INDEX \`IDX_User_name_age\` ON \`TestDb\`.\`User\`(\`name\` ASC, \`age\` DESC);`,
  mssql: tsql`CREATE INDEX [IDX_User_name_age] ON [TestDb].[dbo].[User]([name] ASC, [age] DESC);`,
  postgresql: pgsql`CREATE INDEX "IDX_User_name_age" ON "TestDb"."public"."User"("name" ASC, "age" DESC);`,
};

// ============================================
// addForeignKey
// ============================================
export const addForeignKey: ExpectedSql = {
  mysql: mysql`ALTER TABLE \`TestDb\`.\`Order\` ADD CONSTRAINT \`FK_Order_userId\` FOREIGN KEY (userId) REFERENCES \`TestDb\`.\`User\`(id);`,
  mssql: tsql`ALTER TABLE [TestDb].[dbo].[Order] ADD CONSTRAINT [FK_Order_userId] FOREIGN KEY (userId) REFERENCES [TestDb].[dbo].[User](id);`,
  postgresql: pgsql`ALTER TABLE "TestDb"."public"."Order" ADD CONSTRAINT "FK_Order_userId" FOREIGN KEY (userId) REFERENCES "TestDb"."public"."User"(id);`,
};

// ============================================
// createView
// ============================================
export const createView: ExpectedSql = {
  mysql: mysql`CREATE OR REPLACE VIEW \`TestDb\`.\`ActiveUsers\` AS SELECT * FROM User WHERE isActive = 1;`,
  mssql: tsql`CREATE OR ALTER VIEW [TestDb].[dbo].[ActiveUsers] AS SELECT * FROM User WHERE isActive = 1;`,
  postgresql: pgsql`CREATE OR REPLACE VIEW "TestDb"."public"."ActiveUsers" AS SELECT * FROM User WHERE isActive = 1;`,
};

// ============================================
// createProcedure
// ============================================
export const createProcedure: ExpectedSql = {
  mysql: mysql`CREATE PROCEDURE \`TestDb\`.\`GetUserCount\`() BEGIN SELECT COUNT(*) FROM User; END;`,
  mssql: tsql`CREATE OR ALTER PROCEDURE [TestDb].[dbo].[GetUserCount] AS SELECT COUNT(*) FROM User;`,
  postgresql: pgsql`CREATE OR REPLACE FUNCTION "TestDb"."public"."GetUserCount"() RETURNS VOID AS $$ BEGIN SELECT COUNT(*) FROM User; END; $$ LANGUAGE plpgsql;`,
};

// ============================================
// executeProcedure
// ============================================
export const executeProcedure: ExpectedSql = {
  mysql: mysql`CALL \`TestDb\`.\`GetUserCount\`();`,
  mssql: tsql`EXEC [TestDb].[dbo].[GetUserCount];`,
  postgresql: pgsql`SELECT "TestDb"."public"."GetUserCount"();`,
};
