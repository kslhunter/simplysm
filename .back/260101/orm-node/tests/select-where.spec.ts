import { beforeAll, describe, expect, it } from "vitest";
import { TDialect } from "@simplysm/orm-common";
import { NodeDbContextExecutor } from "../src";
import { DIALECTS, getConfig, TestDbContext } from "./_setup";

describe("SELECT WHERE Integration Tests", () => {
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

    it("EQUAL 조건", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .where((c) => db.qh.eq(c.name, "홍길동"))
          .select((c) => ({ name: c.name }))
          .resultAsync();

        expect(rows.length).toBe(1);
        expect(rows[0].name).toBe("홍길동");
      });
    });

    it("NOT EQUAL 조건", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .where((c) => db.qh.notEq(c.name, "홍길동"))
          .select((c) => ({ name: c.name }))
          .resultAsync();

        expect(rows.length).toBe(2);
        const names = rows.map((r) => r.name);
        expect(names).not.toContain("홍길동");
      });
    });

    it("GREATER THAN 조건", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .where((c) => db.qh.gt(c.age, 25))
          .select((c) => ({ name: c.name, age: c.age }))
          .resultAsync();

        expect(rows.length).toBe(2);
        rows.forEach((row) => {
          expect(Number(row.age)).toBeGreaterThan(25);
        });
      });
    });

    it("GREATER THAN OR EQUAL 조건", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .where((c) => db.qh.gte(c.age, 28))
          .select((c) => ({ name: c.name, age: c.age }))
          .resultAsync();

        expect(rows.length).toBe(2);
        rows.forEach((row) => {
          expect(Number(row.age)).toBeGreaterThanOrEqual(28);
        });
      });
    });

    it("LESS THAN 조건", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .where((c) => db.qh.lt(c.age, 28))
          .select((c) => ({ name: c.name, age: c.age }))
          .resultAsync();

        expect(rows.length).toBe(1);
        expect(Number(rows[0].age)).toBeLessThan(28);
      });
    });

    it("LESS THAN OR EQUAL 조건", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .where((c) => db.qh.lte(c.age, 28))
          .select((c) => ({ name: c.name, age: c.age }))
          .resultAsync();

        expect(rows.length).toBe(2);
        rows.forEach((row) => {
          expect(Number(row.age)).toBeLessThanOrEqual(28);
        });
      });
    });

    it("LIKE 조건", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .where((c) => db.qh.like(c.email, "%@test.com"))
          .select((c) => ({ name: c.name, email: c.email }))
          .resultAsync();

        expect(rows.length).toBe(3);
        rows.forEach((row) => {
          expect(row.email).toMatch(/@test\.com$/);
        });
      });
    });

    it("IS NULL 조건", async () => {
      await db.connectAsync(async () => {
        await setupTestData();
        await db.testUser.insertAsync([{ name: "박영수", age: 40 }]);

        const rows = await db.testUser
          .where((c) => db.qh.isNull(c.email))
          .select((c) => ({ name: c.name }))
          .resultAsync();

        expect(rows.length).toBe(1);
        expect(rows[0].name).toBe("박영수");
      });
    });

    it("IS NOT NULL 조건", async () => {
      await db.connectAsync(async () => {
        await setupTestData();
        await db.testUser.insertAsync([{ name: "박영수", age: 40 }]);

        const rows = await db.testUser
          .where((c) => db.qh.isNotNull(c.email))
          .select((c) => ({ name: c.name }))
          .resultAsync();

        expect(rows.length).toBe(3);
        const names = rows.map((r) => r.name);
        expect(names).not.toContain("박영수");
      });
    });

    it("AND 복합 조건", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .where((c) => db.qh.gt(c.age, 25))
          .where((c) => db.qh.lt(c.age, 30))
          .select((c) => ({ name: c.name, age: c.age }))
          .resultAsync();

        expect(rows.length).toBe(1);
        expect(rows[0].name).toBe("이영희");
      });
    });

    it("OR 복합 조건", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .where((c) => db.qh.or(db.qh.eq(c.name, "홍길동"), db.qh.eq(c.name, "김철수")))
          .select((c) => ({ name: c.name }))
          .resultAsync();

        expect(rows.length).toBe(2);
        const names = rows.map((r) => r.name);
        expect(names).toContain("홍길동");
        expect(names).toContain("김철수");
      });
    });

    it("IN 조건", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .where((c) => db.qh.in(c.age, [25, 30]))
          .select((c) => ({ name: c.name }))
          .resultAsync();

        expect(rows.length).toBe(2);
        const names = rows.map((r) => r.name);
        expect(names).toContain("홍길동");
        expect(names).toContain("김철수");
      });
    });

    it("NOT IN 조건", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .where((c) => db.qh.notIn(c.age, [25, 30]))
          .select((c) => ({ name: c.name }))
          .resultAsync();

        expect(rows.length).toBe(1);
        expect(rows[0].name).toBe("이영희");
      });
    });

    it("BETWEEN 조건", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .where((c) => db.qh.between(c.age, 26, 29))
          .select((c) => ({ name: c.name, age: c.age }))
          .resultAsync();

        expect(rows.length).toBe(1);
        expect(rows[0].name).toBe("이영희");
        expect(Number(rows[0].age)).toBe(28);
      });
    });
  });
});