import { describe, expect, it } from "vitest";
import { createTestDb } from "../setup/TestDbContext";
import { Procedure } from "../../src/schema/procedure-builder";
import { createQueryBuilder } from "../../src/query-builder/query-builder";
import { dialects } from "../setup/test-utils";
import "../setup/test-utils"; // toMatchSql matcher
import * as expected from "./procedure-builder.expected";

describe("DDL - Procedure Builder", () => {
  describe("기본 프로시저 (이름만)", () => {
    const proc = Procedure("TestProc");

    it("메타 데이터 검증", () => {
      expect(proc.meta).toEqual({
        name: "TestProc",
        description: undefined,
        database: undefined,
        schema: undefined,
        params: undefined,
        returns: undefined,
        query: undefined,
      });
    });
  });

  describe("description 지정", () => {
    const proc = Procedure("TestProc").description("테스트 프로시저");

    it("메타 데이터 검증", () => {
      expect(proc.meta).toEqual({
        name: "TestProc",
        description: "테스트 프로시저",
        database: undefined,
        schema: undefined,
        params: undefined,
        returns: undefined,
        query: undefined,
      });
    });
  });

  describe("database 지정", () => {
    const proc = Procedure("TestProc").database("CustomDb");

    it("메타 데이터 검증", () => {
      expect(proc.meta).toEqual({
        name: "TestProc",
        description: undefined,
        database: "CustomDb",
        schema: undefined,
        params: undefined,
        returns: undefined,
        query: undefined,
      });
    });
  });

  describe("schema 지정", () => {
    const proc = Procedure("TestProc").schema("CustomSchema");

    it("메타 데이터 검증", () => {
      expect(proc.meta).toEqual({
        name: "TestProc",
        description: undefined,
        database: undefined,
        schema: "CustomSchema",
        params: undefined,
        returns: undefined,
        query: undefined,
      });
    });
  });

  describe("params 지정 (단일 파라미터)", () => {
    const proc = Procedure("TestProc").params((c) => ({ id: c.bigint() }));

    it("메타 데이터 검증", () => {
      expect(proc.meta.name).toBe("TestProc");
      expect(proc.meta.params).toBeDefined();
      expect(Object.keys(proc.meta.params!)).toEqual(["id"]);
      expect(proc.meta.params!.id.meta.dataType).toEqual({ type: "bigint" });
    });
  });

  describe("params 지정 (여러 파라미터)", () => {
    const proc = Procedure("TestProc").params((c) => ({
      id: c.bigint(),
      name: c.varchar(100),
      isActive: c.boolean(),
    }));

    it("메타 데이터 검증", () => {
      expect(proc.meta.name).toBe("TestProc");
      expect(proc.meta.params).toBeDefined();
      expect(Object.keys(proc.meta.params!)).toEqual(["id", "name", "isActive"]);
      expect(proc.meta.params!.id.meta.dataType).toEqual({ type: "bigint" });
      expect(proc.meta.params!.name.meta.dataType).toEqual({ type: "varchar", length: 100 });
      expect(proc.meta.params!.isActive.meta.dataType).toEqual({ type: "boolean" });
    });
  });

  describe("returns 지정 (단일 반환)", () => {
    const proc = Procedure("TestProc").returns((c) => ({ id: c.bigint() }));

    it("메타 데이터 검증", () => {
      expect(proc.meta.name).toBe("TestProc");
      expect(proc.meta.returns).toBeDefined();
      expect(Object.keys(proc.meta.returns!)).toEqual(["id"]);
      expect(proc.meta.returns!.id.meta.dataType).toEqual({ type: "bigint" });
    });
  });

  describe("returns 지정 (여러 반환)", () => {
    const proc = Procedure("TestProc").returns((c) => ({
      id: c.bigint(),
      name: c.varchar(100),
      email: c.varchar(200).nullable(),
    }));

    it("메타 데이터 검증", () => {
      expect(proc.meta.name).toBe("TestProc");
      expect(proc.meta.returns).toBeDefined();
      expect(Object.keys(proc.meta.returns!)).toEqual(["id", "name", "email"]);
      expect(proc.meta.returns!.id.meta.dataType).toEqual({ type: "bigint" });
      expect(proc.meta.returns!.name.meta.dataType).toEqual({ type: "varchar", length: 100 });
      expect(proc.meta.returns!.email.meta.dataType).toEqual({ type: "varchar", length: 200 });
      expect(proc.meta.returns!.email.meta.nullable).toBe(true);
    });
  });

  describe("body 지정 + 기본 DDL 생성", () => {
    const proc = Procedure("TestProc")
      .database("TestDb")
      .schema("TestSchema")
      .body("SELECT 1 AS result");

    const db = createTestDb();
    const def = db.getCreateProcQueryDef(proc);

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "createProc",
        procedure: { database: "TestDb", schema: "TestSchema", name: "TestProc" },
        params: undefined,
        returns: undefined,
        query: "SELECT 1 AS result",
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.basicProc[dialect]);
    });
  });

  describe("복합 옵션 (params + returns + body)", () => {
    const GetUserById = Procedure("GetUserById")
      .database("TestDb")
      .schema("TestSchema")
      .description("ID로 사용자 조회")
      .params((c) => ({ userId: c.bigint() }))
      .returns((c) => ({
        id: c.bigint(),
        name: c.varchar(100),
        email: c.varchar(200).nullable(),
      }))
      .body("-- DBMS별 맞는 쿼리 작성 --");

    const db = createTestDb();
    const def = db.getCreateProcQueryDef(GetUserById);

    it("QueryDef 검증", () => {
      expect(def).toEqual({
        type: "createProc",
        procedure: { database: "TestDb", schema: "TestSchema", name: "GetUserById" },
        params: [
          {
            name: "userId",
            dataType: { type: "bigint" },
            nullable: undefined,
            default: undefined,
          },
        ],
        returns: [
          {
            name: "id",
            dataType: { type: "bigint" },
            nullable: undefined,
          },
          {
            name: "name",
            dataType: { type: "varchar", length: 100 },
            nullable: undefined,
          },
          {
            name: "email",
            dataType: { type: "varchar", length: 200 },
            nullable: true,
          },
        ],
        query: "-- DBMS별 맞는 쿼리 작성 --",
      });
    });

    it.each(dialects)("[%s] SQL 검증", (dialect) => {
      const builder = createQueryBuilder(dialect);
      expect(builder.build(def)).toMatchSql(expected.complexProc[dialect]);
    });
  });

  describe("체이닝 메서드 순서", () => {
    // 메서드 체이닝 순서가 달라도 동일한 결과
    const proc1 = Procedure("TestProc")
      .params((c) => ({ id: c.bigint() }))
      .database("TestDb")
      .schema("TestSchema")
      .body("SELECT 1");

    const proc2 = Procedure("TestProc")
      .database("TestDb")
      .schema("TestSchema")
      .params((c) => ({ id: c.bigint() }))
      .body("SELECT 1");

    it("메타 데이터 동일성 검증", () => {
      // params는 객체이므로 깊은 비교 필요
      expect(proc1.meta.name).toBe(proc2.meta.name);
      expect(proc1.meta.database).toBe(proc2.meta.database);
      expect(proc1.meta.schema).toBe(proc2.meta.schema);
      expect(proc1.meta.query).toBe(proc2.meta.query);
      expect(Object.keys(proc1.meta.params!)).toEqual(Object.keys(proc2.meta.params!));
    });
  });
});
