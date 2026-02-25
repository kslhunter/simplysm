import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./string.expected";

describe("Expr - String functions", () => {
  describe("concat - string concatenation (null processing)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        fullName: expr.concat(item.name, "@", item.email),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        fullName: {
          type: "concat",
          args: expect.arrayContaining([
            { type: "column", path: ["T1", "name"] },
            { type: "value", value: "@" },
            { type: "column", path: ["T1", "email"] },
          ]),
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.concat[dialect]);
    });
  });

  describe("length - character length", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        nameLength: expr.length(item.name),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        nameLength: {
          type: "length",
          arg: { type: "column", path: ["T1", "name"] },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.length[dialect]);
    });
  });

  describe("byteLength - byte length", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        byteLen: expr.byteLength(item.name),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        byteLen: {
          type: "byteLength",
          arg: { type: "column", path: ["T1", "name"] },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.byteLength[dialect]);
    });
  });

  describe("left - extract left string", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        prefix: expr.left(item.name, 3),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        prefix: {
          type: "left",
          source: { type: "column", path: ["T1", "name"] },
          length: { type: "value", value: 3 },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.left[dialect]);
    });
  });

  describe("right - extract right string", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        suffix: expr.right(item.name, 3),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        suffix: {
          type: "right",
          source: { type: "column", path: ["T1", "name"] },
          length: { type: "value", value: 3 },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.right[dialect]);
    });
  });

  describe("trim - remove whitespace", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        trimmed: expr.trim(item.name),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        trimmed: {
          type: "trim",
          arg: { type: "column", path: ["T1", "name"] },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.trim[dialect]);
    });
  });

  describe("padStart - left padding", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        padded: expr.padStart(item.name, 10, "0"),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        padded: {
          type: "padStart",
          source: { type: "column", path: ["T1", "name"] },
          length: { type: "value", value: 10 },
          fillString: { type: "value", value: "0" },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.padStart[dialect]);
    });
  });

  describe("replace - character replacement", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        replaced: expr.replace(item.name, "a", "A"),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        replaced: {
          type: "replace",
          source: { type: "column", path: ["T1", "name"] },
          from: { type: "value", value: "a" },
          to: { type: "value", value: "A" },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.replace[dialect]);
    });
  });

  describe("upper - convert to uppercase", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        upper: expr.upper(item.name),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        upper: {
          type: "upper",
          arg: { type: "column", path: ["T1", "name"] },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.upper[dialect]);
    });
  });

  describe("lower - convert to lowercase", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        lower: expr.lower(item.name),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        lower: {
          type: "lower",
          arg: { type: "column", path: ["T1", "name"] },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.lower[dialect]);
    });
  });

  describe("substring - substring", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        sub: expr.substring(item.name, 1, 5),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        sub: {
          type: "substring",
          source: { type: "column", path: ["T1", "name"] },
          start: { type: "value", value: 1 },
          length: { type: "value", value: 5 },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.substring[dialect]);
    });
  });

  describe("indexOf - character position (0-based)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        pos: expr.indexOf(item.name, "test"),
      }))
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.select).toMatchObject({
        pos: {
          type: "indexOf",
          source: { type: "column", path: ["T1", "name"] },
          search: { type: "value", value: "test" },
        },
      });
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.indexOf[dialect]);
    });
  });

  describe("like - LIKE pattern matching", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.like(item.name, "%test%")])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.where).toEqual([
        {
          type: "like",
          source: { type: "column", path: ["T1", "name"] },
          pattern: { type: "value", value: "%test%" },
        },
      ]);
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.like[dialect]);
    });
  });

  describe("like - escape processing (%)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.like(item.name, "%\\%%")])
      .getSelectQueryDef();

    it("Verify QueryDef", () => {
      expect(def.where).toEqual([
        {
          type: "like",
          source: { type: "column", path: ["T1", "name"] },
          pattern: { type: "value", value: "%\\%%" },
        },
      ]);
    });

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.likeEscape[dialect]);
    });
  });
});
