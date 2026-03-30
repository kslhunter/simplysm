import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MssqlDbConn, NodeDbContextExecutor } from "@simplysm/orm-node";
import { Table, defineDbContext, createDbContext } from "@simplysm/orm-common";
import { mssqlConfig } from "../test-configs";

// 테스트 User 테이블
const User = Table("User")
  .database("TestDb")
  .schema("dbo")
  .columns((c) => ({
    id: c.int(),
    name: c.varchar(100),
  }))
  .primaryKey("id");

// 테스트 DbContext
const TestDbDef = defineDbContext({ tables: { user: User } });

describe("MSSQL DbContext - transaction", () => {
  let tedious: typeof import("tedious");
  let conn: MssqlDbConn;
  let executor: NodeDbContextExecutor;
  let db: ReturnType<typeof createDbContext<typeof TestDbDef>>;

  beforeAll(async () => {
    tedious = await import("tedious");

    // 직접 연결하여 원시 SQL 실행
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

    // DbContext 실행기 생성
    executor = new NodeDbContextExecutor(mssqlConfig);
    db = createDbContext(TestDbDef, executor, { database: "TestDb", schema: "dbo" });
  });

  afterAll(async () => {
    // 테이블 정리
    const cleanupConn = new MssqlDbConn(tedious, mssqlConfig);
    await cleanupConn.connect();
    await cleanupConn.execute([
      `IF OBJECT_ID('[TestDb].[dbo].[User]', 'U') IS NOT NULL DROP TABLE [TestDb].[dbo].[User]`,
    ]);
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
