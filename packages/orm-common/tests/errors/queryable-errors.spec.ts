import { describe, it, expect } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { Queryable } from "../../src/exec/queryable";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { expr } from "../../src/expr/expr";

describe("Queryable 에러 케이스", () => {
  describe("expr.and()/expr.or() 에러", () => {
    it("빈 배열로 and() 호출 시 ArgumentError", () => {
      expect(() => expr.and([])).toThrow("빈 배열은 허용되지 않습니다");
    });

    it("빈 배열로 or() 호출 시 ArgumentError", () => {
      expect(() => expr.or([])).toThrow("빈 배열은 허용되지 않습니다");
    });
  });

  describe("executable 에러", () => {
    it("파라미터 없는 프로시저에 파라미터 전달 시 에러", () => {
      const db = createTestDb();
      expect(() => {
        // @ts-expect-error - 파라미터 없는 프로시저에 파라미터 전달 테스트
        db.getAllUsers().getExecProcQueryDef({ unexpectedParam: 1 });
      }).toThrow("파라미터가 없습니다.");
    });
  });

  describe("include() 에러", () => {
    it("존재하지 않는 관계를 include하면 에러", () => {
      const db = createTestDb();

      expect(() => {
        // @ts-expect-error - 존재하지 않는 관계 테스트
        db.user().include((item) => item.nonExistentRelation);
      }).toThrow("관계 'nonExistentRelation'을(를) 찾을 수 없습니다.");
    });

    it("ViewBuilder 기반 queryable에서 include 호출 시 에러", () => {
      const db = createTestDb();

      expect(() => {
        // @ts-expect-error - ViewBuilder에는 relations가 없어 include 불가
        db.activeUsers().include((item) => item.someRelation);
      }).toThrow("include()는 TableBuilder 기반 queryable에서만 사용할 수 있습니다.");
    });
  });

  describe("union() 에러", () => {
    it("queryable 1개로 union하면 에러", () => {
      const db = createTestDb();

      expect(() => {
        Queryable.union(db.user());
      }).toThrow("union은 최소 2개의 queryable이 필요합니다.");
    });
  });

  describe("limit() 에러", () => {
    it("ORDER BY 없이 limit하면 에러", () => {
      const db = createTestDb();

      expect(() => {
        db.user().limit(0, 10);
      }).toThrow("limit()은 ORDER BY 절이 필요합니다.");
    });
  });

  describe("regexp() 에러", () => {
    it("MSSQL에서 regexp 사용하면 에러", () => {
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

  describe("inQuery() 에러", () => {
    it("다중 컬럼 서브쿼리 사용 시 에러", () => {
      const db = createTestDb();

      expect(() => {
        db.user()
          .where((u) => [
            expr.inQuery(
              u.id,
              // @ts-expect-error - 다중 컬럼 서브쿼리
              db.post().select((p) => ({ userId: p.userId, title: p.title })),
            ),
          ])
          .getSelectQueryDef();
      }).toThrow("inQuery의 서브쿼리는 단일 컬럼만 SELECT해야 합니다.");
    });

    it("컬럼 지정 없는 서브쿼리 사용 시 에러", () => {
      const db = createTestDb();

      expect(() => {
        db.user()
          .where((u) => [
            expr.inQuery(
              u.id,
              // @ts-expect-error - SELECT 없는 서브쿼리
              db.post(),
            ),
          ])
          .getSelectQueryDef();
      }).toThrow("inQuery의 서브쿼리는 단일 컬럼만 SELECT해야 합니다.");
    });
  });

  describe("countAsync() 에러", () => {
    it("distinct() 후 직접 호출하면 에러", async () => {
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

    it("groupBy() 후 직접 호출하면 에러", async () => {
      const db = createTestDb();

      await expect(
        db
          .user()
          .groupBy((u) => [u.name])
          .count(),
      ).rejects.toThrow("groupBy() 후에는 count()를 사용할 수 없습니다. wrap()을 먼저 사용하세요.");
    });
  });

  describe("RecursiveQueryable.union() 에러", () => {
    it("queryable 1개로 union하면 에러", () => {
      const db = createTestDb();

      expect(() => {
        db.employee()
          .where((e) => [expr.null(e.managerId)])
          .recursive((cte) => cte.union(db.employee()));
      }).toThrow("union은 최소 2개의 queryable이 필요합니다.");
    });

    it("queryable 0개로 union하면 에러", () => {
      const db = createTestDb();

      expect(() => {
        db.employee()
          .where((e) => [expr.null(e.managerId)])
          .recursive((cte) => cte.union());
      }).toThrow("union은 최소 2개의 queryable이 필요합니다.");
    });
  });

  describe("JoinQueryable.union() 에러", () => {
    it("join 내에서 queryable 1개로 union하면 에러", () => {
      const db = createTestDb();

      expect(() => {
        db.user().join("posts", (j, u) =>
          j.union(db.post().where((p) => [expr.eq(p.userId, u.id)])),
        );
      }).toThrow("union은 최소 2개의 queryable이 필요합니다.");
    });
  });
});
