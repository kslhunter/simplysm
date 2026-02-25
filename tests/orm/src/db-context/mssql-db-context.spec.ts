import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MssqlDbConn, NodeDbContextExecutor } from "@simplysm/orm-node";
import { Table, defineDbContext, createDbContext } from "@simplysm/orm-common";
import { mssqlConfig } from "../test-configs";

// Test User table
const User = Table("User")
  .database("TestDb")
  .schema("dbo")
  .columns((c) => ({
    id: c.int(),
    name: c.varchar(100),
  }))
  .primaryKey("id");

// Test DbContext
const TestDbDef = defineDbContext({ tables: { user: User } });

describe("MSSQL DbContext - trans", () => {
  let tedious: typeof import("tedious");
  let conn: MssqlDbConn;
  let executor: NodeDbContextExecutor;
  let db: ReturnType<typeof createDbContext<typeof TestDbDef>>;

  beforeAll(async () => {
    tedious = await import("tedious");

    // Direct connection for raw SQL execution
    conn = new MssqlDbConn(tedious, mssqlConfig);
    await conn.connect();
    await conn.execute([
      `IF OBJECT_ID('[TestDb].[dbo].[User]', 'U') IS NOT NULL DROP TABLE [TestDb].[dbo].[User]`,
      `CREATE TABLE [TestDb].[dbo].[User] (
        id INT PRIMARY KEY,
        name NVARCHAR(100)
      )`,
    ]);
    await conn.close();

    // Create DbContext executor
    executor = new NodeDbContextExecutor(mssqlConfig);
    db = createDbContext(TestDbDef, executor, { database: "TestDb", schema: "dbo" });
  });

  afterAll(async () => {
    // Clean up tables
    const cleanupConn = new MssqlDbConn(tedious, mssqlConfig);
    await cleanupConn.connect();
    await cleanupConn.execute([
      `IF OBJECT_ID('[TestDb].[dbo].[User]', 'U') IS NOT NULL DROP TABLE [TestDb].[dbo].[User]`,
    ]);
    await cleanupConn.close();
  });

  it("Auto rollback on error", async () => {
    await db.connectWithoutTransaction(async () => {
      // Insert initial data (in transaction)
      await db.trans(async () => {
        await db.user().insert([{ id: 1, name: "initial" }]);
      });

      // Error inside trans should trigger rollback
      await expect(
        db.trans(async () => {
          await db.user().insert([{ id: 2, name: "should-rollback" }]);
          throw new Error("Intentional error");
        }),
      ).rejects.toThrow("Intentional error");

      // Rolled back, only 1 record should exist
      const result = await db.user().result();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 1, name: "initial" });
    });
  });
});
