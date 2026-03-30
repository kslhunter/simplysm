import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { expr } from "../../src/expr/expr";
import { Employee } from "../setup/models/Employee";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./recursive-cte.expected";

describe("SELECT - 재귀 CTE", () => {
  describe("기본: 특정 매니저의 모든 부하직원 선택", () => {
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

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.basicSubordinates[dialect]);
    });
  });

  describe("depth limit: check depth in recursive WHERE", () => {
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

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.depthLimit[dialect]);
    });
  });

  describe("upward search: select all managers above a specific employee", () => {
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

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
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

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
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

    it.each(dialects)("[%s] Verify SQL", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.cteWithWhere[dialect]);
    });
  });
});
