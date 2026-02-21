import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Table, expr, defineDbContext, createDbContext } from "@simplysm/orm-common";
import { MssqlDbConn, NodeDbContextExecutor } from "@simplysm/orm-node";
import { mssqlConfig } from "../test-configs";

const EscapeTest = Table("EscapeTest")
  .database("TestDb")
  .schema("dbo")
  .columns((c) => ({
    id: c.int(),
    value: c.varchar(200),
  }))
  .primaryKey("id");

const TestDbDef = defineDbContext({ tables: { escapeTest: EscapeTest } });

describe("MSSQL Escape Integration Test", () => {
  let tedious: typeof import("tedious");
  let db: ReturnType<typeof createDbContext<typeof TestDbDef>>;

  beforeAll(async () => {
    tedious = await import("tedious");

    const conn = new MssqlDbConn(tedious, mssqlConfig);
    await conn.connect();
    await conn.execute([
      `IF OBJECT_ID('[TestDb].[dbo].[EscapeTest]', 'U') IS NOT NULL DROP TABLE [TestDb].[dbo].[EscapeTest]`,
      `CREATE TABLE [TestDb].[dbo].[EscapeTest] (
        id INT PRIMARY KEY,
        value NVARCHAR(200)
      )`,
    ]);
    await conn.close();

    const executor = new NodeDbContextExecutor(mssqlConfig);
    db = createDbContext(TestDbDef, executor, { database: "TestDb", schema: "dbo" });
  });

  afterAll(async () => {
    const cleanupConn = new MssqlDbConn(tedious, mssqlConfig);
    await cleanupConn.connect();
    await cleanupConn.execute([
      `IF OBJECT_ID('[TestDb].[dbo].[EscapeTest]', 'U') IS NOT NULL DROP TABLE [TestDb].[dbo].[EscapeTest]`,
    ]);
    await cleanupConn.close();
  });

  it.each([
    { id: 1, value: "O'Reilly", desc: "따옴표가 포함된 값" },
    { id: 2, value: "C:\\path\\to\\file", desc: "백슬래시가 포함된 값" },
    { id: 3, value: "line1\nline2\ttab\rreturn", desc: "제어 문자가 포함된 값" },
    { id: 4, value: "'; DROP TABLE users; --", desc: "SQL 인젝션 시도" },
    { id: 5, value: "emoji\u{1F600}test", desc: "유니코드 이모지가 포함된 값" },
  ])("$desc을 저장하고 조회할 수 있어야 함", async ({ id, value }) => {
    await db.connectWithoutTransaction(async () => {
      await db.trans(async () => {
        await db.escapeTest().insert([{ id, value }]);
      });

      const result = await db
        .escapeTest()
        .where((item) => [expr.eq(item.id, id)])
        .result();
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(value);
    });
  });
});
