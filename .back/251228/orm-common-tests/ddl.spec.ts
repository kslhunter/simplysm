import { describe, expect, it } from "vitest";
import { TDialect } from "../src/types/column-primitive";
import { DIALECTS, TestDbContext } from "./_setup";
import * as expected from "./expected/ddl.expected";

describe("DDL Query Tests", () => {
  // ============================================
  // createDatabase
  // ============================================
  describe("createDatabase", () => {
    it.each(DIALECTS)("[%s] 단순 DB 생성", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const result = db.qb.createDatabase({
        database: "TestDb",
      });
      expect(result).toMatchSql(expected.createDatabase[dialect]);
    });
  });

  // ============================================
  // clearDatabase
  // ============================================
  describe("clearDatabase", () => {
    it.each(DIALECTS)("[%s] DB 내용물 초기화", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const result = db.qb.clearDatabase({
        database: "TestDb",
      });
      expect(result).toMatchSql(expected.clearDatabase[dialect]);
    });
  });

  // ============================================
  // createTable
  // ============================================
  describe("createTable", () => {
    it.each(DIALECTS)("[%s] 기본 테이블 생성 (PK + AUTO_INCREMENT)", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const result = db.qb.createTable({
        table: { database: "TestDb", name: "User" },
        columns: [
          { name: "id", dataType: db.qb.getDataTypeString({ type: "int" }), autoIncrement: true, nullable: false },
          { name: "name", dataType: db.qb.getDataTypeString({ type: "varchar", length: 100 }), nullable: false },
          { name: "email", dataType: db.qb.getDataTypeString({ type: "varchar", length: 255 }), nullable: true },
          { name: "age", dataType: db.qb.getDataTypeString({ type: "int" }), nullable: true, defaultValue: "0" },
        ],
        primaryKeys: [{ columnName: "id", orderBy: "ASC" }],
      });
      expect(result).toMatchSql(expected.createTableBasic[dialect]);
    });

    it.each(DIALECTS)("[%s] 복합 PK 테이블 생성", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const result = db.qb.createTable({
        table: { database: "TestDb", name: "OrderItem" },
        columns: [
          { name: "orderId", dataType: db.qb.getDataTypeString({ type: "int" }), nullable: false },
          { name: "productId", dataType: db.qb.getDataTypeString({ type: "int" }), nullable: false },
          { name: "quantity", dataType: db.qb.getDataTypeString({ type: "int" }), nullable: false },
        ],
        primaryKeys: [
          { columnName: "orderId", orderBy: "ASC" },
          { columnName: "productId", orderBy: "ASC" },
        ],
      });
      expect(result).toMatchSql(expected.createTableCompositePk[dialect]);
    });
  });

  // ============================================
  // createIndex
  // ============================================
  describe("createIndex", () => {
    it.each(DIALECTS)("[%s] 단일 컬럼 인덱스", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const result = db.qb.createIndex({
        table: { database: "TestDb", name: "User" },
        index: {
          name: "IDX_User_email",
          columns: [{ name: "email", orderBy: "ASC", unique: false }],
        },
      });
      expect(result).toMatchSql(expected.createIndexSingle[dialect]);
    });

    it.each(DIALECTS)("[%s] UNIQUE 인덱스", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const result = db.qb.createIndex({
        table: { database: "TestDb", name: "User" },
        index: {
          name: "IDX_User_email_unique",
          columns: [{ name: "email", orderBy: "ASC", unique: true }],
        },
      });
      expect(result).toMatchSql(expected.createIndexUnique[dialect]);
    });

    it.each(DIALECTS)("[%s] 복합 컬럼 인덱스", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const result = db.qb.createIndex({
        table: { database: "TestDb", name: "User" },
        index: {
          name: "IDX_User_name_age",
          columns: [
            { name: "name", orderBy: "ASC", unique: false },
            { name: "age", orderBy: "DESC", unique: false },
          ],
        },
      });
      expect(result).toMatchSql(expected.createIndexComposite[dialect]);
    });
  });

  // ============================================
  // addForeignKey
  // ============================================
  describe("addForeignKey", () => {
    it.each(DIALECTS)("[%s] FK 추가", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const result = db.qb.addForeignKey({
        table: { database: "TestDb", name: "Order" },
        foreignKey: {
          name: "FK_Order_userId",
          fkColumns: ["userId"],
          targetTable: { database: "TestDb", name: "User" },
          targetPkColumns: ["id"],
        },
      });
      expect(result).toMatchSql(expected.addForeignKey[dialect]);
    });
  });

  // ============================================
  // createView
  // ============================================
  describe("createView", () => {
    it.each(DIALECTS)("[%s] 뷰 생성", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const result = db.qb.createView({
        view: { database: "TestDb", name: "ActiveUsers" },
        query: "SELECT * FROM User WHERE isActive = 1",
      });
      expect(result).toMatchSql(expected.createView[dialect]);
    });
  });

  // ============================================
  // createProcedure
  // ============================================
  describe("createProcedure", () => {
    it.each(DIALECTS)("[%s] 프로시저 생성", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const result = db.qb.createProcedure({
        procedure: { database: "TestDb", name: "GetUserCount" },
        query: "SELECT COUNT(*) FROM User",
      });
      expect(result).toMatchSql(expected.createProcedure[dialect]);
    });
  });

  // ============================================
  // executeProcedure
  // ============================================
  describe("executeProcedure", () => {
    it.each(DIALECTS)("[%s] 프로시저 실행", (dialect: TDialect) => {
      const db = new TestDbContext(dialect);
      const result = db.qb.executeProcedure({
        procedure: { database: "TestDb", name: "GetUserCount" },
      });
      expect(result).toMatchSql(expected.executeProcedure[dialect]);
    });
  });
});
