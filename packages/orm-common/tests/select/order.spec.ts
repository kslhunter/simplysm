import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { Queryable } from "../../src/exec/queryable";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
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

  //#region ========== String overload ==========

  describe("string overload - 단순 키 (ASC 기본값)", () => {
    const db = createTestDb();
    const def = db.user().orderBy("id").getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.orderAscDefault[dialect]);
    });
  });

  describe("string overload - 단순 키 (DESC)", () => {
    const db = createTestDb();
    const def = db.user().orderBy("id", "DESC").getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.orderDesc[dialect]);
    });
  });

  describe("string overload - lambda와 동일한 SQL 생성", () => {
    it.each(dialects)("[%s] string과 lambda가 동일한 SQL", (dialect) => {
      const dbStr = createTestDb();
      const dbFn = createTestDb();
      const defFromString = dbStr.user().orderBy("id", "DESC").getSelectQueryDef();
      const defFromLambda = dbFn
        .user()
        .orderBy((item) => item.id, "DESC")
        .getSelectQueryDef();

      const builder = createQueryBuilder(dialect);
      const sqlFromString = builder.build(defFromString).sql;
      const sqlFromLambda = builder.build(defFromLambda).sql;
      expect(sqlFromString).toMatchSql(sqlFromLambda);
    });
  });

  describe("string overload - 체인 키 (include 후 'user.name')", () => {
    it.each(dialects)("[%s] string과 lambda가 동일한 SQL", (dialect) => {
      const dbStr = createTestDb();
      const dbFn = createTestDb();
      const defFromString = dbStr
        .post()
        .include((item) => item.user)
        .orderBy("user.name", "DESC")
        .getSelectQueryDef();
      const defFromLambda = dbFn
        .post()
        .include((item) => item.user)
        .orderBy((item) => item.user!.name, "DESC")
        .getSelectQueryDef();

      const builder = createQueryBuilder(dialect);
      const sqlFromString = builder.build(defFromString).sql;
      const sqlFromLambda = builder.build(defFromLambda).sql;
      expect(sqlFromString).toMatchSql(sqlFromLambda);
    });
  });

  describe("string overload - UNION의 Array from 분기", () => {
    it.each(dialects)("[%s] string과 lambda가 동일한 SQL", (dialect) => {
      const dbStr = createTestDb();
      const dbFn = createTestDb();

      const strQr1 = dbStr.user().where((item) => [expr.eq(item.isActive, true)]);
      const strQr2 = dbStr.user().where((item) => [expr.gt(item.age, 30)]);
      const defFromString = Queryable.union(strQr1, strQr2)
        .orderBy("id", "DESC")
        .getSelectQueryDef();

      const fnQr1 = dbFn.user().where((item) => [expr.eq(item.isActive, true)]);
      const fnQr2 = dbFn.user().where((item) => [expr.gt(item.age, 30)]);
      const defFromLambda = Queryable.union(fnQr1, fnQr2)
        .orderBy((item) => item.id, "DESC")
        .getSelectQueryDef();

      const builder = createQueryBuilder(dialect);
      const sqlFromString = builder.build(defFromString).sql;
      const sqlFromLambda = builder.build(defFromLambda).sql;
      expect(sqlFromString).toMatchSql(sqlFromLambda);
    });
  });

  //#endregion

  //#region ========== Literal-valued column (raw 상수 ExprUnit 화) ==========

  describe("리터럴 상수 컬럼 -> ORDER BY 그 컬럼 (string overload)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((u) => ({ id: u.id, label: "fixed" }))
      .orderBy("label", "DESC")
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.literalColumnOrderByString[dialect]);
    });
  });

  describe("리터럴 상수 컬럼 -> ORDER BY 그 컬럼 (lambda overload)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((u) => ({ id: u.id, label: "fixed" }))
      .orderBy((item) => item.label, "DESC")
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.literalColumnOrderByLambda[dialect]);
    });
  });

  describe("null/undefined 컬럼 통과 (SELECT 본문 회귀)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((u) => ({ id: u.id, x: null }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.literalNullColumn[dialect]);
    });
  });

  //#endregion
});
