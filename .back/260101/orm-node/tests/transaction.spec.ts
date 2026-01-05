import { describe, it, expect, beforeAll } from "vitest";
import { TDialect } from "@simplysm/orm-common";
import { NodeDbContextExecutor } from "../src";
import { DIALECTS, getConfig, TestDbContext } from "./_setup";

describe("Transaction Integration Tests", () => {
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

    it("connectAsync - 성공 시 자동 커밋", async () => {
      // 데이터 초기화
      await db.connectWithoutTransactionAsync(async () => {
        await setupTestData();
      });

      // 트랜잭션으로 INSERT
      await db.connectAsync(async () => {
        await db.testUser.insertAsync([{ name: "박영수", email: "park@test.com", age: 40 }]);
      });

      // 커밋 후 데이터 확인
      const rows = await db.connectWithoutTransactionAsync(async () => {
        return await db.testUser
          .select(() => ({ cnt: db.qh.count() }))
          .resultAsync();
      });

      expect(Number(rows[0].cnt)).toBe(4);
    });

    it("connectAsync - 에러 시 자동 롤백", async () => {
      // 데이터 초기화
      await db.connectWithoutTransactionAsync(async () => {
        await setupTestData();
      });

      // 에러 발생 → 롤백
      await expect(
        db.connectAsync(async () => {
          await db.testUser.insertAsync([{ name: "박영수", email: "park@test.com", age: 40 }]);
          throw new Error("의도적 에러");
        }),
      ).rejects.toThrow("의도적 에러");

      // 롤백 확인 - 데이터 추가 안 됨
      const rows = await db.connectWithoutTransactionAsync(async () => {
        return await db.testUser
          .select(() => ({ cnt: db.qh.count() }))
          .resultAsync();
      });

      expect(Number(rows[0].cnt)).toBe(3);
    });

    it("transAsync - 이미 연결된 상태에서 트랜잭션", async () => {
      // connectWithoutTransactionAsync 안에서 transAsync 사용
      await db.connectWithoutTransactionAsync(async () => {
        await setupTestData();

        expect(db.status).toBe("connect");

        // 트랜잭션 시작
        await db.transAsync(async () => {
          expect(db.status).toBe("transact");
          await db.testUser.insertAsync([{ name: "박영수", email: "park@test.com", age: 40 }]);
        });

        expect(db.status).toBe("connect");

        // 커밋 후 데이터 확인
        const rows = await db.testUser
          .select(() => ({ cnt: db.qh.count() }))
          .resultAsync();

        expect(Number(rows[0].cnt)).toBe(4);
      });
    });

    it("transAsync - 에러 시 롤백", async () => {
      await db.connectWithoutTransactionAsync(async () => {
        await setupTestData();

        const beforeRows = await db.testUser
          .select(() => ({ cnt: db.qh.count() }))
          .resultAsync();
        expect(Number(beforeRows[0].cnt)).toBe(3);

        // 트랜잭션에서 에러 발생
        await expect(
          db.transAsync(async () => {
            await db.testUser.insertAsync([{ name: "박영수", email: "park@test.com", age: 40 }]);
            throw new Error("의도적 에러");
          }),
        ).rejects.toThrow("의도적 에러");

        // 롤백 확인
        const afterRows = await db.testUser
          .select(() => ({ cnt: db.qh.count() }))
          .resultAsync();

        expect(Number(afterRows[0].cnt)).toBe(3);
      });
    });

    it("connectAsync - 다중 작업 후 성공 시 커밋", async () => {
      // 데이터 초기화
      await db.connectWithoutTransactionAsync(async () => {
        await setupTestData();
      });

      // 트랜잭션에서 INSERT, UPDATE, DELETE 수행
      await db.connectAsync(async () => {
        await db.testUser.insertAsync([{ name: "박영수", email: "park@test.com", age: 40 }]);

        await db.testUser
          .where((c) => db.qh.eq(c.name, "홍길동"))
          .updateAsync(() => ({ age: 99 }));

        await db.testUser
          .where((c) => db.qh.eq(c.name, "김철수"))
          .deleteAsync();
      });

      // 결과 확인
      const rows = await db.connectWithoutTransactionAsync(async () => {
        return await db.testUser
          .select((c) => ({
            name: c.name,
            age: c.age,
          }))
          .orderBy((c) => c.name)
          .resultAsync();
      });

      expect(rows.length).toBe(3);

      const hong = rows.find((r) => r.name === "홍길동");
      expect(Number(hong!.age)).toBe(99);

      const kim = rows.find((r) => r.name === "김철수");
      expect(kim).toBeUndefined();

      const park = rows.find((r) => r.name === "박영수");
      expect(park).toBeDefined();
    });

    it("connectAsync - 다중 작업 후 에러 시 전체 롤백", async () => {
      // 데이터 초기화
      await db.connectWithoutTransactionAsync(async () => {
        await setupTestData();
      });

      const beforeRows = await db.connectWithoutTransactionAsync(async () => {
        return await db.testUser
          .select((c) => ({
            name: c.name,
            age: c.age,
          }))
          .resultAsync();
      });
      const beforeHongAge = beforeRows.find((r) => r.name === "홍길동")?.age;

      // 트랜잭션에서 작업 후 에러 발생
      await expect(
        db.connectAsync(async () => {
          await db.testUser.insertAsync([{ name: "박영수", email: "park@test.com", age: 40 }]);

          await db.testUser
            .where((c) => db.qh.eq(c.name, "홍길동"))
            .updateAsync(() => ({ age: 99 }));

          await db.testUser
            .where((c) => db.qh.eq(c.name, "김철수"))
            .deleteAsync();

          throw new Error("의도적 에러");
        }),
      ).rejects.toThrow("의도적 에러");

      // 롤백 확인 - 모든 작업이 원복됨
      const afterRows = await db.connectWithoutTransactionAsync(async () => {
        return await db.testUser
          .select((c) => ({
            name: c.name,
            age: c.age,
          }))
          .resultAsync();
      });

      expect(afterRows.length).toBe(3);

      const hong = afterRows.find((r) => r.name === "홍길동");
      expect(Number(hong!.age)).toBe(Number(beforeHongAge));

      const kim = afterRows.find((r) => r.name === "김철수");
      expect(kim).toBeDefined();

      const park = afterRows.find((r) => r.name === "박영수");
      expect(park).toBeUndefined();
    });

    it("connectAsync - 격리 수준 테스트 (READ_COMMITTED)", async () => {
      // 데이터 초기화
      await db.connectWithoutTransactionAsync(async () => {
        await setupTestData();
      });

      // 격리 수준 지정하여 트랜잭션 실행
      await db.connectAsync(async () => {
        await db.testUser.insertAsync([{ name: "박영수", email: "park@test.com", age: 40 }]);
      }, "READ_COMMITTED");

      // 커밋 후 데이터 확인
      const rows = await db.connectWithoutTransactionAsync(async () => {
        return await db.testUser
          .select(() => ({ cnt: db.qh.count() }))
          .resultAsync();
      });

      expect(Number(rows[0].cnt)).toBe(4);
    });
  });
});