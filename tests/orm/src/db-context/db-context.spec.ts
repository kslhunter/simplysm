import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createDbConn,
  createOrm,
} from "@simplysm/orm-node";
import type { DbConn, DbConnConfig } from "@simplysm/orm-node";
import type { Orm } from "@simplysm/orm-node";
import { Table, DbContext } from "@simplysm/orm-common";
import { mssqlConfig, mysqlConfig, postgresqlConfig } from "../test-configs";

const dbCases = [
  {
    label: "MSSQL",
    config: mssqlConfig as DbConnConfig,
    createTable: Table("User").database("TestDb").schema("dbo"),
    ormOptions: { database: "TestDb", schema: "dbo" } as const,
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
    config: mysqlConfig as DbConnConfig,
    createTable: Table("User").database("TestDb"),
    ormOptions: { database: "TestDb" } as const,
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
    config: postgresqlConfig as DbConnConfig,
    createTable: Table("User").database("TestDb").schema("public"),
    ormOptions: { database: "TestDb", schema: "public" } as const,
    setupSql: [
      `DROP TABLE IF EXISTS "User"`,
      `CREATE TABLE "User" (
        id INT PRIMARY KEY,
        name VARCHAR(100)
      )`,
    ],
    cleanupSql: [`DROP TABLE IF EXISTS "User"`],
  },
];

describe.each(dbCases)("$label DbContext - createOrm", (dbCase) => {
  const User = dbCase.createTable
    .columns((c) => ({
      id: c.int(),
      name: c.varchar(100),
    }))
    .primaryKey("id");

  class TestDb extends DbContext {
    user = this.queryable(User);
  }

  let orm: Orm<TestDb>;
  let setupConn: DbConn;

  beforeAll(async () => {
    setupConn = await createDbConn(dbCase.config);
    await setupConn.connect();
    await setupConn.execute(dbCase.setupSql);
    await setupConn.close();

    orm = createOrm(TestDb, dbCase.config, dbCase.ormOptions);
  });

  afterAll(async () => {
    const cleanupConn = await createDbConn(dbCase.config);
    await cleanupConn.connect();
    await cleanupConn.execute(dbCase.cleanupSql);
    await cleanupConn.close();
  });

  it("connect()로 트랜잭션 내 INSERT/SELECT", async () => {
    await orm.connect(async (db) => {
      await db.user().insert([{ id: 100, name: "orm-test" }]);
      const result = await db.user().execute();
      expect(result.some((r) => r.id === 100 && r.name === "orm-test")).toBe(true);
    });
  });

  it("connectWithoutTransaction()로 트랜잭션 없이 실행", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user().execute();
      expect(result.some((r) => r.id === 100)).toBe(true);
    });
  });

  it("connect() 오류 발생 시 자동 롤백", async () => {
    await expect(
      orm.connect(async (db) => {
        await db.user().insert([{ id: 200, name: "should-rollback" }]);
        throw new Error("Intentional error");
      }),
    ).rejects.toThrow("Intentional error");

    await orm.connectWithoutTransaction(async (db) => {
      const result = await db.user().execute();
      expect(result.some((r) => r.id === 200)).toBe(false);
    });
  });

  it("connectWithoutTransaction() 내부 transaction()으로 부분 트랜잭션", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      await db.transaction(async () => {
        await db.user().insert([{ id: 300, name: "partial-tx" }]);
      });

      const result = await db.user().execute();
      expect(result.some((r) => r.id === 300 && r.name === "partial-tx")).toBe(true);
    });
  });

  it("connectWithoutTransaction() 내부 transaction() 오류 시 부분 롤백", async () => {
    await orm.connectWithoutTransaction(async (db) => {
      await expect(
        db.transaction(async () => {
          await db.user().insert([{ id: 400, name: "should-rollback" }]);
          throw new Error("Intentional error");
        }),
      ).rejects.toThrow("Intentional error");

      const result = await db.user().execute();
      expect(result.some((r) => r.id === 400)).toBe(false);
    });
  });
});
