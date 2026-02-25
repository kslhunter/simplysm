import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./basic.expected";

describe("SELECT - Basic", () => {
  describe("테이블에서 가져오기", () => {
    const db = createTestDb();
    const def = db.user().getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectAll[dialect]);
    });
  });

  describe("컬럼 선택", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        id: item.id,
        name: item.name,
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          name: { type: "column", path: ["T1", "name"] },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectColumns[dialect]);
    });
  });

  describe("표현식 사용 (concat)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        email: expr.concat(item.email, "@test.com"),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        select: {
          email: {
            type: "concat",
            args: [
              { type: "column", path: ["T1", "email"] },
              { type: "value", value: "@test.com" },
            ],
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectConcat[dialect]);
    });
  });

  describe("집계 함수", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        cnt: expr.count(item.id),
        total: expr.sum(item.age),
        avg: expr.avg(item.age),
        min: expr.min(item.age),
        max: expr.max(item.age),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        select: {
          cnt: { type: "count", arg: { type: "column", path: ["T1", "id"] } },
          total: { type: "sum", arg: { type: "column", path: ["T1", "age"] } },
          avg: { type: "avg", arg: { type: "column", path: ["T1", "age"] } },
          min: { type: "min", arg: { type: "column", path: ["T1", "age"] } },
          max: { type: "max", arg: { type: "column", path: ["T1", "age"] } },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectAggregate[dialect]);
    });
  });

  describe("ifNull (2개 인자)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        email: expr.ifNull(item.email, "없음"),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        select: {
          email: {
            type: "ifNull",
            args: [
              { type: "column", path: ["T1", "email"] },
              { type: "value", value: "없음" },
            ],
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectIfNull2[dialect]);
    });
  });

  describe("ifNull (3개 인자, COALESCE)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        contact: expr.ifNull(item.email, item.name, "없음"),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        select: {
          contact: {
            type: "ifNull",
            args: [
              { type: "column", path: ["T1", "email"] },
              { type: "column", path: ["T1", "name"] },
              { type: "value", value: "없음" },
            ],
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectIfNull3[dialect]);
    });
  });

  describe("nullIf", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        name: expr.nullIf(item.name, "N/A"),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        select: {
          name: {
            type: "nullIf",
            source: { type: "column", path: ["T1", "name"] },
            value: { type: "value", value: "N/A" },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectNullIf[dialect]);
    });
  });

  describe("substring", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        shortName: expr.substring(item.name, 1, 3),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        select: {
          shortName: {
            type: "substring",
            source: { type: "column", path: ["T1", "name"] },
            start: { type: "value", value: 1 },
            length: { type: "value", value: 3 },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectSubstring[dialect]);
    });
  });

  describe("substring (length 생략)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        suffix: expr.substring(item.name, 3),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        select: {
          suffix: {
            type: "substring",
            source: { type: "column", path: ["T1", "name"] },
            start: { type: "value", value: 3 },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectSubstringNoLength[dialect]);
    });
  });

  describe("indexOf", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        atPos: expr.indexOf(item.email, "@"),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        select: {
          atPos: {
            type: "indexOf",
            source: { type: "column", path: ["T1", "email"] },
            search: { type: "value", value: "@" },
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectIndexOf[dialect]);
    });
  });

  describe("least", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        minAge: expr.least(item.age, 50),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        select: {
          minAge: {
            type: "least",
            args: [
              { type: "column", path: ["T1", "age"] },
              { type: "value", value: 50 },
            ],
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectLeast[dialect]);
    });
  });

  describe("greatest", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        maxAge: expr.greatest(item.age, 18),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        select: {
          maxAge: {
            type: "greatest",
            args: [
              { type: "column", path: ["T1", "age"] },
              { type: "value", value: 18 },
            ],
          },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectGreatest[dialect]);
    });
  });
});

describe("SELECT - 옵션", () => {
  describe("DISTINCT", () => {
    const db = createTestDb();
    const def = db.user().distinct().getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        distinct: true,
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectDistinct[dialect]);
    });
  });

  describe("LOCK", () => {
    const db = createTestDb();
    const def = db.user().lock().getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        lock: true,
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectLock[dialect]);
    });
  });

  describe("DISTINCT + LOCK 조합", () => {
    const db = createTestDb();
    const def = db.user().distinct().lock().getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        distinct: true,
        lock: true,
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectDistinctLock[dialect]);
    });
  });
});

describe("SELECT - 제한", () => {
  describe("TOP", () => {
    const db = createTestDb();
    const def = db.user().top(10).getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        top: 10,
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectTop[dialect]);
    });
  });

  describe("LIMIT", () => {
    const db = createTestDb();
    const def = db
      .user()
      .orderBy((item) => item.id)
      .limit(0, 10)
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        orderBy: [[{ type: "column", path: ["T1", "id"] }]],
        limit: [0, 10],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectLimit[dialect]);
    });
  });

  describe("LIMIT - offset 포함", () => {
    const db = createTestDb();
    const def = db
      .user()
      .orderBy((item) => item.id)
      .limit(20, 10)
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: { database: "TestDb", schema: "TestSchema", name: "User" },
        orderBy: [[{ type: "column", path: ["T1", "id"] }]],
        limit: [20, 10],
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectLimitOffset[dialect]);
    });
  });

  // 랜덤 샘플링은 examples/sampling.spec.ts 참고
});
