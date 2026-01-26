import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MssqlDbConn, NodeDbContextExecutor } from "@simplysm/orm-node";
import { DbContext, Table, queryable } from "@simplysm/orm-common";
import { mssqlConfig } from "../test-configs";

// 테스트용 User 테이블
const User = Table("User")
  .database("TestDb")
  .schema("dbo")
  .columns((c) => ({
    id: c.int(),
    name: c.varchar(100),
  }))
  .primaryKey("id");

// 테스트용 DbContext
class TestDbContext extends DbContext {
  user = queryable(this, User);
}

describe("MSSQL DbContext - transAsync", () => {
  let tedious: typeof import("tedious");
  let conn: MssqlDbConn;
  let executor: NodeDbContextExecutor;
  let db: TestDbContext;

  beforeAll(async () => {
    tedious = await import("tedious");

    // raw SQL 실행을 위한 직접 연결
    conn = new MssqlDbConn(tedious, mssqlConfig);
    await conn.connectAsync();
    await conn.executeAsync([
      `IF OBJECT_ID('[TestDb].[dbo].[User]', 'U') IS NOT NULL DROP TABLE [TestDb].[dbo].[User]`,
      `CREATE TABLE [TestDb].[dbo].[User] (
        id INT PRIMARY KEY,
        name NVARCHAR(100)
      )`,
    ]);
    await conn.closeAsync();

    // DbContext 실행기 생성
    executor = new NodeDbContextExecutor(mssqlConfig);
    db = new TestDbContext(executor, { database: "TestDb", schema: "dbo" });
  });

  afterAll(async () => {
    // 테이블 정리
    const cleanupConn = new MssqlDbConn(tedious, mssqlConfig);
    await cleanupConn.connectAsync();
    await cleanupConn.executeAsync([
      `IF OBJECT_ID('[TestDb].[dbo].[User]', 'U') IS NOT NULL DROP TABLE [TestDb].[dbo].[User]`,
    ]);
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
