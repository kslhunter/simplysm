import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./math.expected";

describe("Expr - 수학 함수", () => {
  describe("abs - absolute value", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        absAge: expr.abs(item.age),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.abs[dialect]);
    });
  });

  describe("round - rounding", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        rounded: expr.round(item.age, 2),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.round[dialect]);
    });
  });

});
