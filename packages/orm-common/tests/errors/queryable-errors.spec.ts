import { describe, it, expect } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { Queryable } from "../../src/exec/queryable";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { expr } from "../../src/expr/expr";

describe("Queryable error cases", () => {
  describe("expr.and()/expr.or() errors", () => {
    it("ArgumentError when calling and() with empty array", () => {
      expect(() => expr.and([])).toThrow("빈 배열은 허용되지 않습니다");
    });

    it("ArgumentError when calling or() with empty array", () => {
      expect(() => expr.or([])).toThrow("빈 배열은 허용되지 않습니다");
    });
  });

  describe("executable errors", () => {
    it("Error when passing parameters to procedure without parameters", () => {
      const db = createTestDb();
      expect(() => {
        // @ts-expect-error - 파라미터 없는 프로시저에 파라미터 전달 테스트
        db.getAllUsers().getExecProcQueryDef({ unexpectedParam: 1 });
      }).toThrow("파라미터가 없습니다.");
    });
  });

  describe("include() errors", () => {
    it("Error when including non-existent relation", () => {
      const db = createTestDb();

      expect(() => {
        // @ts-expect-error - non-existent relation test
        db.user().include((item) => item.nonExistentRelation);
      }).toThrow("관계 'nonExistentRelation'을(를) 찾을 수 없습니다.");
    });

    it("Error when calling include on ViewBuilder-based queryable", () => {
      const db = createTestDb();

      expect(() => {
        // @ts-expect-error - ViewBuilder has no relations, include not supported
        db.activeUsers().include((item) => item.someRelation);
      }).toThrow("include()는 TableBuilder 기반 queryable에서만 사용할 수 있습니다.");
    });
  });

  describe("union() errors", () => {
    it("Error when calling union with a single queryable", () => {
      const db = createTestDb();

      expect(() => {
        Queryable.union(db.user());
      }).toThrow("union은 최소 2개의 queryable이 필요합니다.");
    });
  });

  describe("limit() errors", () => {
    it("Error when calling limit without ORDER BY", () => {
      const db = createTestDb();

      expect(() => {
        db.user().limit(0, 10);
      }).toThrow("limit()은 ORDER BY 절이 필요합니다.");
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
      }).toThrow("MSSQL은 REGEXP를 네이티브로 지원하지 않습니다.");
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
      }).toThrow("inQuery의 서브쿼리는 단일 컬럼만 SELECT해야 합니다.");
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
      }).toThrow("inQuery의 서브쿼리는 단일 컬럼만 SELECT해야 합니다.");
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
        "distinct() 후에는 count()를 사용할 수 없습니다. wrap()을 먼저 사용하세요.",
      );
    });

    it("Error when calling directly after groupBy()", async () => {
      const db = createTestDb();

      await expect(
        db
          .user()
          .groupBy((u) => [u.name])
          .count(),
      ).rejects.toThrow("groupBy() 후에는 count()를 사용할 수 없습니다. wrap()을 먼저 사용하세요.");
    });
  });

  describe("RecursiveQueryable.union() errors", () => {
    it("Error when calling union with a single queryable", () => {
      const db = createTestDb();

      expect(() => {
        db.employee()
          .where((e) => [expr.null(e.managerId)])
          .recursive((cte) => cte.union(db.employee()));
      }).toThrow("union은 최소 2개의 queryable이 필요합니다.");
    });

    it("Error when calling union with zero queryables", () => {
      const db = createTestDb();

      expect(() => {
        db.employee()
          .where((e) => [expr.null(e.managerId)])
          .recursive((cte) => cte.union());
      }).toThrow("union은 최소 2개의 queryable이 필요합니다.");
    });
  });

  describe("JoinQueryable.union() errors", () => {
    it("Error when calling union with a single queryable inside join", () => {
      const db = createTestDb();

      expect(() => {
        db.user().join("posts", (j, u) =>
          j.union(db.post().where((p) => [expr.eq(p.userId, u.id)])),
        );
      }).toThrow("union은 최소 2개의 queryable이 필요합니다.");
    });
  });
});
