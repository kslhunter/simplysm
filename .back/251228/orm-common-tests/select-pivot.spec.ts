/**
 * SELECT PIVOT/UNPIVOT 테스트
 * - Queryable.pivot() → QueryBuilder.select() 통합 테스트
 * - Queryable.unpivot() → QueryBuilder.select() 통합 테스트
 */
import { describe, expect, it } from "vitest";
import { TDialect } from "../src/types/column-primitive";
import { DIALECTS, TestDbContext } from "./_setup";
import * as expected from "./expected/select-pivot.expected";

describe("SELECT PIVOT/UNPIVOT", () => {
  // ============================================
  // PIVOT - 행을 열로 변환
  // ============================================
  describe("pivot", () => {
    it.each(DIALECTS)("[%s] PIVOT - 월별 금액 합계", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      // Sales 테이블: category, month, amount
      // → category별로 Jan, Feb, Mar 컬럼으로 금액 합계
      const qr = db.sales.pivot({
        value: (c) => c.amount,
        agg: (v) => db.qh.sum(v),
        for: (c) => c.month,
        in: ["Jan", "Feb", "Mar"] as const,
      });

      const def = qr.getSelectQueryDef();
      const sql = db.qb.select(def);

      expect(sql).toMatchSql(expected.pivotBasic[dialect]);
    });

    it.each(DIALECTS)("[%s] PIVOT - 기본값 지정", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const qr = db.sales.pivot({
        value: (c) => c.amount,
        agg: (v) => db.qh.sum(v),
        for: (c) => c.month,
        in: ["Jan", "Feb", "Mar"] as const,
        default: 0,
      });

      const def = qr.getSelectQueryDef();
      const sql = db.qb.select(def);

      expect(sql).toMatchSql(expected.pivotWithDefault[dialect]);
    });

    it.each(DIALECTS)("[%s] PIVOT - select로 category만 (id 제외)", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const qr = db.sales
        .select((c) => ({
          category: c.category,
          month: db.qh.concat(c.month, "__"),
          amount: c.amount,
        }))
        .pivot({
          value: (c) => c.amount,
          agg: (v) => db.qh.sum(v),
          for: (c) => c.month,
          in: ["Jan__", "Feb__", "Mar__"] as const,
        });

      const def = qr.getSelectQueryDef();
      const sql = db.qb.select(def);

      expect(sql).toMatchSql(expected.pivotWithSelect[dialect]);
    });
  });

  // ============================================
  // UNPIVOT - 열을 행으로 변환
  // ============================================
  describe("unpivot", () => {
    it.each(DIALECTS)("[%s] UNPIVOT - 월별 컬럼을 행으로", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      // MonthlySales 테이블: category, jan, feb, mar
      // → category, month, amount 형태로 변환
      const qr = db.monthlySales.unpivot({
        columns: ["jan", "feb", "mar"],
        valueAs: "amount",
        keyAs: "month",
      });

      const def = qr.getSelectQueryDef();
      const sql = db.qb.select(def);

      expect(sql).toMatchSql(expected.unpivotBasic[dialect]);
    });

    it.each(DIALECTS)("[%s] UNPIVOT - WHERE 필터링", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);

      const qr = db.monthlySales
        .unpivot({
          columns: ["jan", "feb", "mar"],
          valueAs: "amount",
          keyAs: "month",
        })
        .where((c) => db.qh.gt(c.amount, 800));

      const def = qr.getSelectQueryDef();
      const sql = db.qb.select(def);

      expect(sql).toMatchSql(expected.unpivotWithWhere[dialect]);
    });
  });
});
