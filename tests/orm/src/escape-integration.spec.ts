import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { DbContext, Table, queryable, expr } from "@simplysm/orm-common";
import { MysqlDbConn, NodeDbContextExecutor } from "@simplysm/orm-node";
import { mysqlConfig } from "./src/test-configs";

const EscapeTest = Table("EscapeTest")
  .database("TestDb")
  .columns((c) => ({
    id: c.int(),
    value: c.varchar(200),
  }))
  .primaryKey("id");

class TestDbContext extends DbContext {
  escapeTest = queryable(this, EscapeTest);
}

describe("SQL Escape Integration Test", () => {
  let mysql2: typeof import("mysql2/promise");
  let db: TestDbContext;

  beforeAll(async () => {
    mysql2 = await import("mysql2/promise");

    // raw SQL 실행을 위한 직접 연결
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

    // DbContext 실행기 생성
    const executor = new NodeDbContextExecutor(mysqlConfig);
    db = new TestDbContext(executor, { database: "TestDb" });
  });

  afterAll(async () => {
    // 테이블 정리
    const cleanupConn = new MysqlDbConn(mysql2, mysqlConfig);
    await cleanupConn.connect();
    await cleanupConn.execute([`DROP TABLE IF EXISTS \`TestDb\`.\`EscapeTest\``]);
    await cleanupConn.close();
  });

  it("따옴표가 포함된 값을 저장하고 조회할 수 있어야 함", async () => {
    const testValue = "O'Reilly";

    await db.connectWithoutTransaction(async () => {
      // 데이터 삽입
      await db.trans(async () => {
        await db.escapeTest().insert([{ id: 1, value: testValue }]);
      });

      // 조회 및 검증
      const result = await db
        .escapeTest()
        .where((item) => [expr.eq(item.id, 1)])
        .result();
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(testValue);
    });
  });

  it("백슬래시가 포함된 값을 저장하고 조회할 수 있어야 함", async () => {
    const testValue = "C:\\path\\to\\file";

    await db.connectWithoutTransaction(async () => {
      // 데이터 삽입
      await db.trans(async () => {
        await db.escapeTest().insert([{ id: 2, value: testValue }]);
      });

      // 조회 및 검증
      const result = await db
        .escapeTest()
        .where((item) => [expr.eq(item.id, 2)])
        .result();
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(testValue);
    });
  });

  it("제어 문자가 포함된 값을 저장하고 조회할 수 있어야 함", async () => {
    const testValue = "line1\nline2\ttab\rreturn";

    await db.connectWithoutTransaction(async () => {
      // 데이터 삽입
      await db.trans(async () => {
        await db.escapeTest().insert([{ id: 3, value: testValue }]);
      });

      // 조회 및 검증
      const result = await db
        .escapeTest()
        .where((item) => [expr.eq(item.id, 3)])
        .result();
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(testValue);
    });
  });

  it("SQL 인젝션 시도를 안전하게 저장하고 조회할 수 있어야 함", async () => {
    const maliciousValue = "'; DROP TABLE users; --";

    await db.connectWithoutTransaction(async () => {
      // 데이터 삽입
      await db.trans(async () => {
        await db.escapeTest().insert([{ id: 4, value: maliciousValue }]);
      });

      // 조회 및 검증
      const result = await db
        .escapeTest()
        .where((item) => [expr.eq(item.id, 4)])
        .result();
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(maliciousValue);
    });
  });
});
