import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { DbConn } from "@simplysm/orm-node";
import {
  MssqlDbConn,
  MysqlDbConn,
  PostgresqlDbConn,
  NodeDbContextExecutor,
} from "@simplysm/orm-node";
import { Table, DbContext } from "@simplysm/orm-common";
import { mssqlConfig, mysqlConfig, postgresqlConfig } from "../test-configs";

const dbCases = [
  {
    label: "MSSQL",
    config: mssqlConfig,
    schema: "dbo" as const,
    createTable: Table("User").database("TestDb").schema("dbo"),
    dbContextOpts: { database: "TestDb", schema: "dbo" } as const,
    async createConn(): Promise<DbConn> {
      const tedious = await import("tedious");
      return new MssqlDbConn(tedious, mssqlConfig);
    },
    setupSql: [
      `IF OBJECT_ID('[TestDb].[dbo].[User]', 'U') IS NOT NULL DROP TABLE [TestDb].[dbo].[User]`,
      `CREATE TABLE [TestDb].[dbo].[User] (
        id INT PRIMARY KEY,
        name NVARCHAR(100)
      )`,
    ],
    cleanupSql: [
      `IF OBJECT_ID('[TestDb].[dbo].[User]', 'U') IS NOT NULL DROP TABLE [TestDb].[dbo].[User]`,
    ],
  },
  {
    label: "MySQL",
    config: mysqlConfig,
    schema: undefined,
    createTable: Table("User").database("TestDb"),
    dbContextOpts: { database: "TestDb" } as const,
    async createConn(): Promise<DbConn> {
      const mysql2 = await import("mysql2/promise");
      return new MysqlDbConn(mysql2, mysqlConfig);
    },
    setupSql: [
      "DROP TABLE IF EXISTS `TestDb`.`User`",
      `CREATE TABLE \`TestDb\`.\`User\` (
        id INT PRIMARY KEY,
        name VARCHAR(100)
      )`,
    ],
    cleanupSql: ["DROP TABLE IF EXISTS `TestDb`.`User`"],
  },
  {
    label: "PostgreSQL",
    config: postgresqlConfig,
    schema: "public" as const,
    createTable: Table("User").database("TestDb").schema("public"),
    dbContextOpts: { database: "TestDb", schema: "public" } as const,
    async createConn(): Promise<DbConn> {
      const pg = await import("pg");
      const pgCopyStreams = await import("pg-copy-streams");
      return new PostgresqlDbConn(pg, pgCopyStreams, postgresqlConfig);
    },
    setupSql: [
      `DROP TABLE IF EXISTS "TestDb"."public"."User"`,
      `CREATE TABLE "TestDb"."public"."User" (
        id INT PRIMARY KEY,
        name VARCHAR(100)
      )`,
    ],
    cleanupSql: [`DROP TABLE IF EXISTS "TestDb"."public"."User"`],
  },
];

describe.each(dbCases)("$label DbContext - transaction", (dbCase) => {
  const User = dbCase.createTable
    .columns((c) => ({
      id: c.int(),
      name: c.varchar(100),
    }))
    .primaryKey("id");

  class TestDb extends DbContext {
    user = this.queryable(User);
  }

  let db: TestDb;

  beforeAll(async () => {
    // 직접 연결하여 원시 SQL 실행
    const conn = await dbCase.createConn();
    await conn.connect();
    await conn.execute(dbCase.setupSql);
    await conn.close();

    // DbContext 실행기 생성
    const executor = new NodeDbContextExecutor(dbCase.config);
    db = new TestDb(executor, dbCase.dbContextOpts);
  });

  afterAll(async () => {
    // 테이블 정리
    const cleanupConn = await dbCase.createConn();
    await cleanupConn.connect();
    await cleanupConn.execute(dbCase.cleanupSql);
    await cleanupConn.close();
  });

  it("오류 발생 시 자동 롤백", async () => {
    await db.connectWithoutTransaction(async () => {
      // 초기 데이터 삽입 (트랜잭션 내)
      await db.transaction(async () => {
        await db.user().insert([{ id: 1, name: "initial" }]);
      });

      // 트랜잭션 내 오류 발생 시 롤백이 트리거되어야 함
      await expect(
        db.transaction(async () => {
          await db.user().insert([{ id: 2, name: "should-rollback" }]);
          throw new Error("Intentional error");
        }),
      ).rejects.toThrow("Intentional error");

      // 롤백되어 1개의 레코드만 존재해야 함
      const result = await db.user().execute();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 1, name: "initial" });
    });
  });
});
