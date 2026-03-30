import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./string.expected";

describe("Expr - 문자열 함수", () => {
  describe("concat - string concatenation (null processing)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        fullName: expr.concat(item.name, "@", item.email),
      }))
      .getSelectQueryDef();

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

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.likeEscape[dialect]);
    });
  });
});
