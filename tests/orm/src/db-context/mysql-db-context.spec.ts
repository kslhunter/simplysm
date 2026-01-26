import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MysqlDbConn, NodeDbContextExecutor } from "@simplysm/orm-node";
import { DbContext, Table, queryable } from "@simplysm/orm-common";
import { mysqlConfig } from "../test-configs";

// 테스트용 User 테이블
const User = Table("User")
  .database("TestDb")
  .columns((c) => ({
    id: c.int(),
    name: c.varchar(100),
  }))
  .primaryKey("id");

// 테스트용 DbContext
class TestDbContext extends DbContext {
  user = queryable(this, User);
}

describe("MySQL DbContext - transAsync", () => {
  let mysql2: typeof import("mysql2/promise");
  let conn: MysqlDbConn;
  let executor: NodeDbContextExecutor;
  let db: TestDbContext;

  beforeAll(async () => {
    mysql2 = await import("mysql2/promise");

    // raw SQL 실행을 위한 직접 연결
    conn = new MysqlDbConn(mysql2, mysqlConfig);
    await conn.connectAsync();
    await conn.executeAsync([
      `DROP TABLE IF EXISTS \`TestDb\`.\`User\``,
      `CREATE TABLE \`TestDb\`.\`User\` (
        id INT PRIMARY KEY,
        name VARCHAR(100)
      )`,
    ]);
    await conn.closeAsync();

    // DbContext 실행기 생성
    executor = new NodeDbContextExecutor(mysqlConfig);
    db = new TestDbContext(executor, { database: "TestDb" });
  });

  afterAll(async () => {
    // 테이블 정리
    const cleanupConn = new MysqlDbConn(mysql2, mysqlConfig);
    await cleanupConn.connectAsync();
    await cleanupConn.executeAsync([`DROP TABLE IF EXISTS \`TestDb\`.\`User\``]);
    await cleanupConn.closeAsync();
  });

  it("에러 발생 시 자동 롤백", async () => {
    await db.connectWithoutTransactionAsync(async () => {
      // 초기 데이터 삽입 (트랜잭션 내)
      await db.transAsync(async () => {
        await db.user().insertAsync([{ id: 1, name: "initial" }]);
      });

      // transAsync 내부에서 에러 발생 시 롤백되어야 함
      await expect(
        db.transAsync(async () => {
          await db.user().insertAsync([{ id: 2, name: "should-rollback" }]);
          throw new Error("Intentional error");
        }),
      ).rejects.toThrow("Intentional error");

      // 롤백되어 1건만 존재해야 함
      const result = await db.user().resultAsync();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 1, name: "initial" });
    });
  });
});
