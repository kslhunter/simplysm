import { describe, it, expect } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { Queryable } from "../../src/exec/queryable";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { expr } from "../../src/expr/expr";

describe("Queryable 오류 케이스", () => {
  describe("expr.and()/expr.or() errors", () => {
    it("빈 배열로 and() 호출 시 ArgumentError", () => {
      expect(() => expr.and([])).toThrow("empty arrays are not allowed");
    });

  });

  describe("executable errors", () => {
    it("매개변수 없는 프로시저에 매개변수 전달 시 오류", () => {
      const db = createTestDb();
      expect(() => {
        // @ts-expect-error - test passing parameters to a procedure that expects none
        db.getAllUsers().getExecProcQueryDef({ unexpectedParam: 1 });
      }).toThrow("파라미터가 없습니다");
    });
  });

  describe("include() errors", () => {
    it("존재하지 않는 관계 include 시 오류", () => {
      const db = createTestDb();

      expect(() => {
        // @ts-expect-error - non-existent relation test
        db.user().include((item) => item.nonExistentRelation);
      }).toThrow("찾을 수 없습니다");
    });

    it("ViewBuilder 기반 queryable에서 include 호출 시 오류", () => {
      const db = createTestDb();

      expect(() => {
        // @ts-expect-error - ViewBuilder has no relations, include not supported
        db.activeUsers().include((item) => item.someRelation);
      }).toThrow("TableBuilder 기반");
    });
  });

  describe("union() errors", () => {
    it("단일 queryable로 union 호출 시 오류", () => {
      const db = createTestDb();

      expect(() => {
        Queryable.union(db.user());
      }).toThrow("최소 2개");
    });
  });

  describe("limit() errors", () => {
    it("ORDER BY 없이 limit 호출 시 오류", () => {
      const db = createTestDb();

      expect(() => {
        db.user().limit(0, 10);
      }).toThrow("ORDER BY 절");
    });
  });

  describe("regexp() errors", () => {
    it("MSSQL에서 regexp 사용 시 오류", () => {
      const db = createTestDb();
      const def = db
        .user()
        .where((item) => [expr.regexp(item.name, "^test.*")])
        .getSelectQueryDef();

      const builder = createQueryBuilder("mssql");
      expect(() => {
        builder.build(def);
      }).toThrow("REGEXP");
    });
  });

  describe("inQuery() errors", () => {
    it("다중 컬럼 서브쿼리 사용 시 오류", () => {
      const db = createTestDb();

      expect(() => {
        db.user()
          .where((u) => [
            expr.inQuery(
              u.id,
              // @ts-expect-error - multi-column subquery
              db.post().select((p) => ({ userId: p.userId, title: p.title })),
            ),
          ])
          .getSelectQueryDef();
      }).toThrow("단일 column");
    });

  });

  describe("countAsync() errors", () => {
    it("distinct() 후 직접 호출 시 오류", async () => {
      const db = createTestDb();

      await expect(
        db
          .user()
          .select((u) => ({ name: u.name }))
          .distinct()
          .count(),
      ).rejects.toThrow("distinct()");
    });

    it("groupBy() 후 직접 호출 시 오류", async () => {
      const db = createTestDb();

      await expect(
        db
          .user()
          .groupBy((u) => [u.name])
          .count(),
      ).rejects.toThrow("groupBy()");
    });
  });

});
