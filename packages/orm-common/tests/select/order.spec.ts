import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import * as expected from "./order.expected";

describe("SELECT - ORDER BY", () => {
  //#region ========== Basic ORDER BY ==========

  describe("ASC (기본값)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .orderBy((item) => item.id)
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.orderAscDefault[dialect]);
    });
  });

  describe("DESC", () => {
    const db = createTestDb();
    const def = db
      .user()
      .orderBy((item) => item.id, "DESC")
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.orderDesc[dialect]);
    });
  });

  //#endregion

  //#region ========== multiple sorting ==========

  describe("multiple sorting", () => {
    const db = createTestDb();
    const def = db
      .user()
      .orderBy((item) => item.name, "ASC")
      .orderBy((item) => item.id, "DESC")
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.orderMultiple[dialect]);
    });
  });

  //#endregion

  //#region ========== expression sorting ==========

  describe("sort by expressions", () => {
    const db = createTestDb();
    const def = db
      .user()
      .orderBy((item) => expr.length(item.name), "DESC")
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.orderExpression[dialect]);
    });
  });

  //#endregion

  //#region ========== combinations ==========

  describe("ORDER BY + LIMIT 조합", () => {
    const db = createTestDb();
    const def = db
      .user()
      .orderBy((item) => item.id, "DESC")
      .limit(0, 10)
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.orderLimitCombo[dialect]);
    });
  });

  //#endregion
});
