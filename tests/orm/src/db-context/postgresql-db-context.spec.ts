import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgresqlDbConn, NodeDbContextExecutor } from "@simplysm/orm-node";
import { Table, defineDbContext, createDbContext } from "@simplysm/orm-common";
import { postgresqlConfig } from "../test-configs";

// Test User table
const User = Table("User")
  .database("TestDb")
  .schema("public")
  .columns((c) => ({
    id: c.int(),
    name: c.varchar(100),
  }))
  .primaryKey("id");

// Test DbContext
const TestDbDef = defineDbContext({ tables: { user: User } });

describe("PostgreSQL DbContext - trans", () => {
  let pg: typeof import("pg");
  let pgCopyStreams: typeof import("pg-copy-streams");
  let conn: PostgresqlDbConn;
  let executor: NodeDbContextExecutor;
  let db: ReturnType<typeof createDbContext<typeof TestDbDef>>;

  beforeAll(async () => {
    pg = await import("pg");
    pgCopyStreams = await import("pg-copy-streams");

    // Direct connection for raw SQL execution
    conn = new PostgresqlDbConn(pg, pgCopyStreams, postgresqlConfig);
    await conn.connect();
    await conn.execute([
      `DROP TABLE IF EXISTS "TestDb"."public"."User"`,
      `CREATE TABLE "TestDb"."public"."User" (
        id INT PRIMARY KEY,
        name VARCHAR(100)
      )`,
    ]);
    await conn.close();

    // Create DbContext executor
    executor = new NodeDbContextExecutor(postgresqlConfig);
    db = createDbContext(TestDbDef, executor, { database: "TestDb", schema: "public" });
  });

  afterAll(async () => {
    // Clean up tables
    const cleanupConn = new PostgresqlDbConn(pg, pgCopyStreams, postgresqlConfig);
    await cleanupConn.connect();
    await cleanupConn.execute([`DROP TABLE IF EXISTS "TestDb"."public"."User"`]);
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
