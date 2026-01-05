import { describe, it, expect, beforeAll } from "vitest";
import { TDialect } from "@simplysm/orm-common";
import { NodeDbContextExecutor } from "../src";
import { DIALECTS, getConfig, TestDbContext } from "./_setup";

describe("DML UPDATE Integration Tests", () => {
  describe.each(DIALECTS)("[%s]", (dialect: TDialect) => {
    let db: TestDbContext;

    async function setupTestData() {
      await db.testUser.truncateAsync();
      await db.testUser.insertAsync([
        { name: "홍길동", email: "hong@test.com", age: 30, isActive: true },
        { name: "김철수", email: "kim@test.com", age: 25, isActive: true },
        { name: "이영희", email: "lee@test.com", age: 28, isActive: false },
      ]);
    }

    beforeAll(async () => {
      const config = getConfig(dialect);
      const executor = new NodeDbContextExecutor(config);
      db = new TestDbContext(executor, { dialect, database: config.database });

      await db.connectWithoutTransactionAsync(async () => {
        await db.initializeAsync({ force: true });
      });
    });

    it("단일 레코드 UPDATE", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        await db.testUser
          .where((c) => db.qh.eq(c.name, "홍길동"))
          .updateAsync(() => ({ age: 35 }));

        const rows = await db.testUser
          .where((c) => db.qh.eq(c.name, "홍길동"))
          .select((c) => ({
            name: c.name,
            age: c.age,
          }))
          .resultAsync();

        expect(rows.length).toBe(1);
        expect(Number(rows[0].age)).toBe(35);
      });
    });

    it("다중 레코드 UPDATE", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        await db.testUser.updateAsync(() => ({ isActive: false }));

        const rows = await db.testUser
          .where((c) => db.qh.eq(c.isActive, false))
          .select(() => ({
            cnt: db.qh.count(),
          }))
          .resultAsync();

        expect(Number(rows[0].cnt)).toBe(3);
      });
    });

    it("여러 컬럼 동시 UPDATE", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        await db.testUser
          .where((c) => db.qh.eq(c.name, "김철수"))
          .updateAsync(() => ({
            email: "newkim@test.com",
            age: 30,
          }));

        const rows = await db.testUser
          .where((c) => db.qh.eq(c.name, "김철수"))
          .select((c) => ({
            email: c.email,
            age: c.age,
          }))
          .resultAsync();

        expect(rows[0].email).toBe("newkim@test.com");
        expect(Number(rows[0].age)).toBe(30);
      });
    });

    it("NULL 값으로 UPDATE", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        await db.testUser
          .where((c) => db.qh.eq(c.name, "이영희"))
          .updateAsync(() => ({ email: db.qh.val(undefined) }));

        const rows = await db.testUser
          .where((c) => db.qh.eq(c.name, "이영희"))
          .select((c) => ({
            name: c.name,
            email: c.email,
          }))
          .resultAsync();

        expect(rows.length).toBe(1);
        expect(rows[0].name).toBe("이영희");
        expect(rows[0].email).toBeUndefined();
      });
    });

    it("조건에 맞는 레코드만 UPDATE", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        await db.testUser
          .where((c) => db.qh.gte(c.age, 28))
          .updateAsync(() => ({ isActive: false }));

        const rows = await db.testUser
          .where((c) => db.qh.eq(c.isActive, false))
          .select(() => ({
            cnt: db.qh.count(),
          }))
          .resultAsync();

        expect(Number(rows[0].cnt)).toBe(2);
      });
    });

    it("UPDATE with OUTPUT", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const result = await db.testUser
          .where((c) => db.qh.eq(c.name, "홍길동"))
          .updateAsync(() => ({ age: 99 }), ["id", "name", "age"]);

        expect(result).toBeDefined();
        expect(result.length).toBe(1);
        expect(result[0].name).toBe("홍길동");
        expect(Number(result[0].age)).toBe(99);
      });
    });

    it("UPDATE with 기존값 (c.age + 3)", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const beforeRow = await db.testUser
          .where((c) => db.qh.eq(c.name, "홍길동"))
          .select((c) => ({ age: c.age }))
          .resultAsync();
        const beforeAge = Number(beforeRow[0].age);

        await db.testUser
          .where((c) => db.qh.eq(c.name, "홍길동"))
          .updateAsync((c) => ({
            age: db.qh.sql("number")`${c.age} + 3`,
          }));

        const afterRow = await db.testUser
          .where((c) => db.qh.eq(c.name, "홍길동"))
          .select((c) => ({ age: c.age }))
          .resultAsync();

        expect(Number(afterRow[0].age)).toBe(beforeAge + 3);
      });
    });

    it("여러 컬럼 동시 UPDATE", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        await db.testUser
          .where((c) => db.qh.eq(c.name, "김철수"))
          .updateAsync(() => ({
            email: "newkim@test.com",
            age: 30,
            isActive: false,
          }));

        const rows = await db.testUser
          .where((c) => db.qh.eq(c.name, "김철수"))
          .select((c) => ({
            email: c.email,
            age: c.age,
            isActive: c.isActive,
          }))
          .resultAsync();

        expect(rows[0].email).toBe("newkim@test.com");
        expect(Number(rows[0].age)).toBe(30);
        expect(rows[0].isActive).toBe(false);
      });
    });
  });
});