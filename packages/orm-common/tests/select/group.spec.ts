import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import * as expected from "./group.expected";

describe("SELECT - GROUP BY", () => {
  //#region ========== Basic GROUP BY ==========

  describe("single column", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        name: item.name,
        cnt: expr.count(item.id),
      }))
      .groupBy((item) => [item.name])
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.groupSingle[dialect]);
    });
  });

  describe("multiple columns", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        name: item.name,
        isActive: item.isActive,
        cnt: expr.count(item.id),
      }))
      .groupBy((item) => [item.name, item.isActive])
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.groupMultiple[dialect]);
    });
  });

  describe("aggregate functions", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        name: item.name,
        cnt: expr.count(item.id),
        sumAge: expr.sum(item.age),
        avgAge: expr.avg(item.age),
        minAge: expr.min(item.age),
        maxAge: expr.max(item.age),
      }))
      .groupBy((item) => [item.name])
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.groupAggregate[dialect]);
    });
  });

  //#endregion
});

describe("SELECT - HAVING", () => {
  //#region ========== HAVING ==========

  describe("single condition", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        name: item.name,
        cnt: expr.count(item.id),
      }))
      .groupBy((item) => [item.name])
      .having((item) => [expr.gt(item.cnt, 5)])
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.havingSingle[dialect]);
    });
  });

  //#endregion
});
