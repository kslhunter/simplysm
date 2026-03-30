import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./conditional.expected";

describe("Expr - 조건 함수", () => {
  describe("coalesce - null replacement", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        nameOrDefault: expr.coalesce(item.name, "Unknown"),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.coalesce[dialect]);
    });
  });

  describe("nullIf - null if value equals", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        checkedAge: expr.nullIf(item.age, 0),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.nullIf[dialect]);
    });
  });

  describe("if - conditional branching", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        status: expr.if(expr.eq(item.isActive, true), "Active", "Inactive"),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.ifCond[dialect]);
    });
  });

  describe("switch - CASE WHEN", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        ageGroup: expr
          .switch()
          .case(expr.lt(item.age, 20), "Teen")
          .case(expr.lt(item.age, 40), "Adult")
          .default("Senior"),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.switchCase[dialect]);
    });
  });

  describe("is - convert condition to boolean", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        isActiveFlag: expr.is(expr.eq(item.isActive, true)),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.isExpr[dialect]);
    });
  });

  describe("greatest - maximum value", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        maxVal: expr.greatest(item.age, 18),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.greatest[dialect]);
    });
  });

  describe("switch - all case/default are undefined", () => {
    it("throws an error", () => {
      const db = createTestDb();
      expect(() => {
        db.user()
          .select((item) => ({
            result: expr
              .switch<string | undefined>()
              .case(expr.gt(item.age, 20), undefined)
              .default(undefined),
          }))
          .getSelectQueryDef();
      }).toThrow("At least one of switch's case/default must be non-null.");
    });
  });

  describe("if - both then and else are undefined", () => {
    it("throws an error", () => {
      const db = createTestDb();
      expect(() => {
        db.user()
          .select((item) => ({
            result: expr.if<string | undefined>(expr.gt(item.age, 20), undefined, undefined),
          }))
          .getSelectQueryDef();
      }).toThrow("At least one of if's then/else must be non-null.");
    });
  });

  describe("coalesce - create COALESCE with 3+ arguments", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        firstValid: expr.coalesce(item.email, item.name, "Anonymous"),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.coalesceMultiple[dialect]);
    });
  });
});
