import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./string.expected";

describe("Expr - 문자열 함수", () => {
  describe("concat - 문자열 연결 (null 처리)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        fullName: expr.concat(item.name, "@", item.email),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
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

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.concat[dialect]);
    });
  });

  describe("length - 문자 길이", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        nameLength: expr.length(item.name),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        nameLength: {
          type: "length",
          arg: { type: "column", path: ["T1", "name"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.length[dialect]);
    });
  });

  describe("byteLength - 바이트 길이", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        byteLen: expr.byteLength(item.name),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        byteLen: {
          type: "byteLength",
          arg: { type: "column", path: ["T1", "name"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.byteLength[dialect]);
    });
  });

  describe("left - 왼쪽 문자열 추출", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        prefix: expr.left(item.name, 3),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        prefix: {
          type: "left",
          source: { type: "column", path: ["T1", "name"] },
          length: { type: "value", value: 3 },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.left[dialect]);
    });
  });

  describe("right - 오른쪽 문자열 추출", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        suffix: expr.right(item.name, 3),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        suffix: {
          type: "right",
          source: { type: "column", path: ["T1", "name"] },
          length: { type: "value", value: 3 },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.right[dialect]);
    });
  });

  describe("trim - 공백 제거", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        trimmed: expr.trim(item.name),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        trimmed: {
          type: "trim",
          arg: { type: "column", path: ["T1", "name"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.trim[dialect]);
    });
  });

  describe("padStart - 왼쪽 패딩", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        padded: expr.padStart(item.name, 10, "0"),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        padded: {
          type: "padStart",
          source: { type: "column", path: ["T1", "name"] },
          length: { type: "value", value: 10 },
          fillString: { type: "value", value: "0" },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.padStart[dialect]);
    });
  });

  describe("replace - 문자 치환", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        replaced: expr.replace(item.name, "a", "A"),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        replaced: {
          type: "replace",
          source: { type: "column", path: ["T1", "name"] },
          from: { type: "value", value: "a" },
          to: { type: "value", value: "A" },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.replace[dialect]);
    });
  });

  describe("upper - 대문자 변환", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        upper: expr.upper(item.name),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        upper: {
          type: "upper",
          arg: { type: "column", path: ["T1", "name"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.upper[dialect]);
    });
  });

  describe("lower - 소문자 변환", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        lower: expr.lower(item.name),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        lower: {
          type: "lower",
          arg: { type: "column", path: ["T1", "name"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.lower[dialect]);
    });
  });

  describe("substring - 부분 문자열", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        sub: expr.substring(item.name, 1, 5),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        sub: {
          type: "substring",
          source: { type: "column", path: ["T1", "name"] },
          start: { type: "value", value: 1 },
          length: { type: "value", value: 5 },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.substring[dialect]);
    });
  });

  describe("indexOf - 문자 위치 (0-based)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        pos: expr.indexOf(item.name, "test"),
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.select).toMatchObject({
        pos: {
          type: "indexOf",
          source: { type: "column", path: ["T1", "name"] },
          search: { type: "value", value: "test" },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.indexOf[dialect]);
    });
  });

  describe("like - LIKE 패턴 매칭", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.like(item.name, "%test%")])
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.where).toEqual([
        {
          type: "like",
          source: { type: "column", path: ["T1", "name"] },
          pattern: { type: "value", value: "%test%" },
        },
      ]);
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.like[dialect]);
    });
  });

  describe("like - 이스케이프 처리 (%)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .where((item) => [expr.like(item.name, "%\\%%")])
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def.where).toEqual([
        {
          type: "like",
          source: { type: "column", path: ["T1", "name"] },
          pattern: { type: "value", value: "%\\%%" },
        },
      ]);
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.likeEscape[dialect]);
    });
  });
});
