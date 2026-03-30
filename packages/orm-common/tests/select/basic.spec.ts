import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./basic.expected";

describe("SELECT - 기본", () => {
  describe("테이블에서 SELECT", () => {
    const db = createTestDb();
    const def = db.user().getSelectQueryDef();

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

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectAggregate[dialect]);
    });
  });

  describe("coalesce (2 arguments)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        email: expr.coalesce(item.email, "N/A"),
      }))
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectIfNull2[dialect]);
    });
  });

  describe("coalesce (3 arguments, COALESCE)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        contact: expr.coalesce(item.email, item.name, "N/A"),
      }))
      .getSelectQueryDef();

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

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectSubstring[dialect]);
    });
  });

  describe("substring (length omitted)", () => {
    const db = createTestDb();
    const def = db
      .user()
      .select((item) => ({
        suffix: expr.substring(item.name, 3),
      }))
      .getSelectQueryDef();

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

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectDistinct[dialect]);
    });
  });

  describe("LOCK", () => {
    const db = createTestDb();
    const def = db.user().lock().getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectLock[dialect]);
    });
  });

  describe("DISTINCT + LOCK 조합", () => {
    const db = createTestDb();
    const def = db.user().distinct().lock().getSelectQueryDef();

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

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectLimit[dialect]);
    });
  });

  describe("LIMIT - 오프셋 포함", () => {
    const db = createTestDb();
    const def = db
      .user()
      .orderBy((item) => item.id)
      .limit(20, 10)
      .getSelectQueryDef();

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.selectLimitOffset[dialect]);
    });
  });

  // Random sampling see examples/sampling.spec.ts
});
