import { describe, it, expect, beforeAll } from "vitest";
import { TDialect } from "@simplysm/orm-common";
import { NodeDbContextExecutor } from "../src";
import { DIALECTS, getConfig, TestDbContext } from "./_setup";

describe("SELECT ORDERING Integration Tests", () => {
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

    it("ORDER BY ASC", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .select((c) => ({ name: c.name, age: c.age }))
          .orderBy((c) => c.age)
          .resultAsync();

        expect(rows.length).toBe(3);
        expect(rows[0].name).toBe("김철수");
        expect(rows[1].name).toBe("이영희");
        expect(rows[2].name).toBe("홍길동");
      });
    });

    it("ORDER BY DESC", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .select((c) => ({ name: c.name, age: c.age }))
          .orderBy((c) => c.age, true)
          .resultAsync();

        expect(rows.length).toBe(3);
        expect(rows[0].name).toBe("홍길동");
        expect(rows[1].name).toBe("이영희");
        expect(rows[2].name).toBe("김철수");
      });
    });

    it("ORDER BY 문자열 컬럼 ASC", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .select((c) => ({ name: c.name }))
          .orderBy((c) => c.name)
          .resultAsync();

        expect(rows.length).toBe(3);
        expect(rows[0].name).toBe("김철수");
        expect(rows[1].name).toBe("이영희");
        expect(rows[2].name).toBe("홍길동");
      });
    });

    it("ORDER BY 다중 컬럼", async () => {
      await db.connectAsync(async () => {
        await setupTestData();
        await db.testUser.insertAsync([{ name: "박영수", email: "park@test.com", age: 25 }]);

        const rows = await db.testUser
          .select((c) => ({ name: c.name, age: c.age }))
          .orderBy((c) => c.age)
          .orderBy((c) => c.name)
          .resultAsync();

        expect(rows.length).toBe(4);
        expect(Number(rows[0].age)).toBe(25);
        expect(rows[0].name).toBe("김철수");
        expect(Number(rows[1].age)).toBe(25);
        expect(rows[1].name).toBe("박영수");
      });
    });

    it("ORDER BY with LIMIT/TOP", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .select((c) => ({ name: c.name, age: c.age }))
          .orderBy((c) => c.age, true)
          .top(2)
          .resultAsync();

        expect(rows.length).toBe(2);
        expect(rows[0].name).toBe("홍길동");
        expect(rows[1].name).toBe("이영희");
      });
    });

    it("ORDER BY with OFFSET", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .select((c) => ({ name: c.name, age: c.age }))
          .orderBy((c) => c.age)
          .limit(1, 2)
          .resultAsync();

        expect(rows.length).toBe(2);
        expect(rows[0].name).toBe("이영희");
        expect(rows[1].name).toBe("홍길동");
      });
    });

    it("ORDER BY NULL 처리", async () => {
      await db.connectAsync(async () => {
        await setupTestData();
        await db.testUser.insertAsync([{ name: "박영수", email: "park@test.com" }]);

        const rows = await db.testUser
          .select((c) => ({ name: c.name, age: c.age }))
          .orderBy((c) => c.age)
          .resultAsync();

        expect(rows.length).toBe(4);
        const nullRow = rows.find((r) => r.age == null);
        expect(nullRow).toBeDefined();
        expect(nullRow!.name).toBe("박영수");
      });
    });

    it("ORDER BY 표현식 정렬 (ifNull)", async () => {
      await db.connectAsync(async () => {
        await setupTestData();
        await db.testUser.insertAsync([{ name: "박영수", email: "park@test.com" }]); // age가 NULL

        const rows = await db.testUser
          .select((c) => ({ name: c.name, age: c.age }))
          .orderBy((c) => db.qh.ifNull(c.age, 0), true) // NULL은 0으로 처리, DESC
          .resultAsync();

        expect(rows.length).toBe(4);
        // DESC 정렬이므로 NULL(0으로 처리)이 마지막
        expect(rows[rows.length - 1].name).toBe("박영수");
      });
    });

    it("clearOrderBy 후 새로운 orderBy", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .select((c) => ({ name: c.name, age: c.age }))
          .orderBy((c) => c.name) // 이름순
          .orderBy((c) => c.age, true) // 나이 역순 추가
          .clearOrderBy() // 기존 정렬 제거
          .orderBy((c) => c.age) // 나이순만 적용
          .resultAsync();

        expect(rows.length).toBe(3);
        // 나이순 정렬 확인 (25, 28, 30)
        expect(Number(rows[0].age)).toBe(25);
        expect(Number(rows[1].age)).toBe(28);
        expect(Number(rows[2].age)).toBe(30);
      });
    });
  });
});