import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./math.expected";

describe("Expr - 수학 함수", () => {
  describe("abs - 절댓값", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        absAge: expr.abs(item.age),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        absAge: {
          type: "abs",
          arg: { type: "column", path: ["T1", "age"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.abs[dialect]);
    });
  });

  describe("round - 반올림", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        rounded: expr.round(item.age, 2),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        rounded: {
          type: "round",
          arg: { type: "column", path: ["T1", "age"] },
          digits: 2,
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.round[dialect]);
    });
  });

  describe("ceil - 올림", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        ceiled: expr.ceil(item.age),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        ceiled: {
          type: "ceil",
          arg: { type: "column", path: ["T1", "age"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.ceil[dialect]);
    });
  });

  describe("floor - 내림", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        floored: expr.floor(item.age),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        floored: {
          type: "floor",
          arg: { type: "column", path: ["T1", "age"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.floor[dialect]);
    });
  });
});
