import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MysqlDbConn, NodeDbContextExecutor } from "@simplysm/orm-node";
import { Table, defineDbContext, createDbContext } from "@simplysm/orm-common";
import { mysqlConfig } from "../test-configs";

// Test User table
const User = Table("User")
  .database("TestDb")
  .columns((c) => ({
    id: c.int(),
    name: c.varchar(100),
  }))
  .primaryKey("id");

// Test DbContext
const TestDbDef = defineDbContext({ tables: { user: User } });

describe("MySQL DbContext - trans", () => {
  let mysql2: typeof import("mysql2/promise");
  let conn: MysqlDbConn;
  let executor: NodeDbContextExecutor;
  let db: ReturnType<typeof createDbContext<typeof TestDbDef>>;

  beforeAll(async () => {
    mysql2 = await import("mysql2/promise");

    // Direct connection for raw SQL execution
    conn = new MysqlDbConn(mysql2, mysqlConfig);
    await conn.connect();
    await conn.execute([
      `DROP TABLE IF EXISTS \`TestDb\`.\`User\``,
      `CREATE TABLE \`TestDb\`.\`User\` (
        id INT PRIMARY KEY,
        name VARCHAR(100)
      )`,
    ]);
    await conn.close();

    // Create DbContext executor
    executor = new NodeDbContextExecutor(mysqlConfig);
    db = createDbContext(TestDbDef, executor, { database: "TestDb" });
  });

  afterAll(async () => {
    // Clean up tables
    const cleanupConn = new MysqlDbConn(mysql2, mysqlConfig);
    await cleanupConn.connect();
    await cleanupConn.execute([`DROP TABLE IF EXISTS \`TestDb\`.\`User\``]);
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
