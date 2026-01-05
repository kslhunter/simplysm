import { describe, it, expect, beforeAll } from "vitest";
import { TDialect } from "@simplysm/orm-common";
import { NodeDbContextExecutor } from "../src";
import { DIALECTS, getConfig, TestDbContext } from "./_setup";

describe("SELECT Basic Integration Tests", () => {
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

    it("전체 컬럼 SELECT", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .select((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            age: c.age,
          }))
          .resultAsync();

        expect(rows.length).toBeGreaterThan(0);
        expect(rows[0]).toHaveProperty("id");
        expect(rows[0]).toHaveProperty("name");
      });
    });

    it("특정 컬럼만 SELECT", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .select((c) => ({
            name: c.name,
          }))
          .resultAsync();

        expect(rows.length).toBeGreaterThan(0);
        expect(rows[0]).toHaveProperty("name");
        expect(rows[0]).not.toHaveProperty("email");
      });
    });

    it("COUNT 집계", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .select(() => ({
            cnt: db.qh.count(),
          }))
          .resultAsync();

        expect(Number(rows[0].cnt)).toBe(3);
      });
    });

    it("DISTINCT SELECT", async () => {
      await db.connectAsync(async () => {
        await setupTestData();
        // 중복 데이터 추가
        await db.testUser.insertAsync([{ name: "홍길동", age: 25 }]);

        const rows = await db.testUser
          .select((c) => ({
            name: c.name,
          }))
          .distinct()
          .resultAsync();

        // 중복 제거 확인
        const names = rows.map((r) => r.name);
        const uniqueNames = [...new Set(names)];
        expect(names.length).toBe(uniqueNames.length);
      });
    });

    it("TOP/LIMIT SELECT", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .select((c) => ({
            name: c.name,
          }))
          .top(2)
          .resultAsync();

        expect(rows.length).toBe(2);
      });
    });

    it("컬럼 alias 변경", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .select((c) => ({
            userId: c.id,
            userName: c.name,
            userEmail: c.email,
          }))
          .resultAsync();

        expect(rows.length).toBeGreaterThan(0);
        expect(rows[0]).toHaveProperty("userId");
        expect(rows[0]).toHaveProperty("userName");
        expect(rows[0]).toHaveProperty("userEmail");
      });
    });

    it("계산된 컬럼 SELECT (length, upper)", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .select((c) => ({
            name: c.name,
            nameLength: db.qh.length(c.name),
            upperName: db.qh.upper(c.name),
          }))
          .resultAsync();

        expect(rows.length).toBeGreaterThan(0);
        const hong = rows.find((r) => r.name === "홍길동");
        expect(hong).toBeDefined();
        expect(Number(hong!.nameLength)).toBe(3);
        expect(hong!.upperName).toBe("홍길동"); // 한글은 upper 변화 없음
      });
    });

    it("고정값 포함 SELECT (val)", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .select((c) => ({
            id: c.id,
            name: c.name,
            fixedString: db.qh.val("hello"),
            fixedNumber: db.qh.val(100),
          }))
          .resultAsync();

        expect(rows.length).toBeGreaterThan(0);
        expect(rows[0].fixedString).toBe("hello");
        expect(Number(rows[0].fixedNumber)).toBe(100);
      });
    });

    it("TOP with select", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .select((c) => ({
            id: c.id,
            name: c.name,
          }))
          .top(1)
          .resultAsync();

        expect(rows.length).toBe(1);
        expect(rows[0]).toHaveProperty("id");
        expect(rows[0]).toHaveProperty("name");
      });
    });

    it("distinct + top + select 복합", async () => {
      await db.connectAsync(async () => {
        await setupTestData();
        // 중복 데이터 추가
        await db.testUser.insertAsync([{ name: "홍길동", age: 40 }]);

        const rows = await db.testUser
          .select((c) => ({
            name: c.name,
          }))
          .distinct()
          .top(2)
          .resultAsync();

        expect(rows.length).toBe(2);
        // 중복 제거 확인
        const names = rows.map((r) => r.name);
        const uniqueNames = [...new Set(names)];
        expect(names.length).toBe(uniqueNames.length);
      });
    });
  });
});