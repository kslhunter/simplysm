import { describe, it, expect, beforeAll } from "vitest";
import { Queryable, TDialect } from "@simplysm/orm-common";
import { NodeDbContextExecutor } from "../src";
import { DIALECTS, getConfig, TestDbContext } from "./_setup";

describe("SELECT SUBQUERY Integration Tests", () => {
  describe.each(DIALECTS)("[%s]", (dialect: TDialect) => {
    let db: TestDbContext;

    async function setupTestData() {
      await db.testUser.truncateAsync();
      await db.testUser.insertAsync([
        { name: "홍길동", email: "hong@test.com", age: 30, isActive: true },
        { name: "김철수", email: "kim@test.com", age: 25, isActive: true },
        { name: "이영희", email: "lee@test.com", age: 28, isActive: false },
        { name: "박지민", email: "park@test.com", age: 35, isActive: true },
        { name: "최서연", email: "choi@test.com", age: 22, isActive: false },
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

    it("wrap - 기본 서브쿼리", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser.wrap().resultAsync();

        expect(rows.length).toBe(5);
      });
    });

    it("wrap 후 where - 서브쿼리에 조건 추가", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .where((c) => db.qh.gt(c.age, 20))
          .wrap()
          .where((c) => db.qh.eq(c.isActive, true))
          .resultAsync();

        expect(rows.length).toBe(3);
        rows.forEach((row) => {
          expect(row.isActive).toBe(true);
          expect(Number(row.age)).toBeGreaterThan(20);
        });
      });
    });

    it("wrap 후 select - 서브쿼리에서 컬럼 선택", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .wrap()
          .select((c) => ({
            id: c.id,
            name: c.name,
          }))
          .resultAsync();

        expect(rows.length).toBe(5);
        expect(rows[0]).toHaveProperty("id");
        expect(rows[0]).toHaveProperty("name");
      });
    });

    it("wrap 후 orderBy, limit - 서브쿼리에 정렬과 페이징", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .where((c) => db.qh.eq(c.isActive, true))
          .wrap()
          .orderBy((c) => c.age)
          .limit(0, 2)
          .resultAsync();

        expect(rows.length).toBe(2);
        // 나이순 정렬 확인
        expect(Number(rows[0].age)).toBeLessThanOrEqual(Number(rows[1].age));
      });
    });

    it("union - 두 쿼리 UNION ALL", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const qr1 = db.testUser.where((c) => db.qh.eq(c.isActive, true));
        const qr2 = db.testUser.where((c) => db.qh.gt(c.age, 30));
        const rows = await Queryable.union([qr1, qr2]).resultAsync();

        // isActive=true: 3명, age>30: 1명 (박지민은 중복)
        // UNION ALL이므로 중복 포함
        expect(rows.length).toBe(4);
      });
    });

    it("union 후 wrap - union 결과를 서브쿼리로", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const qr1 = db.testUser.where((c) => db.qh.eq(c.isActive, true));
        const qr2 = db.testUser.where((c) => db.qh.gt(c.age, 30));
        const rows = await Queryable.union([qr1, qr2])
          .wrap()
          .orderBy((c) => c.name)
          .limit(0, 3)
          .resultAsync();

        expect(rows.length).toBe(3);
      });
    });

    it("wrap 다단계 - 중첩 서브쿼리", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .where((c) => db.qh.eq(c.isActive, true))
          .wrap()
          .where((c) => db.qh.gt(c.age, 24))
          .wrap()
          .select((c) => ({
            name: c.name,
            age: c.age,
          }))
          .resultAsync();

        expect(rows.length).toBe(2); // 홍길동(30), 박지민(35)
        rows.forEach((row) => {
          expect(Number(row.age)).toBeGreaterThan(24);
        });
      });
    });

    it("union + groupBy - union 결과에 집계", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const qr1 = db.testUser.where((c) => db.qh.eq(c.isActive, true));
        const qr2 = db.testUser.where((c) => db.qh.eq(c.isActive, false));

        const rows = await Queryable.union([qr1, qr2])
          .wrap()
          .select((c) => ({
            isActive: c.isActive,
            cnt: db.qh.count(),
          }))
          .groupBy((c) => [c.isActive])
          .resultAsync();

        expect(rows.length).toBe(2);
        const activeCount = rows.find((r) => r.isActive);
        const inactiveCount = rows.find((r) => !r.isActive);
        expect(Number(activeCount!.cnt)).toBe(3);
        expect(Number(inactiveCount!.cnt)).toBe(2);
      });
    });
  });
});
