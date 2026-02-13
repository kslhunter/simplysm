import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./comparison.expected";
import { DateTime } from "@simplysm/core-common";

describe("Expr - 비교 연산자 (null-safe)", () => {
  describe("eq - 동등 비교 (null == null → true)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.eq(item.email, undefined)])
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toMatchObject({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        where: [
          {
            type: "eq",
            source: { type: "column", path: ["T1", "email"] },
            target: { type: "value", value: undefined },
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.eqNull[dialect]);
    });
  });

  describe("eq - 값 비교 (1 == 1 → true)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.eq(item.id, 1)])
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toMatchObject({
        type: "select",
        where: [
          {
            type: "eq",
            source: { type: "column", path: ["T1", "id"] },
            target: { type: "value", value: 1 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.eqValue[dialect]);
    });
  });

  describe("gt - 초과 비교", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.gt(item.age, 20)])
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toMatchObject({
        type: "select",
        where: [
          {
            type: "gt",
            source: { type: "column", path: ["T1", "age"] },
            target: { type: "value", value: 20 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.gt[dialect]);
    });
  });

  describe("lt - 미만 비교", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.lt(item.age, 30)])
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toMatchObject({
        type: "select",
        where: [
          {
            type: "lt",
            source: { type: "column", path: ["T1", "age"] },
            target: { type: "value", value: 30 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.lt[dialect]);
    });
  });

  describe("gte - 이상 비교", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.gte(item.age, 18)])
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toMatchObject({
        type: "select",
        where: [
          {
            type: "gte",
            source: { type: "column", path: ["T1", "age"] },
            target: { type: "value", value: 18 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.gte[dialect]);
    });
  });

  describe("lte - 이하 비교", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.lte(item.age, 65)])
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toMatchObject({
        type: "select",
        where: [
          {
            type: "lte",
            source: { type: "column", path: ["T1", "age"] },
            target: { type: "value", value: 65 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.lte[dialect]);
    });
  });

  describe("between - 범위 비교", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.between(item.age, 20, 30)])
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toMatchObject({
        type: "select",
        where: [
          {
            type: "between",
            source: { type: "column", path: ["T1", "age"] },
            from: { type: "value", value: 20 },
            to: { type: "value", value: 30 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.between[dialect]);
    });
  });

  describe("between - from만 있는 경우 (>= 처리)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.between(item.age, 20, undefined)])
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toMatchObject({
        type: "select",
        where: [
          {
            type: "between",
            source: { type: "column", path: ["T1", "age"] },
            from: { type: "value", value: 20 },
            to: undefined,
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.betweenFromOnly[dialect]);
    });
  });

  describe("between - to만 있는 경우 (<= 처리)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.between(item.age, undefined, 30)])
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toMatchObject({
        type: "select",
        where: [
          {
            type: "between",
            source: { type: "column", path: ["T1", "age"] },
            from: undefined,
            to: { type: "value", value: 30 },
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.betweenToOnly[dialect]);
    });
  });

  describe("between - 둘 다 없는 경우 (항상 true)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.between(item.age, undefined, undefined)])
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toMatchObject({
        type: "select",
        where: [
          {
            type: "between",
            source: { type: "column", path: ["T1", "age"] },
            from: undefined,
            to: undefined,
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.betweenNone[dialect]);
    });
  });

  describe("between - 컬럼 참조를 from/to로 사용", () => {
    const db = createTestDb();
    const def = db
      .monthlySales()
      .where((item) => [expr.between(item.feb, item.jan, item.mar)])
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toMatchObject({
        type: "select",
        where: [
          {
            type: "between",
            source: { type: "column", path: ["T1", "feb"] },
            from: { type: "column", path: ["T1", "jan"] },
            to: { type: "column", path: ["T1", "mar"] },
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.betweenColumns[dialect]);
    });
  });

  describe("regexp - 정규식 비교 (MySQL/PostgreSQL)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.regexp(item.name, "^test.*")])
      .getSelectQueryDef();

    it.each(["mysql", "postgresql"] as const)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.regexpMysqlPostgresql[dialect]);
    });
  });

  describe("in - 빈 배열 (항상 false)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.in(item.id, [])])
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toMatchObject({
        type: "select",
        where: [
          {
            type: "in",
            source: { type: "column", path: ["T1", "id"] },
            values: [],
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.inEmpty[dialect]);
    });
  });

  //#region ========== DateTime 값 테스트 ==========

  describe("eq - DateTime 값 비교", () => {
    const db = createTestDb();
    const testDateTime = new DateTime(2024, 1, 15, 10, 30, 0);
    const def = db
      .user()
      .where((item) => [expr.eq(item.createdAt, testDateTime)])
      .getSelectQueryDef();

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.eqDateTime[dialect]);
    });
  });

  //#endregion

  //#region ========== inQuery 테스트 ==========

  describe("inQuery - 서브쿼리 IN 조건", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((u) => [
        expr.inQuery(
          u.id,
          db.post().select((p) => ({ userId: p.userId })),
        ),
      ])
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toMatchObject({
        type: "select",
        where: [
          {
            type: "inQuery",
            source: { type: "column", path: ["T1", "id"] },
            query: {
              type: "select",
              select: {
                userId: { type: "column", path: ["T2", "userId"] },
              },
            },
          },
        ],
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.inQuery[dialect]);
    });
  });

  //#endregion
});
