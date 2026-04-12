import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Table, expr, DbContext } from "@simplysm/orm-common";
import type { DbConnConfig } from "@simplysm/orm-node";
import {
  MssqlDbConn,
  MysqlDbConn,
  PostgresqlDbConn,
  NodeDbContextExecutor,
} from "@simplysm/orm-node";
import { mssqlConfig, mysqlConfig, postgresqlConfig } from "../test-configs";
import * as tedious from "tedious";
import * as mysql2 from "mysql2/promise";
import * as pg from "pg";
import * as pgCopyStreams from "pg-copy-streams";

interface DialectDef {
  name: string;
  config: DbConnConfig;
  schema?: string;
  tableDef: ReturnType<typeof createTableDef>;
  setupSql: string[];
  cleanupSql: string[];
  createConn: () => { connect(): Promise<void>; execute(q: string[]): Promise<unknown>; close(): Promise<void> };
  extraCases: Array<{ id: number; value: string; desc: string }>;
}

function createTableDef(schema?: string) {
  const builder = Table("EscapeTest").database("TestDb");
  const withSchema = schema !== undefined ? builder.schema(schema) : builder;
  return withSchema
    .columns((c) => ({
      id: c.int(),
      value: c.varchar(200),
    }))
    .primaryKey("id");
}

const commonCases = [
  { id: 1, value: "O'Reilly", desc: "따옴표가 포함된 값" },
  { id: 2, value: "C:\\path\\to\\file", desc: "백슬래시가 포함된 값" },
  { id: 3, value: "line1\nline2\ttab\rreturn", desc: "제어 문자가 포함된 값" },
  { id: 4, value: "'; DROP TABLE users; --", desc: "SQL 인젝션 시도" },
];

const dialects: DialectDef[] = [
  {
    name: "MSSQL",
    config: mssqlConfig,
    schema: "dbo",
    tableDef: createTableDef("dbo"),
    setupSql: [
      `IF OBJECT_ID('[TestDb].[dbo].[EscapeTest]', 'U') IS NOT NULL DROP TABLE [TestDb].[dbo].[EscapeTest]`,
      `CREATE TABLE [TestDb].[dbo].[EscapeTest] (
        id INT PRIMARY KEY,
        value NVARCHAR(200)
      )`,
    ],
    cleanupSql: [
      `IF OBJECT_ID('[TestDb].[dbo].[EscapeTest]', 'U') IS NOT NULL DROP TABLE [TestDb].[dbo].[EscapeTest]`,
    ],
    createConn() {
      return new MssqlDbConn(tedious, mssqlConfig);
    },
    extraCases: [{ id: 5, value: "emoji\u{1F600}test", desc: "유니코드 이모지가 포함된 값" }],
  },
  {
    name: "MySQL",
    config: mysqlConfig,
    schema: undefined,
    tableDef: createTableDef(),
    setupSql: [
      "DROP TABLE IF EXISTS `TestDb`.`EscapeTest`",
      `CREATE TABLE \`TestDb\`.\`EscapeTest\` (
        id INT PRIMARY KEY,
        value VARCHAR(200)
      )`,
    ],
    cleanupSql: ["DROP TABLE IF EXISTS `TestDb`.`EscapeTest`"],
    createConn() {
      return new MysqlDbConn(mysql2, mysqlConfig);
    },
    extraCases: [
      { id: 5, value: "null\0byte", desc: "NULL 바이트가 포함된 값" },
      { id: 6, value: "emoji\u{1F600}test", desc: "유니코드 이모지가 포함된 값" },
    ],
  },
  {
    name: "PostgreSQL",
    config: postgresqlConfig,
    schema: "public",
    tableDef: createTableDef("public"),
    setupSql: [
      `DROP TABLE IF EXISTS "public"."EscapeTest"`,
      `CREATE TABLE "public"."EscapeTest" (
        id INT PRIMARY KEY,
        value VARCHAR(200)
      )`,
    ],
    cleanupSql: [`DROP TABLE IF EXISTS "public"."EscapeTest"`],
    createConn() {
      return new PostgresqlDbConn(pg, pgCopyStreams, postgresqlConfig);
    },
    extraCases: [
      { id: 5, value: "emoji\u{1F600}test", desc: "유니코드 이모지가 포함된 값" },
      { id: 6, value: "\\N", desc: "PostgreSQL NULL 마커 리터럴이 포함된 값" },
    ],
  },
];

describe.each(dialects)("$name Escape Integration Test", (dialect) => {
  let db: InstanceType<typeof TestDbClass>;

  const TestDbClass = class extends DbContext {
    escapeTest = this.queryable(dialect.tableDef);
  };

  beforeAll(async () => {
    const conn = dialect.createConn();
    await conn.connect();
    await conn.execute(dialect.setupSql);
    await conn.close();

    const dbContextOpts: { database: string; schema?: string } = { database: "TestDb" };
    if (dialect.schema !== undefined) {
      dbContextOpts.schema = dialect.schema;
    }
    const executor = new NodeDbContextExecutor(dialect.config);
    db = new TestDbClass(executor, dbContextOpts);
  });

  afterAll(async () => {
    const conn = dialect.createConn();
    await conn.connect();
    await conn.execute(dialect.cleanupSql);
    await conn.close();
  });

  const allCases = [...commonCases, ...dialect.extraCases];

  it.each(allCases)("$desc 저장 및 조회가 가능해야 함", async ({ id, value }) => {
    await db.connectWithoutTransaction(async () => {
      await db.transaction(async () => {
        await db.escapeTest().insert([{ id, value }]);
      });

      const result = await db
        .escapeTest()
        .where((item) => [expr.eq(item.id, id)])
        .execute();
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(value);
    });
  });
});
