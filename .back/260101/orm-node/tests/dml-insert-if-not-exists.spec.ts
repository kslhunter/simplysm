import { describe, it, expect, beforeAll } from "vitest";
import { TDialect } from "@simplysm/orm-common";
import { NodeDbContextExecutor } from "../src";
import { DIALECTS, getConfig, TestDbContext } from "./_setup";

describe("DML INSERT IF NOT EXISTS Integration Tests", () => {
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

    it("insertIfNotExists - 조건 미충족 시 INSERT", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const beforeCount = await db.testUser.select(() => ({ cnt: db.qh.count() })).resultAsync();
        expect(Number(beforeCount[0].cnt)).toBe(2);

        // 존재하지 않는 email로 INSERT
        await db.testUser
          .where((c) => db.qh.eq(c.email, "new@test.com"))
          .insertIfNotExistsAsync(() => ({
            name: "신규유저",
            email: "new@test.com",
            age: 22,
          }));

        const afterCount = await db.testUser.select(() => ({ cnt: db.qh.count() })).resultAsync();
        expect(Number(afterCount[0].cnt)).toBe(3);

        const newUser = await db.testUser
          .where((c) => db.qh.eq(c.email, "new@test.com"))
          .select((c) => ({ name: c.name, age: c.age }))
          .resultAsync();

        expect(newUser.length).toBe(1);
        expect(newUser[0].name).toBe("신규유저");
        expect(Number(newUser[0].age)).toBe(22);
      });
    });

    it("insertIfNotExists - 조건 충족 시 INSERT 안 함", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const beforeCount = await db.testUser.select(() => ({ cnt: db.qh.count() })).resultAsync();
        expect(Number(beforeCount[0].cnt)).toBe(2);

        // 이미 존재하는 email로 INSERT 시도
        await db.testUser
          .where((c) => db.qh.eq(c.email, "hong@test.com"))
          .insertIfNotExistsAsync(() => ({
            name: "중복유저",
            email: "hong@test.com",
            age: 99,
          }));

        const afterCount = await db.testUser.select(() => ({ cnt: db.qh.count() })).resultAsync();
        expect(Number(afterCount[0].cnt)).toBe(2); // 변화 없음

        // 기존 데이터가 그대로인지 확인
        const existingUser = await db.testUser
          .where((c) => db.qh.eq(c.email, "hong@test.com"))
          .select((c) => ({ name: c.name, age: c.age }))
          .resultAsync();

        expect(existingUser[0].name).toBe("홍길동"); // 원래 이름 유지
        expect(Number(existingUser[0].age)).toBe(30); // 원래 나이 유지
      });
    });

    it("insertIfNotExists - 복합 조건", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        // 복합 조건: name과 email 모두 일치해야 EXISTS
        await db.testUser
          .where((c) => [db.qh.eq(c.name, "홍길동"), db.qh.eq(c.email, "different@test.com")])
          .insertIfNotExistsAsync(() => ({
            name: "홍길동",
            email: "different@test.com",
            age: 40,
          }));

        // name은 같지만 email이 다르므로 INSERT됨
        const result = await db.testUser
          .where((c) => db.qh.eq(c.email, "different@test.com"))
          .select((c) => ({ name: c.name, age: c.age }))
          .resultAsync();

        expect(result.length).toBe(1);
        expect(result[0].name).toBe("홍길동");
        expect(Number(result[0].age)).toBe(40);
      });
    });

    it("insertIfNotExists - 연속 호출 (멱등성)", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const insertData = () =>
          db.testUser
            .where((c) => db.qh.eq(c.email, "idempotent@test.com"))
            .insertIfNotExistsAsync(() => ({
              name: "멱등테스트",
              email: "idempotent@test.com",
              age: 28,
            }));

        // 3번 연속 호출
        await insertData();
        await insertData();
        await insertData();

        // 1개만 INSERT되어야 함
        const result = await db.testUser
          .where((c) => db.qh.eq(c.email, "idempotent@test.com"))
          .select(() => ({ cnt: db.qh.count() }))
          .resultAsync();

        expect(Number(result[0].cnt)).toBe(1);
      });
    });

    it("insertIfNotExists - NULL 값 포함", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        await db.testUser
          .where((c) => db.qh.eq(c.email, "nullable@test.com"))
          .insertIfNotExistsAsync(() => ({
            name: "NULL테스트",
            email: "nullable@test.com",
            age: db.qh.val(undefined),
          }));

        const result = await db.testUser
          .where((c) => db.qh.eq(c.email, "nullable@test.com"))
          .select((c) => ({ name: c.name, age: c.age }))
          .resultAsync();

        expect(result.length).toBe(1);
        expect(result[0].name).toBe("NULL테스트");
        expect(result[0].age).toBeUndefined();
      });
    });
  });
});
