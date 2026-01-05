import { describe, it, expect, beforeAll } from "vitest";
import { TDialect } from "@simplysm/orm-common";
import { NodeDbContextExecutor } from "../src";
import { DIALECTS, getConfig, TestDbContext } from "./_setup";

describe("DDL Integration Tests", () => {
  describe.each(DIALECTS)("[%s]", (dialect: TDialect) => {
    let db: TestDbContext;

    beforeAll(async () => {
      const config = getConfig(dialect);
      const executor = new NodeDbContextExecutor(config);
      db = new TestDbContext(executor, { dialect, database: config.database });

      await db.connectWithoutTransactionAsync(async () => {
        await db.initializeAsync({ force: true });
      });
    });

    it("initializeAsync - 테이블 생성 확인", async () => {
      await db.connectWithoutTransactionAsync(async () => {
        // TestUser 테이블이 존재하는지 확인
        const rows = await db.testUser
          .select(() => ({ cnt: db.qh.count() }))
          .resultAsync();

        expect(rows).toBeDefined();
        expect(rows.length).toBe(1);
      });
    });

    it("initializeAsync - 여러 테이블 생성 확인", async () => {
      await db.connectWithoutTransactionAsync(async () => {
        // 모든 테이블이 존재하는지 확인
        const userCount = await db.testUser.select(() => ({ cnt: db.qh.count() })).resultAsync();
        const companyCount = await db.testCompany.select(() => ({ cnt: db.qh.count() })).resultAsync();
        const orderCount = await db.testOrder.select(() => ({ cnt: db.qh.count() })).resultAsync();

        expect(userCount).toBeDefined();
        expect(companyCount).toBeDefined();
        expect(orderCount).toBeDefined();
      });
    });

    it("initializeAsync - 컬럼 타입 확인 (INSERT/SELECT)", async () => {
      await db.connectAsync(async () => {
        await db.testUser.truncateAsync();

        // 다양한 타입의 데이터 INSERT
        await db.testUser.insertAsync([
          {
            name: "테스트유저",
            email: "test@example.com",
            age: 25,
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

        expect(rows.length).toBe(1);
        expect(rows[0].name).toBe("테스트유저");
        expect(rows[0].email).toBe("test@example.com");
        expect(Number(rows[0].age)).toBe(25);
      });
    });

    it("initializeAsync - NULL 컬럼 처리", async () => {
      await db.connectAsync(async () => {
        await db.testUser.truncateAsync();

        // nullable 컬럼에 NULL 값 INSERT
        await db.testUser.insertAsync([
          {
            name: "NULL테스트",
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

        expect(rows.length).toBe(1);
        expect(rows[0].name).toBe("NULL테스트");
        expect(rows[0].email).toBeUndefined();
        expect(rows[0].age).toBeUndefined();
      });
    });

    it("initializeAsync - AUTO_INCREMENT 컬럼 확인", async () => {
      await db.connectAsync(async () => {
        await db.testUser.truncateAsync();

        // AUTO_INCREMENT 컬럼 테스트
        await db.testUser.insertAsync([{ name: "유저1" }, { name: "유저2" }, { name: "유저3" }]);

        const rows = await db.testUser
          .select((c) => ({ id: c.id, name: c.name }))
          .orderBy((c) => c.id)
          .resultAsync();

        expect(rows.length).toBe(3);
        // id가 순차적으로 증가하는지 확인
        expect(Number(rows[1].id)).toBeGreaterThan(Number(rows[0].id));
        expect(Number(rows[2].id)).toBeGreaterThan(Number(rows[1].id));
      });
    });

    it("initializeAsync - DEFAULT 값 확인", async () => {
      await db.connectAsync(async () => {
        await db.testUser.truncateAsync();

        // isActive 컬럼에 기본값이 적용되는지 확인
        await db.testUser.insertAsync([{ name: "기본값테스트" }]);

        const rows = await db.testUser
          .select((c) => ({ name: c.name, isActive: c.isActive }))
          .resultAsync();

        expect(rows.length).toBe(1);
        expect(rows[0].isActive).toBe(true);
      });
    });

    it("initializeAsync - force:true 시 테이블 재생성", async () => {
      await db.connectWithoutTransactionAsync(async () => {
        // 데이터 추가
        await db.testUser.truncateAsync();
        await db.testUser.insertAsync([{ name: "재생성테스트" }]);

        const beforeCount = await db.testUser.select(() => ({ cnt: db.qh.count() })).resultAsync();
        expect(Number(beforeCount[0].cnt)).toBe(1);

        // force:true로 재초기화
        await db.initializeAsync({ force: true });

        // 데이터가 초기화되었는지 확인
        const afterCount = await db.testUser.select(() => ({ cnt: db.qh.count() })).resultAsync();
        expect(Number(afterCount[0].cnt)).toBe(0);
      });
    });
  });
});
