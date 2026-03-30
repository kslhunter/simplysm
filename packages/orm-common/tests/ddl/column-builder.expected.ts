import { mysql, pgsql, tsql } from "@simplysm/core-common";
import type { ExpectedSql } from "../setup/test-utils";

//#region ========== Data Type Basic Tests ==========

export const intType: ExpectedSql = {
  mysql: mysql`
    ALTER TABLE \`TestDb\`.\`User\`
      ADD COLUMN \`age\` INT NOT NULL
  `,
  mssql: tsql`
    ALTER TABLE [TestDb].[TestSchema].[User]
      ADD [age] INT NOT NULL
  `,
  postgresql: pgsql`
    ALTER TABLE "TestSchema"."User"
      ADD COLUMN "age" INTEGER NOT NULL
  `,
};

export const bigintType: ExpectedSql = {
  mysql: mysql`
    ALTER TABLE \`TestDb\`.\`User\`
      ADD COLUMN \`id\` BIGINT NOT NULL
  `,
  mssql: tsql`
    ALTER TABLE [TestDb].[TestSchema].[User]
      ADD [id] BIGINT NOT NULL
  `,
  postgresql: pgsql`
    ALTER TABLE "TestSchema"."User"
      ADD COLUMN "id" BIGINT NOT NULL
  `,
};

export const floatType: ExpectedSql = {
  mysql: mysql`
    ALTER TABLE \`TestDb\`.\`Product\`
      ADD COLUMN \`weight\` FLOAT NOT NULL
  `,
  mssql: tsql`
    ALTER TABLE [TestDb].[TestSchema].[Product]
      ADD [weight] REAL NOT NULL
  `,
  postgresql: pgsql`
    ALTER TABLE "TestSchema"."Product"
      ADD COLUMN "weight" REAL NOT NULL
  `,
};

export const doubleType: ExpectedSql = {
  mysql: mysql`
    ALTER TABLE \`TestDb\`.\`Product\`
      ADD COLUMN \`price\` DOUBLE NOT NULL
  `,
  mssql: tsql`
    ALTER TABLE [TestDb].[TestSchema].[Product]
      ADD [price] FLOAT NOT NULL
  `,
  postgresql: pgsql`
    ALTER TABLE "TestSchema"."Product"
      ADD COLUMN "price" DOUBLE PRECISION NOT NULL
  `,
};

export const decimalType: ExpectedSql = {
  mysql: mysql`
    ALTER TABLE \`TestDb\`.\`Product\`
      ADD COLUMN \`amount\` DECIMAL(10, 2) NOT NULL
  `,
  mssql: tsql`
    ALTER TABLE [TestDb].[TestSchema].[Product]
      ADD [amount] DECIMAL(10, 2) NOT NULL
  `,
  postgresql: pgsql`
    ALTER TABLE "TestSchema"."Product"
      ADD COLUMN "amount" NUMERIC(10, 2) NOT NULL
  `,
};

export const varcharType: ExpectedSql = {
  mysql: mysql`
    ALTER TABLE \`TestDb\`.\`User\`
      ADD COLUMN \`name\` VARCHAR(100) NOT NULL
  `,
  mssql: tsql`
    ALTER TABLE [TestDb].[TestSchema].[User]
      ADD [name] NVARCHAR(100) NOT NULL
  `,
  postgresql: pgsql`
    ALTER TABLE "TestSchema"."User"
      ADD COLUMN "name" VARCHAR(100) NOT NULL
  `,
};

export const charType: ExpectedSql = {
  mysql: mysql`
    ALTER TABLE \`TestDb\`.\`User\`
      ADD COLUMN \`code\` CHAR(10) NOT NULL
  `,
  mssql: tsql`
    ALTER TABLE [TestDb].[TestSchema].[User]
      ADD [code] NCHAR(10) NOT NULL
  `,
  postgresql: pgsql`
    ALTER TABLE "TestSchema"."User"
      ADD COLUMN "code" CHAR(10) NOT NULL
  `,
};

export const textType: ExpectedSql = {
  mysql: mysql`
    ALTER TABLE \`TestDb\`.\`Post\`
      ADD COLUMN \`content\` LONGTEXT NOT NULL
  `,
  mssql: tsql`
    ALTER TABLE [TestDb].[TestSchema].[Post]
      ADD [content] NVARCHAR(MAX) NOT NULL
  `,
  postgresql: pgsql`
    ALTER TABLE "TestSchema"."Post"
      ADD COLUMN "content" TEXT NOT NULL
  `,
};

export const binaryType: ExpectedSql = {
  mysql: mysql`
    ALTER TABLE \`TestDb\`.\`File\`
      ADD COLUMN \`data\` LONGBLOB NOT NULL
  `,
  mssql: tsql`
    ALTER TABLE [TestDb].[TestSchema].[File]
      ADD [data] VARBINARY(MAX) NOT NULL
  `,
  postgresql: pgsql`
    ALTER TABLE "TestSchema"."File"
      ADD COLUMN "data" BYTEA NOT NULL
  `,
};

export const booleanType: ExpectedSql = {
  mysql: mysql`
    ALTER TABLE \`TestDb\`.\`User\`
      ADD COLUMN \`isActive\` BOOLEAN NOT NULL
  `,
  mssql: tsql`
    ALTER TABLE [TestDb].[TestSchema].[User]
      ADD [isActive] BIT NOT NULL
  `,
  postgresql: pgsql`
    ALTER TABLE "TestSchema"."User"
      ADD COLUMN "isActive" BOOLEAN NOT NULL
  `,
};

