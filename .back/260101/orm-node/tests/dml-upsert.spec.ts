import { describe, it, expect, beforeAll } from "vitest";
import { TDialect } from "@simplysm/orm-common";
import { NodeDbContextExecutor } from "../src";
import { DIALECTS, getConfig, TestDbContext } from "./_setup";

describe("DML UPSERT Integration Tests", () => {
  describe.each(DIALECTS)("[%s]", (dialect: TDialect) => {
    let db: TestDbContext;

    async function setupTestData() {
      await db.testUser.truncateAsync();
      await db.testUser.insertAsync([
        { name: "홍길동", email: "hong@test.com", age: 30, isActive: true },
        { name: "김철수", email: "kim@test.com", age: 25, isActive: true },
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

    it("upsert - 기존 레코드 UPDATE", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const users = await db.testUser
          .where((c) => db.qh.eq(c.name, "홍길동"))
          .select((c) => ({ id: c.id }))
          .resultAsync();
        const hongId = users[0].id;

        // 기존 레코드 UPDATE
        await db.testUser
          .where((c) => db.qh.eq(c.id, hongId))
          .upsertAsync(() => ({
            name: "홍길동수정",
            email: "hong_updated@test.com",
          }));

        const result = await db.testUser
          .where((c) => db.qh.eq(c.id, hongId))
          .select((c) => ({ name: c.name, email: c.email }))
          .resultAsync();

        expect(result.length).toBe(1);
        expect(result[0].name).toBe("홍길동수정");
        expect(result[0].email).toBe("hong_updated@test.com");
      });
    });

    it("upsert - 새 레코드 INSERT", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const beforeCount = await db.testUser.select(() => ({ cnt: db.qh.count() })).resultAsync();
        expect(Number(beforeCount[0].cnt)).toBe(2);

        // 존재하지 않는 조건으로 UPSERT (INSERT 발생)
        await db.testUser
          .where((c) => db.qh.eq(c.email, "new@test.com"))
          .upsertAsync(() => ({
            name: "신규유저",
            email: "new@test.com",
            age: 20,
          }));

        const afterCount = await db.testUser.select(() => ({ cnt: db.qh.count() })).resultAsync();
        expect(Number(afterCount[0].cnt)).toBe(3);

        const newUser = await db.testUser
          .where((c) => db.qh.eq(c.email, "new@test.com"))
          .select((c) => ({ name: c.name, age: c.age }))
          .resultAsync();

        expect(newUser.length).toBe(1);
        expect(newUser[0].name).toBe("신규유저");
        expect(Number(newUser[0].age)).toBe(20);
      });
    });

    it("upsert - update/insert 레코드 분리", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const users = await db.testUser
          .where((c) => db.qh.eq(c.name, "김철수"))
          .select((c) => ({ id: c.id }))
          .resultAsync();
        const kimId = users[0].id;

        // 기존 레코드는 이름만 변경, 새 레코드는 전체 정보 설정
        await db.testUser
          .where((c) => db.qh.eq(c.id, kimId))
          .upsertAsync(
            () => ({ name: "김철수수정" }),
            () => ({ name: "신규", email: "new@test.com", age: 18 }),
          );

        const result = await db.testUser
          .where((c) => db.qh.eq(c.id, kimId))
          .select((c) => ({ name: c.name, email: c.email }))
          .resultAsync();

        expect(result[0].name).toBe("김철수수정");
        expect(result[0].email).toBe("kim@test.com"); // 기존 email 유지
      });
    });

    it("upsert - INSERT만 (빈 updateRecord)", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        // 존재하지 않는 조건으로 UPSERT, updateRecord는 빈 객체
        await db.testUser
          .where((c) => db.qh.eq(c.email, "insertonly@test.com"))
          .upsertAsync(
            () => ({}),
            () => ({ name: "INSERT전용", email: "insertonly@test.com", age: 33 }),
          );

        const result = await db.testUser
          .where((c) => db.qh.eq(c.email, "insertonly@test.com"))
          .select((c) => ({ name: c.name, age: c.age }))
          .resultAsync();

        expect(result.length).toBe(1);
        expect(result[0].name).toBe("INSERT전용");
        expect(Number(result[0].age)).toBe(33);
      });
    });

    it("upsert - 복합 조건", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        // 복합 조건으로 UPSERT
        await db.testUser
          .where((c) => [db.qh.eq(c.name, "홍길동"), db.qh.eq(c.email, "hong@test.com")])
          .upsertAsync(() => ({
            age: 35,
            isActive: false,
          }));

        const result = await db.testUser
          .where((c) => db.qh.eq(c.name, "홍길동"))
          .select((c) => ({ age: c.age, isActive: c.isActive }))
          .resultAsync();

        expect(result.length).toBe(1);
        expect(Number(result[0].age)).toBe(35);
        expect(result[0].isActive).toBe(false);
      });
    });
  });
});
