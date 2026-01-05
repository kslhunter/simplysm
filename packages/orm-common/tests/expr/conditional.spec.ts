import { describe, expect, it } from "vitest";
import { TestDbContext } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./conditional.expected";

describe("Expr - 조건 함수", () => {
  describe("ifNull - null 대체", () => {
    const db = new TestDbContext();
    const def = db
      .user()
      .select((item) => ({
        nameOrDefault: expr.ifNull(item.name, "Unknown"),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.ifNull[dialect]);
    });
  });

  describe("nullIf - 값이 같으면 null", () => {
    const db = new TestDbContext();
    const def = db
      .user()
      .select((item) => ({
        checkedAge: expr.nullIf(item.age, 0),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        checkedAge: {
          type: "nullIf",
          source: { type: "column", path: ["T1", "age"] },
          value: { type: "value", value: 0 },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.nullIf[dialect]);
    });
  });

  describe("if - 조건 분기", () => {
    const db = new TestDbContext();
    const def = db
      .user()
      .select((item) => ({
        status: expr.if(expr.eq(item.isActive, true), "Active", "Inactive"),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.ifCond[dialect]);
    });
  });

  describe("switch - CASE WHEN", () => {
    const db = new TestDbContext();
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

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.switchCase[dialect]);
    });
  });

  describe("is - 조건 boolean 변환", () => {
    const db = new TestDbContext();
    const def = db
      .user()
      .select((item) => ({
        isActiveFlag: expr.is(expr.eq(item.isActive, true)),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.isExpr[dialect]);
    });
  });

  describe("greatest - 최댓값", () => {
    const db = new TestDbContext();
    const def = db
      .user()
      .select((item) => ({
        maxVal: expr.greatest(item.age, 18),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.greatest[dialect]);
    });
  });

  describe("least - 최솟값", () => {
    const db = new TestDbContext();
    const def = db
      .user()
      .select((item) => ({
        minVal: expr.least(item.age, 100),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.least[dialect]);
    });
  });
});