export const datetimeType: ExpectedSql = {
  mysql: mysql`
    ALTER TABLE \`TestDb\`.\`User\`
      ADD COLUMN \`createdAt\` DATETIME NOT NULL
  `,
  mssql: tsql`
    ALTER TABLE [TestDb].[TestSchema].[User]
      ADD [createdAt] DATETIME2 NOT NULL
  `,
  postgresql: pgsql`
    ALTER TABLE "TestSchema"."User"
      ADD COLUMN "createdAt" TIMESTAMP NOT NULL
  `,
};

export const dateType: ExpectedSql = {
  mysql: mysql`
    ALTER TABLE \`TestDb\`.\`User\`
      ADD COLUMN \`birthDate\` DATE NOT NULL
  `,
  mssql: tsql`
    ALTER TABLE [TestDb].[TestSchema].[User]
      ADD [birthDate] DATE NOT NULL
  `,
  postgresql: pgsql`
    ALTER TABLE "TestSchema"."User"
      ADD COLUMN "birthDate" DATE NOT NULL
  `,
};

export const timeType: ExpectedSql = {
  mysql: mysql`
    ALTER TABLE \`TestDb\`.\`Schedule\`
      ADD COLUMN \`startTime\` TIME NOT NULL
  `,
  mssql: tsql`
    ALTER TABLE [TestDb].[TestSchema].[Schedule]
      ADD [startTime] TIME NOT NULL
  `,
  postgresql: pgsql`
    ALTER TABLE "TestSchema"."Schedule"
      ADD COLUMN "startTime" TIME NOT NULL
  `,
};

export const uuidType: ExpectedSql = {
  mysql: mysql`
    ALTER TABLE \`TestDb\`.\`User\`
      ADD COLUMN \`uuid\` BINARY(16) NOT NULL
  `,
  mssql: tsql`
    ALTER TABLE [TestDb].[TestSchema].[User]
      ADD [uuid] UNIQUEIDENTIFIER NOT NULL
  `,
  postgresql: pgsql`
    ALTER TABLE "TestSchema"."User"
      ADD COLUMN "uuid" UUID NOT NULL
  `,
};

//#endregion

//#region ========== Method Combination Tests ==========

export const nullableColumn: ExpectedSql = {
  mysql: mysql`
    ALTER TABLE \`TestDb\`.\`User\`
      ADD COLUMN \`nickname\` VARCHAR(100) NULL
  `,
  mssql: tsql`
    ALTER TABLE [TestDb].[TestSchema].[User]
      ADD [nickname] NVARCHAR(100) NULL
  `,
  postgresql: pgsql`
    ALTER TABLE "TestSchema"."User"
      ADD COLUMN "nickname" VARCHAR(100) NULL
  `,
};

export const defaultColumn: ExpectedSql = {
  mysql: mysql`
    ALTER TABLE \`TestDb\`.\`User\`
      ADD COLUMN \`score\` INT NOT NULL DEFAULT 0
  `,
  mssql: tsql`
    ALTER TABLE [TestDb].[TestSchema].[User]
      ADD [score] INT NOT NULL DEFAULT 0
  `,
  postgresql: pgsql`
    ALTER TABLE "TestSchema"."User"
      ADD COLUMN "score" INTEGER NOT NULL DEFAULT 0
  `,
};

export const autoIncrementColumn: ExpectedSql = {
  mysql: mysql`
    ALTER TABLE \`TestDb\`.\`User\`
      ADD COLUMN \`id\` BIGINT NOT NULL AUTO_INCREMENT
  `,
  mssql: tsql`
    ALTER TABLE [TestDb].[TestSchema].[User]
      ADD [id] BIGINT NOT NULL IDENTITY(1,1)
  `,
  postgresql: pgsql`
    ALTER TABLE "TestSchema"."User"
      ADD COLUMN "id" BIGINT NOT NULL GENERATED BY DEFAULT AS IDENTITY
  `,
};

export const descriptionColumn: ExpectedSql = {
  mysql: mysql`
    ALTER TABLE \`TestDb\`.\`User\`
      ADD COLUMN \`name\` VARCHAR(100) NOT NULL
  `,
  mssql: tsql`
    ALTER TABLE [TestDb].[TestSchema].[User]
      ADD [name] NVARCHAR(100) NOT NULL
  `,
  postgresql: pgsql`
    ALTER TABLE "TestSchema"."User"
      ADD COLUMN "name" VARCHAR(100) NOT NULL
  `,
};

export const nullableDefaultColumn: ExpectedSql = {
  mysql: mysql`
    ALTER TABLE \`TestDb\`.\`User\`
      ADD COLUMN \`status\` VARCHAR(50) NULL DEFAULT 'Unknown'
  `,
  mssql: tsql`
    ALTER TABLE [TestDb].[TestSchema].[User]
      ADD [status] NVARCHAR(50) NULL DEFAULT N'Unknown'
  `,
  postgresql: pgsql`
    ALTER TABLE "TestSchema"."User"
      ADD COLUMN "status" VARCHAR(50) NULL DEFAULT 'Unknown'
  `,
};

export const autoIncrementDescColumn: ExpectedSql = {
  mysql: mysql`
    ALTER TABLE \`TestDb\`.\`User\`
      ADD COLUMN \`id\` BIGINT NOT NULL AUTO_INCREMENT
  `,
  mssql: tsql`
    ALTER TABLE [TestDb].[TestSchema].[User]
      ADD [id] BIGINT NOT NULL IDENTITY(1,1)
  `,
  postgresql: pgsql`
    ALTER TABLE "TestSchema"."User"
      ADD COLUMN "id" BIGINT NOT NULL GENERATED BY DEFAULT AS IDENTITY
  `,
};

//#endregion
