import type { DbConnConfig } from "@simplysm/orm-node";
import { mssqlConfig, mysqlConfig, postgresqlConfig } from "../test-configs";
import { createModels } from "./models";
import { createTestDb, TestDb } from "./test-db-context";

export interface DbTestCase {
  label: string;
  config: DbConnConfig;
  ormOptions: { database: string; schema?: string };
  models: ReturnType<typeof createModels>;
  TestDb: typeof TestDb;
  setupSql: string[];
  cleanupSql: string[];
}

function tableRef(name: string, dialect: "mssql" | "mysql" | "postgresql"): string {
  switch (dialect) {
    case "mssql":
      return `[TestDb].[dbo].[${name}]`;
    case "mysql":
      return `\`TestDb\`.\`${name}\``;
    case "postgresql":
      return `"${name}"`;
  }
}

function dropTable(name: string, dialect: "mssql" | "mysql" | "postgresql"): string {
  switch (dialect) {
    case "mssql":
      return `IF OBJECT_ID('[TestDb].[dbo].[${name}]', 'U') IS NOT NULL DROP TABLE [TestDb].[dbo].[${name}]`;
    case "mysql":
      return `DROP TABLE IF EXISTS \`TestDb\`.\`${name}\``;
    case "postgresql":
      return `DROP TABLE IF EXISTS "${name}" CASCADE`;
  }
}

function createTableSql(dialect: "mssql" | "mysql" | "postgresql"): string[] {
  const t = (name: string) => tableRef(name, dialect);
  const drop = (name: string) => dropTable(name, dialect);
  const col = (name: string) => (dialect === "postgresql" ? `"${name}"` : name);
  const ai =
    dialect === "mssql" ? "INT IDENTITY(1,1)" : dialect === "mysql" ? "INT AUTO_INCREMENT" : "SERIAL";
  const varchar = (len: number) => (dialect === "mssql" ? `NVARCHAR(${len})` : `VARCHAR(${len})`);
  const text = dialect === "mssql" ? "NVARCHAR(MAX)" : "TEXT";
  const bool = dialect === "mssql" ? "BIT" : dialect === "mysql" ? "TINYINT(1)" : "BOOLEAN";
  const defaultTrue = dialect === "postgresql" ? "TRUE" : "1";
  const engine = dialect === "mysql" ? " ENGINE=InnoDB" : "";

  return [
    // FK 의존성 때문에 역순으로 DROP
    drop("Post"),
    drop("User"),
    drop("Employee"),
    drop("Sales"),
    drop("MonthlySales"),
    drop("Company"),
    // 순서대로 CREATE
    [
      `CREATE TABLE ${t("Company")} (`,
      `  ${col("id")} ${ai} PRIMARY KEY,`,
      `  ${col("name")} ${varchar(200)} NOT NULL`,
      `)${engine}`,
    ].join("\n"),
    [
      `CREATE TABLE ${t("User")} (`,
      `  ${col("id")} ${ai} PRIMARY KEY,`,
      `  ${col("name")} ${varchar(100)} NOT NULL,`,
      `  ${col("email")} ${varchar(200)},`,
      `  ${col("age")} INT,`,
      `  ${col("isActive")} ${bool} DEFAULT ${defaultTrue},`,
      `  ${col("companyId")} INT`,
      `)${engine}`,
    ].join("\n"),
    [
      `CREATE TABLE ${t("Post")} (`,
      `  ${col("id")} ${ai} PRIMARY KEY,`,
      `  ${col("userId")} INT NOT NULL,`,
      `  ${col("title")} ${varchar(300)} NOT NULL,`,
      `  ${col("content")} ${text},`,
      `  ${col("viewCount")} INT DEFAULT 0`,
      `)${engine}`,
    ].join("\n"),
    [
      `CREATE TABLE ${t("Employee")} (`,
      `  ${col("id")} ${ai} PRIMARY KEY,`,
      `  ${col("name")} ${varchar(100)} NOT NULL,`,
      `  ${col("salary")} INT NOT NULL,`,
      `  ${col("departmentId")} INT,`,
      `  ${col("managerId")} INT`,
      `)${engine}`,
    ].join("\n"),
    [
      `CREATE TABLE ${t("Sales")} (`,
      `  ${col("id")} ${ai} PRIMARY KEY,`,
      `  ${col("category")} ${varchar(50)} NOT NULL,`,
      `  ${col("year")} INT NOT NULL,`,
      `  ${col("amount")} INT NOT NULL`,
      `)${engine}`,
    ].join("\n"),
    [
      `CREATE TABLE ${t("MonthlySales")} (`,
      `  ${col("id")} ${ai} PRIMARY KEY,`,
      `  ${col("category")} ${varchar(50)} NOT NULL,`,
      `  ${col("jan")} INT NOT NULL,`,
      `  ${col("feb")} INT NOT NULL,`,
      `  ${col("mar")} INT NOT NULL`,
      `)${engine}`,
    ].join("\n"),
  ];
}

function createDbTestCase(dialect: "mssql" | "mysql" | "postgresql"): DbTestCase {
  const configs = { mssql: mssqlConfig, mysql: mysqlConfig, postgresql: postgresqlConfig };
  const schemas: Record<string, string | undefined> = {
    mssql: "dbo",
    mysql: undefined,
    postgresql: "public",
  };
  const labels = { mssql: "MSSQL", mysql: "MySQL", postgresql: "PostgreSQL" };

  const ormOptions: { database: string; schema?: string } = { database: "TestDb" };
  if (schemas[dialect] != null) {
    ormOptions.schema = schemas[dialect];
  }

  const models = createModels(ormOptions);
  const testDbClass = createTestDb(models);

  return {
    label: labels[dialect],
    config: configs[dialect] as DbConnConfig,
    ormOptions,
    models,
    TestDb: testDbClass,
    setupSql: createTableSql(dialect),
    cleanupSql: [
      dropTable("Post", dialect),
      dropTable("User", dialect),
      dropTable("Employee", dialect),
      dropTable("Sales", dialect),
      dropTable("MonthlySales", dialect),
      dropTable("Company", dialect),
    ],
  };
}

export const dbCases: DbTestCase[] = [
  createDbTestCase("mssql"),
  createDbTestCase("mysql"),
  createDbTestCase("postgresql"),
];
