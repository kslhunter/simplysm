import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { Employee } from "../setup/models/Employee";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./recursive-cte.expected";

describe("SELECT - Recursive CTE", () => {
  describe("기본: 특정 매니저의 모든 부하직원 조회", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .where((e) => [expr.eq(e.managerId, 1)])
      .select((e) => ({
        id: e.id,
        name: e.name,
        managerId: e.managerId,
        depth: expr.val("number", 1),
      }))
      .recursive((qr) => {
        return qr
          .from(Employee)
          .where((e) => [expr.eq(e.managerId, e.self![0].id)])
          .select((e) => ({
            id: e.id,
            name: e.name,
            managerId: e.managerId,
            depth: expr.raw("number")`${e.self![0].depth} + 1`.n,
          }));
      })
      .select((s) => ({
        id: s.id,
        name: s.name,
        managerId: s.managerId,
        depth: s.depth,
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: "T2",
        with: {
          name: "T2",
          base: {
            type: "select",
            as: "T1",
            from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
            where: [
              {
                type: "eq",
                source: { type: "column", path: ["T1", "managerId"] },
                target: { type: "value", value: 1 },
              },
            ],
            select: {
              id: { type: "column", path: ["T1", "id"] },
              name: { type: "column", path: ["T1", "name"] },
              managerId: { type: "column", path: ["T1", "managerId"] },
              depth: { type: "value", value: 1 },
            },
          },
          recursive: {
            type: "select",
            as: "T2",
            from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
            joins: [
              {
                type: "select",
                as: "T2.self",
                from: "T2",
                isSingle: false,
              },
            ],
            where: [
              {
                type: "eq",
                source: { type: "column", path: ["T2", "managerId"] },
                target: { type: "column", path: ["T2.self", "id"] },
              },
            ],
            select: {
              id: { type: "column", path: ["T2", "id"] },
              name: { type: "column", path: ["T2", "name"] },
              managerId: { type: "column", path: ["T2", "managerId"] },
              depth: {
                type: "raw",
                sql: "$1 + 1",
                params: [{ type: "column", path: ["T2.self", "depth"] }],
              },
            },
          },
        },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          name: { type: "column", path: ["T1", "name"] },
          managerId: { type: "column", path: ["T1", "managerId"] },
          depth: { type: "column", path: ["T1", "depth"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.basicSubordinates[dialect]);
    });
  });

  describe("depth 제한: recursive WHERE에서 depth 체크", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .where((e) => [expr.eq(e.managerId, 1)])
      .select((e) => ({
        id: e.id,
        name: e.name,
        depth: expr.val("number", 1),
      }))
      .recursive((qr) =>
        qr
          .from(Employee)
          .where((e) => [expr.eq(e.managerId, e.self![0].id), expr.lt(e.self![0].depth, 3)])
          .select((e) => ({
            id: e.id,
            name: e.name,
            depth: expr.raw("number")`${e.self![0].depth} + 1`.n,
          })),
      )
      .select((s) => ({
        id: s.id,
        name: s.name,
        depth: s.depth,
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: "T2",
        with: {
          name: "T2",
          base: {
            type: "select",
            as: "T1",
            from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
            where: [
              {
                type: "eq",
                source: { type: "column", path: ["T1", "managerId"] },
                target: { type: "value", value: 1 },
              },
            ],
            select: {
              id: { type: "column", path: ["T1", "id"] },
              name: { type: "column", path: ["T1", "name"] },
              depth: { type: "value", value: 1 },
            },
          },
          recursive: {
            type: "select",
            as: "T2",
            from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
            joins: [
              {
                type: "select",
                as: "T2.self",
                from: "T2",
                isSingle: false,
              },
            ],
            where: [
              {
                type: "eq",
                source: { type: "column", path: ["T2", "managerId"] },
                target: { type: "column", path: ["T2.self", "id"] },
              },
              {
                type: "lt",
                source: { type: "column", path: ["T2.self", "depth"] },
                target: { type: "value", value: 3 },
              },
            ],
            select: {
              id: { type: "column", path: ["T2", "id"] },
              name: { type: "column", path: ["T2", "name"] },
              depth: {
                type: "raw",
                sql: "$1 + 1",
                params: [{ type: "column", path: ["T2.self", "depth"] }],
              },
            },
          },
        },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          name: { type: "column", path: ["T1", "name"] },
          depth: { type: "column", path: ["T1", "depth"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.depthLimit[dialect]);
    });
  });

  describe("상위 탐색: 특정 직원의 모든 상위 매니저 조회", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .where((e) => [expr.eq(e.id, 100)])
      .select((e) => ({
        id: e.id,
        name: e.name,
        managerId: e.managerId,
        level: expr.val("number", 0),
      }))
      .recursive((qr) =>
        qr
          .from(Employee)
          .where((e) => [expr.eq(e.id, e.self![0].managerId)])
          .select((e) => ({
            id: e.id,
            name: e.name,
            managerId: e.managerId,
            level: expr.raw("number")`${e.self![0].level} - 1`.n,
          })),
      )
      .select((s) => ({
        id: s.id,
        name: s.name,
        level: s.level,
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: "T2",
        with: {
          name: "T2",
          base: {
            type: "select",
            as: "T1",
            from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
            where: [
              {
                type: "eq",
                source: { type: "column", path: ["T1", "id"] },
                target: { type: "value", value: 100 },
              },
            ],
            select: {
              id: { type: "column", path: ["T1", "id"] },
              name: { type: "column", path: ["T1", "name"] },
              managerId: { type: "column", path: ["T1", "managerId"] },
              level: { type: "value", value: 0 },
            },
          },
          recursive: {
            type: "select",
            as: "T2",
            from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
            joins: [
              {
                type: "select",
                as: "T2.self",
                from: "T2",
                isSingle: false,
              },
            ],
            where: [
              {
                type: "eq",
                source: { type: "column", path: ["T2", "id"] },
                target: { type: "column", path: ["T2.self", "managerId"] },
              },
            ],
            select: {
              id: { type: "column", path: ["T2", "id"] },
              name: { type: "column", path: ["T2", "name"] },
              managerId: { type: "column", path: ["T2", "managerId"] },
              level: {
                type: "raw",
                sql: "$1 - 1",
                params: [{ type: "column", path: ["T2.self", "level"] }],
              },
            },
          },
        },
        select: {
          id: { type: "column", path: ["T1", "id"] },
          name: { type: "column", path: ["T1", "name"] },
          level: { type: "column", path: ["T1", "level"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.upwardManagers[dialect]);
    });
  });

  describe("CTE 결과에 orderBy 적용", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .where((e) => [expr.eq(e.managerId, 1)])
      .select((e) => ({
        id: e.id,
        name: e.name,
        depth: expr.val("number", 1),
      }))
      .recursive((qr) =>
        qr
          .from(Employee)
          .where((e) => [expr.eq(e.managerId, e.self![0].id)])
          .select((e) => ({
            id: e.id,
            name: e.name,
            depth: expr.raw("number")`${e.self![0].depth} + 1`.n,
          })),
      )
      .orderBy((s) => s.depth, "ASC")
      .orderBy((s) => s.name, "ASC")
      .select((s) => ({
        id: s.id,
        name: s.name,
        depth: s.depth,
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: "T2",
        with: {
          name: "T2",
          base: {
            type: "select",
            as: "T1",
            from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
            where: [
              {
                type: "eq",
                source: { type: "column", path: ["T1", "managerId"] },
                target: { type: "value", value: 1 },
              },
            ],
            select: {
              id: { type: "column", path: ["T1", "id"] },
              name: { type: "column", path: ["T1", "name"] },
              depth: { type: "value", value: 1 },
            },
          },
          recursive: {
            type: "select",
            as: "T2",
            from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
            joins: [
              {
                type: "select",
                as: "T2.self",
                from: "T2",
                isSingle: false,
              },
            ],
            where: [
              {
                type: "eq",
                source: { type: "column", path: ["T2", "managerId"] },
                target: { type: "column", path: ["T2.self", "id"] },
              },
            ],
            select: {
              id: { type: "column", path: ["T2", "id"] },
              name: { type: "column", path: ["T2", "name"] },
              depth: {
                type: "raw",
                sql: "$1 + 1",
                params: [{ type: "column", path: ["T2.self", "depth"] }],
              },
            },
          },
        },
        orderBy: [
          [{ type: "column", path: ["T1", "depth"] }, "ASC"],
          [{ type: "column", path: ["T1", "name"] }, "ASC"],
        ],
        select: {
          id: { type: "column", path: ["T1", "id"] },
          name: { type: "column", path: ["T1", "name"] },
          depth: { type: "column", path: ["T1", "depth"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.cteWithOrderBy[dialect]);
    });
  });

  describe("CTE 결과에 where 적용", () => {
    const db = createTestDb();
    const def = db
      .employee()
      .where((e) => [expr.eq(e.managerId, 1)])
      .select((e) => ({
        id: e.id,
        name: e.name,
        depth: expr.val("number", 1),
      }))
      .recursive((qr) =>
        qr
          .from(Employee)
          .where((e) => [expr.eq(e.managerId, e.self![0].id)])
          .select((e) => ({
            id: e.id,
            name: e.name,
            depth: expr.raw("number")`${e.self![0].depth} + 1`.n,
          })),
      )
      .where((s) => [expr.gt(s.depth, 1)])
      .select((s) => ({
        id: s.id,
        name: s.name,
        depth: s.depth,
      }))
      .getSelectQueryDef();

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "select",
        as: "T1",
        from: "T2",
        with: {
          name: "T2",
          base: {
            type: "select",
            as: "T1",
            from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
            where: [
              {
                type: "eq",
                source: { type: "column", path: ["T1", "managerId"] },
                target: { type: "value", value: 1 },
              },
            ],
            select: {
              id: { type: "column", path: ["T1", "id"] },
              name: { type: "column", path: ["T1", "name"] },
              depth: { type: "value", value: 1 },
            },
          },
          recursive: {
            type: "select",
            as: "T2",
            from: { database: "TestDb", schema: "TestSchema", name: "Employee" },
            joins: [
              {
                type: "select",
                as: "T2.self",
                from: "T2",
                isSingle: false,
              },
            ],
            where: [
              {
                type: "eq",
                source: { type: "column", path: ["T2", "managerId"] },
                target: { type: "column", path: ["T2.self", "id"] },
              },
            ],
            select: {
              id: { type: "column", path: ["T2", "id"] },
              name: { type: "column", path: ["T2", "name"] },
              depth: {
                type: "raw",
                sql: "$1 + 1",
                params: [{ type: "column", path: ["T2.self", "depth"] }],
              },
            },
          },
        },
        where: [
          {
            type: "gt",
            source: { type: "column", path: ["T1", "depth"] },
            target: { type: "value", value: 1 },
          },
        ],
        select: {
          id: { type: "column", path: ["T1", "id"] },
          name: { type: "column", path: ["T1", "name"] },
          depth: { type: "column", path: ["T1", "depth"] },
        },
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.cteWithWhere[dialect]);
    });
  });
});
