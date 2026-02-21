import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Table, expr, defineDbContext, createDbContext } from "@simplysm/orm-common";
import { MysqlDbConn, NodeDbContextExecutor } from "@simplysm/orm-node";
import { mysqlConfig } from "../test-configs";

const EscapeTest = Table("EscapeTest")
  .database("TestDb")
  .columns((c) => ({
    id: c.int(),
    value: c.varchar(200),
  }))
  .primaryKey("id");

const TestDbDef = defineDbContext({ tables: { escapeTest: EscapeTest } });

describe("MySQL Escape Integration Test", () => {
  let mysql2: typeof import("mysql2/promise");
  let db: ReturnType<typeof createDbContext<typeof TestDbDef>>;

  beforeAll(async () => {
    mysql2 = await import("mysql2/promise");

    const conn = new MysqlDbConn(mysql2, mysqlConfig);
    await conn.connect();
    await conn.execute([
      `DROP TABLE IF EXISTS \`TestDb\`.\`EscapeTest\``,
      `CREATE TABLE \`TestDb\`.\`EscapeTest\` (
        id INT PRIMARY KEY,
        value VARCHAR(200)
      )`,
    ]);
    await conn.close();

    const executor = new NodeDbContextExecutor(mysqlConfig);
    db = createDbContext(TestDbDef, executor, { database: "TestDb" });
  });

  afterAll(async () => {
    const cleanupConn = new MysqlDbConn(mysql2, mysqlConfig);
    await cleanupConn.connect();
    await cleanupConn.execute([`DROP TABLE IF EXISTS \`TestDb\`.\`EscapeTest\``]);
    await cleanupConn.close();
  });

  it.each([
    { id: 1, value: "O'Reilly", desc: "따옴표가 포함된 값" },
    { id: 2, value: "C:\\path\\to\\file", desc: "백슬래시가 포함된 값" },
    { id: 3, value: "line1\nline2\ttab\rreturn", desc: "제어 문자가 포함된 값" },
    { id: 4, value: "'; DROP TABLE users; --", desc: "SQL 인젝션 시도" },
    { id: 5, value: "null\0byte", desc: "NULL 바이트가 포함된 값" },
    { id: 6, value: "emoji\u{1F600}test", desc: "유니코드 이모지가 포함된 값" },
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
