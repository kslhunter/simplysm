/**
 * SELECT PIVOT/UNPIVOT Integration Tests
 * - orm-common의 SQL 생성 테스트와 동일한 케이스를 실제 DB에서 검증
 */
import { beforeAll, describe, expect, it } from "vitest";
import { TDialect } from "@simplysm/orm-common";
import { NodeDbContextExecutor } from "../src";
import { DIALECTS, getConfig, TestDbContext } from "./_setup";

describe("SELECT PIVOT/UNPIVOT Integration Tests", () => {
  describe.each(DIALECTS)("[%s]", (dialect: TDialect) => {
    let db: TestDbContext;

    async function setupSalesData() {
      await db.testSales.truncateAsync();
      await db.testSales.insertAsync([
        { category: "전자제품", month: "Jan", amount: 1000 },
        { category: "전자제품", month: "Feb", amount: 1500 },
        { category: "전자제품", month: "Mar", amount: 1200 },
        { category: "의류", month: "Jan", amount: 800 },
        { category: "의류", month: "Feb", amount: 900 },
        { category: "의류", month: "Mar", amount: 1100 },
        { category: "식품", month: "Jan", amount: 500 },
        { category: "식품", month: "Feb", amount: 600 },
        { category: "식품", month: "Mar", amount: 700 },
      ]);
    }

    async function setupMonthlySalesData() {
      await db.testMonthlySales.truncateAsync();
      await db.testMonthlySales.insertAsync([
        { category: "전자제품", jan: 1000, feb: 1500, mar: 1200 },
        { category: "의류", jan: 800, feb: 900, mar: 1100 },
        { category: "식품", jan: 500, feb: 600, mar: 700 },
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

    // ============================================
    // PIVOT - 행을 열로 변환
    // ============================================
    describe("pivot", () => {
      it("PIVOT - 월별 금액 합계", async () => {
        await db.connectAsync(async () => {
          await setupSalesData();

          // Sales 테이블: category, month, amount
          // → category별로 Jan, Feb, Mar 컬럼으로 금액 합계
          const rows = await db.testSales
            .pivot({
              value: (c) => c.amount,
              agg: (v) => db.qh.sum(v),
              for: (c) => c.month,
              in: ["Jan", "Feb", "Mar"] as const,
            })
            .resultAsync();

          // PIVOT 후 id도 포함되어 각 행별로 그룹화됨 (9개 행)
          expect(rows.length).toBe(9);
        });
      });

      it("PIVOT - 기본값 지정", async () => {
        await db.connectAsync(async () => {
          await db.testSales.truncateAsync();
          // 일부 월 데이터 누락
          await db.testSales.insertAsync([
            { category: "전자제품", month: "Jan", amount: 1000 },
            { category: "전자제품", month: "Mar", amount: 1200 },
            // Feb 데이터 없음
          ]);

          const rows = await db.testSales
            .pivot({
              value: (c) => c.amount,
              agg: (v) => db.qh.sum(v),
              for: (c) => c.month,
              in: ["Jan", "Feb", "Mar"] as const,
              default: 0,
            })
            .resultAsync();

          // id별로 그룹화되어 2개 행
          expect(rows.length).toBe(2);
          // 각 행의 해당 월에만 값이 있고, 나머지는 기본값 0
          const janRow = rows.find((r) => Number(r.Jan) === 1000);
          expect(janRow).toBeDefined();
          expect(Number(janRow!.Feb)).toBe(0);
          expect(Number(janRow!.Mar)).toBe(0);
        });
      });

      it("PIVOT - select로 category만 (id 제외)", async () => {
        await db.connectAsync(async () => {
          await setupSalesData();

          const rows = await db.testSales
            .select((c) => ({
              category: c.category,
              month: c.month,
              amount: c.amount,
            }))
            .pivot({
              value: (c) => c.amount,
              agg: (v) => db.qh.sum(v),
              for: (c) => c.month,
              in: ["Jan", "Feb", "Mar"] as const,
            })
            .resultAsync();

          // category별로 그룹화되어 3개 행
          expect(rows.length).toBe(3);

          const electronics = rows.find((r) => r.category === "전자제품");
          expect(electronics).toBeDefined();
          expect(Number(electronics!.Jan)).toBe(1000);
          expect(Number(electronics!.Feb)).toBe(1500);
          expect(Number(electronics!.Mar)).toBe(1200);

          const clothing = rows.find((r) => r.category === "의류");
          expect(clothing).toBeDefined();
          expect(Number(clothing!.Jan)).toBe(800);
          expect(Number(clothing!.Feb)).toBe(900);
          expect(Number(clothing!.Mar)).toBe(1100);
        });
      });
    });

    // ============================================
    // UNPIVOT - 열을 행으로 변환
    // ============================================
    describe("unpivot", () => {
      it("UNPIVOT - 월별 컬럼을 행으로", async () => {
        await db.connectAsync(async () => {
          await setupMonthlySalesData();

          // MonthlySales 테이블: category, jan, feb, mar
          // → category, month, amount 형태로 변환
          const rows = await db.testMonthlySales
            .unpivot({
              columns: ["jan", "feb", "mar"],
              valueAs: "amount",
              keyAs: "month",
            })
            .resultAsync();

          // 3개 카테고리 * 3개 월 = 9개 행
          expect(rows.length).toBe(9);

          // 전자제품의 jan 데이터 확인
          const electronicsJan = rows.find((r) => r.category === "전자제품" && r.month === "jan");
          expect(electronicsJan).toBeDefined();
          expect(Number(electronicsJan!.amount)).toBe(1000);
        });
      });

      it("UNPIVOT - WHERE 필터링", async () => {
        await db.connectAsync(async () => {
          await setupMonthlySalesData();

          const rows = await db.testMonthlySales
            .unpivot({
              columns: ["jan", "feb", "mar"],
              valueAs: "amount",
              keyAs: "month",
            })
            .where((c) => db.qh.gt(c.amount, 800))
            .resultAsync();

          // 800 초과: 전자제품 전부(1000,1500,1200), 의류 feb/mar(900,1100)
          expect(rows.length).toBe(5);
          rows.forEach((row) => {
            expect(Number(row.amount)).toBeGreaterThan(800);
          });
        });
      });
    });
  });
});
