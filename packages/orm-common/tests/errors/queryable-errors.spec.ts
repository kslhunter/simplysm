import { describe, it, expect } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { Queryable } from "../../src/exec/queryable";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { expr } from "../../src/expr/expr";

describe("Queryable error cases", () => {
  describe("expr.and()/expr.or() errors", () => {
    it("ArgumentError when calling and() with empty array", () => {
      expect(() => expr.and([])).toThrow("empty arrays are not allowed");
    });

    it("ArgumentError when calling or() with empty array", () => {
      expect(() => expr.or([])).toThrow("empty arrays are not allowed");
    });
  });

  describe("executable errors", () => {
    it("Error when passing parameters to procedure without parameters", () => {
      const db = createTestDb();
      expect(() => {
        // @ts-expect-error - 파라미터 없는 프로시저에 파라미터 전달 테스트
        db.getAllUsers().getExecProcQueryDef({ unexpectedParam: 1 });
      }).toThrow("has no parameters.");
    });
  });

  describe("include() errors", () => {
    it("Error when including non-existent relation", () => {
      const db = createTestDb();

      expect(() => {
        // @ts-expect-error - non-existent relation test
        db.user().include((item) => item.nonExistentRelation);
      }).toThrow("Relation 'nonExistentRelation' not found.");
    });

    it("Error when calling include on ViewBuilder-based queryable", () => {
      const db = createTestDb();

      expect(() => {
        // @ts-expect-error - ViewBuilder has no relations, include not supported
        db.activeUsers().include((item) => item.someRelation);
      }).toThrow("include() can only be used on TableBuilder-based queryables.");
    });
  });

  describe("union() errors", () => {
    it("Error when calling union with a single queryable", () => {
      const db = createTestDb();

      expect(() => {
        Queryable.union(db.user());
      }).toThrow("union requires at least 2 queryables.");
    });
  });

  describe("limit() errors", () => {
    it("Error when calling limit without ORDER BY", () => {
      const db = createTestDb();

      expect(() => {
        db.user().limit(0, 10);
      }).toThrow("limit() requires ORDER BY clause.");
    });
  });

  describe("regexp() errors", () => {
    it("Error when using regexp in MSSQL", () => {
      const db = createTestDb();
      const def = db
        .user()
        .where((item) => [expr.regexp(item.name, "^test.*")])
        .getSelectQueryDef();

      const builder = createQueryBuilder("mssql");
      expect(() => {
        builder.build(def);
      }).toThrow("MSSQL does not natively support REGEXP.");
    });
  });

  describe("inQuery() errors", () => {
    it("Error when using multi-column subquery", () => {
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
      }).toThrow("inQuery subquery must SELECT only a single column.");
    });

    it("Error when using subquery without column specification", () => {
      const db = createTestDb();

      expect(() => {
        db.user()
          .where((u) => [
            expr.inQuery(
              u.id,
              // @ts-expect-error - subquery without SELECT
              db.post(),
            ),
          ])
          .getSelectQueryDef();
      }).toThrow("inQuery subquery must SELECT only a single column.");
    });
  });

  describe("countAsync() errors", () => {
    it("Error when calling directly after distinct()", async () => {
      const db = createTestDb();

      await expect(
        db
          .user()
          .select((u) => ({ name: u.name }))
          .distinct()
          .count(),
      ).rejects.toThrow(
        "Cannot use count() after distinct(). Use wrap() first.",
      );
    });

    it("Error when calling directly after groupBy()", async () => {
      const db = createTestDb();

      await expect(
        db
          .user()
          .groupBy((u) => [u.name])
          .count(),
      ).rejects.toThrow("Cannot use count() after groupBy(). Use wrap() first.");
    });
  });

  describe("RecursiveQueryable.union() errors", () => {
    it("Error when calling union with a single queryable", () => {
      const db = createTestDb();

      expect(() => {
        db.employee()
          .where((e) => [expr.null(e.managerId)])
          .recursive((cte) => cte.union(db.employee()));
      }).toThrow("union requires at least 2 queryables.");
    });

    it("Error when calling union with zero queryables", () => {
      const db = createTestDb();

      expect(() => {
        db.employee()
          .where((e) => [expr.null(e.managerId)])
          .recursive((cte) => cte.union());
      }).toThrow("union requires at least 2 queryables.");
    });
  });

  describe("JoinQueryable.union() errors", () => {
    it("Error when calling union with a single queryable inside join", () => {
      const db = createTestDb();

      expect(() => {
        db.user().join("posts", (j, u) =>
          j.union(db.post().where((p) => [expr.eq(p.userId, u.id)])),
        );
      }).toThrow("union requires at least 2 queryables.");
    });
  });
});
