import { describe, it, expect, beforeAll } from "vitest";
import { TDialect } from "@simplysm/orm-common";
import { NodeDbContextExecutor } from "../src";
import { DIALECTS, getConfig, TestDbContext } from "./_setup";

describe("DML DELETE Integration Tests", () => {
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

    it("단일 레코드 DELETE", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const beforeRows = await db.testUser
          .select(() => ({ cnt: db.qh.count() }))
          .resultAsync();
        expect(Number(beforeRows[0].cnt)).toBe(3);

        await db.testUser
          .where((c) => db.qh.eq(c.name, "홍길동"))
          .deleteAsync();

        const afterRows = await db.testUser
          .select(() => ({ cnt: db.qh.count() }))
          .resultAsync();
        expect(Number(afterRows[0].cnt)).toBe(2);

        const checkRows = await db.testUser
          .where((c) => db.qh.eq(c.name, "홍길동"))
          .select(() => ({ cnt: db.qh.count() }))
          .resultAsync();
        expect(Number(checkRows[0].cnt)).toBe(0);
      });
    });

    it("조건에 맞는 여러 레코드 DELETE", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        await db.testUser
          .where((c) => db.qh.gte(c.age, 28))
          .deleteAsync();

        const rows = await db.testUser
          .select(() => ({ cnt: db.qh.count() }))
          .resultAsync();
        expect(Number(rows[0].cnt)).toBe(1);

        const checkRows = await db.testUser
          .select((c) => ({ name: c.name }))
          .resultAsync();
        expect(checkRows[0].name).toBe("김철수");
      });
    });

    it("전체 레코드 DELETE", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        await db.testUser.deleteAsync();

        const rows = await db.testUser
          .select(() => ({ cnt: db.qh.count() }))
          .resultAsync();
        expect(Number(rows[0].cnt)).toBe(0);
      });
    });

    it("복합 조건으로 DELETE", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        await db.testUser
          .where((c) => db.qh.gt(c.age, 25))
          .where((c) => db.qh.lt(c.age, 30))
          .deleteAsync();

        const rows = await db.testUser
          .select((c) => ({
            name: c.name,
            age: c.age,
          }))
          .orderBy((c) => c.age)
          .resultAsync();

        expect(rows.length).toBe(2);
        expect(rows[0].name).toBe("김철수");
        expect(rows[1].name).toBe("홍길동");
      });
    });

    it("존재하지 않는 조건으로 DELETE (영향 없음)", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        await db.testUser
          .where((c) => db.qh.eq(c.name, "존재하지않음"))
          .deleteAsync();

        const rows = await db.testUser
          .select(() => ({ cnt: db.qh.count() }))
          .resultAsync();
        expect(Number(rows[0].cnt)).toBe(3);
      });
    });

    it("DELETE with OUTPUT", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const result = await db.testUser
          .where((c) => db.qh.eq(c.name, "홍길동"))
          .deleteAsync(["id", "name"]);

        expect(result).toBeDefined();
        expect(result.length).toBe(1);
        expect(result[0].name).toBe("홍길동");
        expect(result[0].id).toBeDefined();

        // 실제로 삭제되었는지 확인
        const remaining = await db.testUser
          .where((c) => db.qh.eq(c.name, "홍길동"))
          .select(() => ({ cnt: db.qh.count() }))
          .resultAsync();
        expect(Number(remaining[0].cnt)).toBe(0);
      });
    });

    it("TRUNCATE TABLE", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const beforeCount = await db.testUser
          .select(() => ({ cnt: db.qh.count() }))
          .resultAsync();
        expect(Number(beforeCount[0].cnt)).toBe(3);

        await db.testUser.truncateAsync();

        const afterCount = await db.testUser
          .select(() => ({ cnt: db.qh.count() }))
          .resultAsync();
        expect(Number(afterCount[0].cnt)).toBe(0);
      });
    });

    it("DELETE 다중 레코드 with OUTPUT", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const result = await db.testUser
          .where((c) => db.qh.gte(c.age, 28))
          .deleteAsync(["id", "name", "age"]);

        expect(result).toBeDefined();
        expect(result.length).toBe(2); // 홍길동(30), 이영희(28)

        const names = result.map((r) => r.name);
        expect(names).toContain("홍길동");
        expect(names).toContain("이영희");
      });
    });
  });
});