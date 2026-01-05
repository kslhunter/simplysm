import { describe, it, expect } from "vitest";
import { TestDbContext } from "../setup/TestDbContext";
import { Queryable } from "../../src/exec/queryable";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { expr } from "../../src/expr/expr";

describe("Queryable 에러 케이스", () => {
  describe("include() 에러", () => {
    it("존재하지 않는 관계를 include하면 에러", () => {
      const db = new TestDbContext();

      expect(() => {
        // @ts-expect-error - 존재하지 않는 관계 테스트
        db.user().include((item) => item.nonExistentRelation);
      }).toThrow("관계 'nonExistentRelation'을(를) 찾을 수 없습니다.");
    });
  });

  describe("union() 에러", () => {
    it("queryable 1개로 union하면 에러", () => {
      const db = new TestDbContext();

      expect(() => {
        Queryable.union(db.user());
      }).toThrow("union은 최소 2개의 queryable이 필요합니다.");
    });
  });

  describe("limit() 에러", () => {
    it("ORDER BY 없이 limit하면 에러", () => {
      const db = new TestDbContext();

      expect(() => {
        db.user().limit(0, 10);
      }).toThrow("limit()은 ORDER BY 절이 필요합니다.");
    });
  });

  describe("regexp() 에러", () => {
    it("MSSQL에서 regexp 사용하면 에러", () => {
      const db = new TestDbContext();
      const def = db
        .user()
        .where((item) => [expr.regexp(item.name, "^test.*")])
        .getSelectQueryDef();

      const builder = createQueryBuilder("mssql");
      expect(() => {
        builder.build(def);
      }).toThrow("MSSQL은 REGEXP를 네이티브로 지원하지 않습니다.");
    });
  });
});
