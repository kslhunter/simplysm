import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./conditional.expected";

describe("Expr - Conditional functions", () => {
  describe("ifNull - null replacement", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        nameOrDefault: expr.ifNull(item.name, "Unknown"),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        nameOrDefault: {
          type: "ifNull",
          args: [
            { type: "column", path: ["T1", "name"] },
            { type: "value", value: "Unknown" },
          ],
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.ifNull[dialect]);
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

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        checkedAge: {
          type: "nullIf",
          source: { type: "column", path: ["T1", "age"] },
          value: { type: "value", value: 0 },
        },
      });
    });

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

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        status: {
          type: "if",
          condition: {
            type: "eq",
            source: { type: "column", path: ["T1", "isActive"] },
            target: { type: "value", value: true },
          },
          then: { type: "value", value: "Active" },
          else: { type: "value", value: "Inactive" },
        },
      });
    });

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

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        ageGroup: {
          type: "switch",
          cases: expect.arrayContaining([
            {
              when: {
                type: "lt",
                source: { type: "column", path: ["T1", "age"] },
                target: { type: "value", value: 20 },
              },
              then: { type: "value", value: "Teen" },
            },
            {
              when: {
                type: "lt",
                source: { type: "column", path: ["T1", "age"] },
                target: { type: "value", value: 40 },
              },
              then: { type: "value", value: "Adult" },
            },
          ]),
          else: { type: "value", value: "Senior" },
        },
      });
    });

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

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        isActiveFlag: {
          type: "is",
          condition: {
            type: "eq",
            source: { type: "column", path: ["T1", "isActive"] },
            target: { type: "value", value: true },
          },
        },
      });
    });

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

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        maxVal: {
          type: "greatest",
          args: expect.arrayContaining([
            { type: "column", path: ["T1", "age"] },
            { type: "value", value: 18 },
          ]),
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.greatest[dialect]);
    });
  });

  describe("least - minimum value", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        minVal: expr.least(item.age, 100),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        minVal: {
          type: "least",
          args: expect.arrayContaining([
            { type: "column", path: ["T1", "age"] },
            { type: "value", value: 100 },
          ]),
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.least[dialect]);
    });
  });

  describe("switch - all case/default are undefined", () => {
    it("에러를 발생시킨다", () => {
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
      }).toThrow("switch의 case/default 중 적어도 하나는 non-null이어야 합니다.");
    });
  });

  describe("if - both then and else are undefined", () => {
    it("에러를 발생시킨다", () => {
      const db = createTestDb();
      expect(() => {
        db.user()
          .select((item) => ({
            result: expr.if<string | undefined>(expr.gt(item.age, 20), undefined, undefined),
          }))
          .getSelectQueryDef();
      }).toThrow("if의 then/else 중 적어도 하나는 non-null이어야 합니다.");
    });
  });

  describe("ifNull - create COALESCE with 3+ arguments", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        firstValid: expr.ifNull(item.email, item.name, "익명"),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        firstValid: {
          type: "ifNull",
          args: [
            { type: "column", path: ["T1", "email"] },
            { type: "column", path: ["T1", "name"] },
            { type: "value", value: "익명" },
          ],
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.ifNullMultiple[dialect]);
    });
  });
});
