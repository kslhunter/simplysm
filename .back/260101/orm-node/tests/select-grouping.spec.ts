import { describe, it, expect, beforeAll } from "vitest";
import { TDialect } from "@simplysm/orm-common";
import { NodeDbContextExecutor } from "../src";
import { DIALECTS, getConfig, TestDbContext } from "./_setup";

describe("SELECT GROUPING Integration Tests", () => {
  describe.each(DIALECTS)("[%s]", (dialect: TDialect) => {
    let db: TestDbContext;

    async function setupTestData() {
      await db.testUser.truncateAsync();
      await db.testUser.insertAsync([
        { name: "홍길동", email: "hong@test.com", age: 30, isActive: true },
        { name: "김철수", email: "kim@test.com", age: 25, isActive: true },
        { name: "이영희", email: "lee@test.com", age: 28, isActive: false },
        { name: "최서연", email: "choi@test.com", age: 35, isActive: false },
        { name: "박지민", email: "park@test.com", age: 22, isActive: true },
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

    it("GROUP BY 단일 컬럼", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
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

    it("GROUP BY with SUM", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .select((c) => ({
            isActive: c.isActive,
            totalAge: db.qh.sum(c.age),
          }))
          .groupBy((c) => [c.isActive])
          .resultAsync();

        expect(rows.length).toBe(2);
        const activeSum = rows.find((r) => r.isActive);
        const inactiveSum = rows.find((r) => !r.isActive);
        expect(Number(activeSum!.totalAge)).toBe(77);
        expect(Number(inactiveSum!.totalAge)).toBe(63);
      });
    });

    it("GROUP BY with AVG", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .select((c) => ({
            isActive: c.isActive,
            avgAge: db.qh.avg(c.age),
          }))
          .groupBy((c) => [c.isActive])
          .resultAsync();

        expect(rows.length).toBe(2);
        const activeAvg = rows.find((r) => r.isActive);
        const inactiveAvg = rows.find((r) => !r.isActive);
        expect(Number(activeAvg!.avgAge)).toBeGreaterThanOrEqual(25);
        expect(Number(activeAvg!.avgAge)).toBeLessThanOrEqual(26);
        expect(Number(inactiveAvg!.avgAge)).toBeGreaterThanOrEqual(31);
        expect(Number(inactiveAvg!.avgAge)).toBeLessThanOrEqual(32);
      });
    });

    it("GROUP BY with MIN/MAX", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .select((c) => ({
            isActive: c.isActive,
            minAge: db.qh.min(c.age),
            maxAge: db.qh.max(c.age),
          }))
          .groupBy((c) => [c.isActive])
          .resultAsync();

        expect(rows.length).toBe(2);
        const active = rows.find((r) => r.isActive);
        const inactive = rows.find((r) => !r.isActive);

        expect(Number(active!.minAge)).toBe(22);
        expect(Number(active!.maxAge)).toBe(30);
        expect(Number(inactive!.minAge)).toBe(28);
        expect(Number(inactive!.maxAge)).toBe(35);
      });
    });

    it("GROUP BY with HAVING", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .select((c) => ({
            isActive: c.isActive,
            cnt: db.qh.count(),
          }))
          .groupBy((c) => [c.isActive])
          .having(() => db.qh.gt(db.qh.count(), 2))
          .resultAsync();

        expect(rows.length).toBe(1);
        expect(Number(rows[0].cnt)).toBe(3);
      });
    });

    it("COUNT 집계", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .select(() => ({
            totalCount: db.qh.count(),
          }))
          .resultAsync();

        expect(Number(rows[0].totalCount)).toBe(5);
      });
    });

    it("SUM 집계 (전체)", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .select((c) => ({
            totalAge: db.qh.sum(c.age),
          }))
          .resultAsync();

        expect(Number(rows[0].totalAge)).toBe(140);
      });
    });

    it("AVG 집계 (전체)", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .select((c) => ({
            avgAge: db.qh.avg(c.age),
          }))
          .resultAsync();

        expect(Number(rows[0].avgAge)).toBe(28);
      });
    });

    it("MIN/MAX 집계 (전체)", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .select((c) => ({
            minAge: db.qh.min(c.age),
            maxAge: db.qh.max(c.age),
          }))
          .resultAsync();

        expect(Number(rows[0].minAge)).toBe(22);
        expect(Number(rows[0].maxAge)).toBe(35);
      });
    });
  });
});