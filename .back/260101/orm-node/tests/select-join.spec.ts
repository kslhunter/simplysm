import { describe, it, expect, beforeAll } from "vitest";
import { TDialect } from "@simplysm/orm-common";
import { NodeDbContextExecutor } from "../src";
import { DIALECTS, getConfig, TestDbContext } from "./_setup";
import { TestCompany } from "./models/TestCompany";
import { TestOrder } from "./models/TestOrder";
import { TestUser } from "./models/TestUser";

describe("SELECT JOIN Integration Tests", () => {
  describe.each(DIALECTS)("[%s]", (dialect: TDialect) => {
    let db: TestDbContext;

    async function setupTestData() {
      await db.testOrder.truncateAsync();
      await db.testUser.truncateAsync();
      await db.testCompany.truncateAsync();

      // 회사 데이터 추가
      await db.testCompany.insertAsync([
        { name: "A회사", address: "서울시 강남구" },
        { name: "B회사", address: "서울시 서초구" },
      ]);

      const companies = await db.testCompany
        .select((c) => ({ id: c.id, name: c.name }))
        .resultAsync();

      const companyAId = companies.find((c) => c.name === "A회사")?.id;
      const companyBId = companies.find((c) => c.name === "B회사")?.id;

      // 사용자 데이터 추가 (회사 소속 포함)
      await db.testUser.insertAsync([
        { name: "홍길동", email: "hong@test.com", age: 30, companyId: companyAId },
        { name: "김철수", email: "kim@test.com", age: 25, companyId: companyAId },
        { name: "이영희", email: "lee@test.com", age: 28, companyId: companyBId },
      ]);

      const users = await db.testUser
        .select((c) => ({ id: c.id, name: c.name }))
        .resultAsync();

      const hongId = users.find((u) => u.name === "홍길동")?.id;
      const kimId = users.find((u) => u.name === "김철수")?.id;

      await db.testOrder.insertAsync([
        { userId: hongId!, productName: "노트북", amount: 1 },
        { userId: hongId!, productName: "마우스", amount: 2 },
        { userId: kimId!, productName: "키보드", amount: 1 },
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

    it("join (1:N) - User -> Orders", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .join(TestOrder, "orders", (joinQr, parent) =>
            joinQr.where((c) => [db.qh.eq(c.userId, parent.id)]),
          )
          .resultAsync();

        expect(rows.length).toBe(3);

        const hong = rows.find((r) => r.name === "홍길동");
        expect(hong).toBeDefined();
        expect(hong!.orders.length).toBe(2);

        const kim = rows.find((r) => r.name === "김철수");
        expect(kim).toBeDefined();
        expect(kim!.orders.length).toBe(1);

        const lee = rows.find((r) => r.name === "이영희");
        expect(lee).toBeDefined();
        expect(lee!.orders.length).toBe(0);
      });
    });

    it("joinSingle (N:1) - Order -> User", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testOrder
          .joinSingle(TestUser, "user", (joinQr, parent) =>
            joinQr.where((c) => [db.qh.eq(c.id, parent.userId)]),
          )
          .select((c) => ({
            productName: c.productName,
            userName: c.user!.name,
          }))
          .resultAsync();

        expect(rows.length).toBe(3);

        const notebook = rows.find((r) => r.productName === "노트북");
        expect(notebook).toBeDefined();
        expect(notebook!.userName).toBe("홍길동");

        const keyboard = rows.find((r) => r.productName === "키보드");
        expect(keyboard).toBeDefined();
        expect(keyboard!.userName).toBe("김철수");
      });
    });

    it("join with where 조건 (ON 절에 추가)", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .join(TestOrder, "orders", (joinQr, parent) =>
            joinQr.where((c) => [db.qh.eq(c.userId, parent.id), db.qh.gt(c.amount, 1)]),
          )
          .resultAsync();

        expect(rows.length).toBe(3);

        const hong = rows.find((r) => r.name === "홍길동");
        expect(hong).toBeDefined();
        expect(hong!.orders.length).toBe(1);
        expect(hong!.orders[0].productName).toBe("마우스");

        const kim = rows.find((r) => r.name === "김철수");
        expect(kim).toBeDefined();
        expect(kim!.orders.length).toBe(0);

        const lee = rows.find((r) => r.name === "이영희");
        expect(lee).toBeDefined();
        expect(lee!.orders.length).toBe(0);
      });
    });

    it("메인 쿼리에 where + join", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        await db.testUser
          .where((c) => db.qh.eq(c.name, "홍길동"))
          .updateAsync(() => ({ isActive: false }));

        const rows = await db.testUser
          .where((c) => [db.qh.eq(c.isActive, true)])
          .join(TestOrder, "orders", (joinQr, parent) =>
            joinQr.where((c) => [db.qh.eq(c.userId, parent.id)]),
          )
          .resultAsync();

        expect(rows.length).toBe(2);
        const names = rows.map((r) => r.name);
        expect(names).toContain("김철수");
        expect(names).toContain("이영희");
        expect(names).not.toContain("홍길동");
      });
    });

    it("join 후 select로 컬럼 선택", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        const rows = await db.testUser
          .join(TestOrder, "orders", (joinQr, parent) =>
            joinQr.where((c) => [db.qh.eq(c.userId, parent.id)]),
          )
          .select((c) => ({
            userId: c.id,
            userName: c.name,
            orderProduct: c.orders[0].productName,
          }))
          .resultAsync();

        expect(rows.length).toBe(4);

        const hong = rows.find((r) => r.userName === "홍길동");
        expect(hong).toBeDefined();
        expect(hong!.userId).toBeDefined();
      });
    });

    // ============================================
    // 이중 JOIN 테스트
    // ============================================

    it("이중 join (병렬) - User -> (Company, Orders)", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        // User에서 Company와 Orders를 동시에 join
        const rows = await db.testUser
          .joinSingle(TestCompany, "company", (joinQr, parent) =>
            joinQr.where((c) => [db.qh.eq(c.id, parent.companyId)]),
          )
          .join(TestOrder, "orders", (joinQr, parent) =>
            joinQr.where((c) => [db.qh.eq(c.userId, parent.id)]),
          )
          .resultAsync();

        expect(rows.length).toBe(3);

        // 홍길동: A회사, 주문 2개
        const hong = rows.find((r) => r.name === "홍길동");
        expect(hong).toBeDefined();
        expect(hong!.company?.name).toBe("A회사");
        expect(hong!.orders.length).toBe(2);

        // 김철수: A회사, 주문 1개
        const kim = rows.find((r) => r.name === "김철수");
        expect(kim).toBeDefined();
        expect(kim!.company?.name).toBe("A회사");
        expect(kim!.orders.length).toBe(1);

        // 이영희: B회사, 주문 0개
        const lee = rows.find((r) => r.name === "이영희");
        expect(lee).toBeDefined();
        expect(lee!.company?.name).toBe("B회사");
        expect(lee!.orders.length).toBe(0);
      });
    });

    it("이중 join (체인) - Company -> Users", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        // Company에서 Users를 join
        const rows = await db.testCompany
          .join(TestUser, "users", (joinQr, parent) =>
            joinQr.where((c) => [db.qh.eq(c.companyId, parent.id)]),
          )
          .resultAsync();

        expect(rows.length).toBe(2);

        // A회사: 직원 2명 (홍길동, 김철수)
        const companyA = rows.find((r) => r.name === "A회사");
        expect(companyA).toBeDefined();
        expect(companyA!.users.length).toBe(2);
        const userNames = companyA!.users.map((u) => u.name);
        expect(userNames).toContain("홍길동");
        expect(userNames).toContain("김철수");

        // B회사: 직원 1명 (이영희)
        const companyB = rows.find((r) => r.name === "B회사");
        expect(companyB).toBeDefined();
        expect(companyB!.users.length).toBe(1);
        expect(companyB!.users[0].name).toBe("이영희");
      });
    });

    it("이중 join + select - 회사별 주문 정보", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        // User -> (Company, Orders) 에서 특정 컬럼만 선택
        const rows = await db.testUser
          .joinSingle(TestCompany, "company", (joinQr, parent) =>
            joinQr.where((c) => [db.qh.eq(c.id, parent.companyId)]),
          )
          .join(TestOrder, "orders", (joinQr, parent) =>
            joinQr.where((c) => [db.qh.eq(c.userId, parent.id)]),
          )
          .select((c) => ({
            userName: c.name,
            companyName: c.company!.name,
            orderProduct: c.orders[0].productName,
          }))
          .resultAsync();

        // 홍길동 2개, 김철수 1개, 이영희 0개 -> 4개 row (join된 결과)
        expect(rows.length).toBe(4);

        const hongOrders = rows.filter((r) => r.userName === "홍길동");
        expect(hongOrders.length).toBe(2);
        expect(hongOrders[0].companyName).toBe("A회사");
      });
    });

    // ============================================
    // 중첩 JOIN 테스트 (join 안에서 join)
    // ============================================

    it("중첩 join - Company -> Users -> Orders", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        // Company에서 Users를 join하고, Users 안에서 Orders를 다시 join
        const rows = await db.testCompany
          .join(TestUser, "users", (userQr, companyParent) =>
            userQr
              .where((c) => [db.qh.eq(c.companyId, companyParent.id)])
              .join(TestOrder, "orders", (orderQr, userParent) =>
                orderQr.where((c) => [db.qh.eq(c.userId, userParent.id)]),
              ),
          )
          .resultAsync();

        expect(rows.length).toBe(2);

        // A회사: 직원 2명 (홍길동, 김철수), 각자 주문 있음
        const companyA = rows.find((r) => r.name === "A회사");
        expect(companyA).toBeDefined();
        expect(companyA!.users.length).toBe(2);

        const hong = companyA!.users.find((u) => u.name === "홍길동");
        expect(hong).toBeDefined();
        expect(hong!.orders.length).toBe(2);

        const kim = companyA!.users.find((u) => u.name === "김철수");
        expect(kim).toBeDefined();
        expect(kim!.orders.length).toBe(1);

        // B회사: 직원 1명 (이영희), 주문 없음
        const companyB = rows.find((r) => r.name === "B회사");
        expect(companyB).toBeDefined();
        expect(companyB!.users.length).toBe(1);
        expect(companyB!.users[0].name).toBe("이영희");
        expect(companyB!.users[0].orders.length).toBe(0);
      });
    });

    it("중첩 joinSingle - Order -> User -> Company", async () => {
      await db.connectAsync(async () => {
        await setupTestData();

        // Order에서 User를 joinSingle하고, User 안에서 Company를 다시 joinSingle
        const rows = await db.testOrder
          .joinSingle(TestUser, "user", (userQr, orderParent) =>
            userQr
              .where((c) => [db.qh.eq(c.id, orderParent.userId)])
              .joinSingle(TestCompany, "company", (companyQr, userParent) =>
                companyQr.where((c) => [db.qh.eq(c.id, userParent.companyId)]),
              ),
          )
          .resultAsync();

        expect(rows.length).toBe(3);

        // 노트북 주문 -> 홍길동 -> A회사
        const notebook = rows.find((r) => r.productName === "노트북");
        expect(notebook).toBeDefined();
        expect(notebook!.user?.name).toBe("홍길동");
        expect(notebook!.user?.company?.name).toBe("A회사");

        // 키보드 주문 -> 김철수 -> A회사
        const keyboard = rows.find((r) => r.productName === "키보드");
        expect(keyboard).toBeDefined();
        expect(keyboard!.user?.name).toBe("김철수");
        expect(keyboard!.user?.company?.name).toBe("A회사");
      });
    });
  });
});