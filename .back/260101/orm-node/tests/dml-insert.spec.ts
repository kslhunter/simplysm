import { describe, it, expect, beforeAll } from "vitest";
import { TDialect } from "@simplysm/orm-common";
import { NodeDbContextExecutor } from "../src";
import { DIALECTS, getConfig, TestDbContext } from "./_setup";
import { TestUserBackup } from "./models/TestUserBackup";

describe("DML INSERT Integration Tests", () => {
  describe.each(DIALECTS)("[%s]", (dialect: TDialect) => {
    let db: TestDbContext;

    async function setupTestData() {
      await db.testUser.truncateAsync();
    }

    beforeAll(async () => {
      const config = getConfig(dialect);
      const executor = new NodeDbContextExecutor(config);
      db = new TestDbContext(executor, { dialect, database: config.database });

      await db.connectWithoutTransactionAsync(async () => {
        await db.initializeAsync({ force: true });
      });
    });

    it("단일 레코드 INSERT", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        await db.testUser.insertAsync([{ name: "홍길동" }]);

        const rows = await db.testUser
          .select(() => ({
            cnt: db.qh.count(),
          }))
          .resultAsync();

        expect(Number(rows[0].cnt)).toBe(1);
      });
    });

    it("다중 레코드 INSERT", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        await db.testUser.insertAsync([
          { name: "홍길동" },
          { name: "김철수" },
          { name: "이영희" },
        ]);

        const rows = await db.testUser
          .select(() => ({
            cnt: db.qh.count(),
          }))
          .resultAsync();

        expect(Number(rows[0].cnt)).toBe(3);
      });
    });

    it("NULL 값 포함 INSERT", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        await db.testUser.insertAsync([
          {
            name: "홍길동",
            email: db.qh.val(undefined),
            age: db.qh.val(undefined),
          },
        ]);

        const rows = await db.testUser
          .select((c) => ({
            name: c.name,
            email: c.email,
            age: c.age,
          }))
          .resultAsync();

        expect(rows[0].name).toBe("홍길동");
        expect(rows[0].email).toBeUndefined();
        expect(rows[0].age).toBeUndefined();
      });
    });

    it("모든 컬럼 값 INSERT", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        await db.testUser.insertAsync([
          {
            name: "홍길동",
            email: "hong@test.com",
            age: 30,
            isActive: true,
          },
        ]);

        const rows = await db.testUser
          .select((c) => ({
            name: c.name,
            email: c.email,
            age: c.age,
            isActive: c.isActive,
          }))
          .resultAsync();

        expect(rows[0].name).toBe("홍길동");
        expect(rows[0].email).toBe("hong@test.com");
        expect(Number(rows[0].age)).toBe(30);
      });
    });

    it("INSERT with OUTPUT (단일)", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const result = await db.testUser.insertAsync(
          [{ name: "홍길동", email: "hong@test.com" }],
          ["id"],
        );

        expect(result).toBeDefined();
        expect(result.length).toBe(1);
        expect(result[0].id).toBeDefined();
        expect(Number(result[0].id)).toBeGreaterThan(0);
      });
    });

    it("INSERT with OUTPUT (배치)", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const result = await db.testUser.insertAsync(
          [
            { name: "홍길동", email: "hong@test.com" },
            { name: "김철수", email: "kim@test.com" },
            { name: "이영희", email: "lee@test.com" },
          ],
          ["id", "name"],
        );

        expect(result).toBeDefined();
        expect(result.length).toBe(3);
        result.forEach((r) => {
          expect(r.id).toBeDefined();
          expect(r.name).toBeDefined();
        });
      });
    });

    it("INSERT INTO SELECT", async () => {
      await db.connectAsync(async () => {
        await setupTestData();
        await db.testUserBackup.truncateAsync();

        // 원본 데이터 추가
        await db.testUser.insertAsync([
          { name: "홍길동", email: "hong@test.com", isActive: true },
          { name: "김철수", email: "kim@test.com", isActive: false },
          { name: "이영희", email: "lee@test.com", isActive: true },
        ]);

        // isActive=true인 레코드만 백업 테이블로 복사
        await db.testUser
          .where((c) => db.qh.eq(c.isActive, true))
          .select((c) => ({
            name: c.name,
            email: c.email,
          }))
          .insertIntoAsync(TestUserBackup);

        const backupRows = await db.testUserBackup
          .select((c) => ({ name: c.name, email: c.email }))
          .resultAsync();

        expect(backupRows.length).toBe(2); // 홍길동, 이영희
        const names = backupRows.map((r) => r.name);
        expect(names).toContain("홍길동");
        expect(names).toContain("이영희");
        expect(names).not.toContain("김철수");
      });
    });

    it("빈 records 배열 INSERT", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        // 빈 배열 INSERT는 에러 없이 완료되어야 함
        await db.testUser.insertAsync([]);

        const rows = await db.testUser
          .select(() => ({ cnt: db.qh.count() }))
          .resultAsync();

        expect(Number(rows[0].cnt)).toBe(0);
      });
    });
  });
});