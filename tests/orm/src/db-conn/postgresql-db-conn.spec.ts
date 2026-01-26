import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgresqlDbConn } from "@simplysm/orm-node";
import { postgresqlConfig } from "../test-configs";
import type { ColumnMeta } from "@simplysm/orm-common";
import { DateTime, DateOnly } from "@simplysm/core-common";

describe("PostgresqlDbConn", () => {
  let pg: typeof import("pg");
  let pgCopyFrom: (queryText: string) => import("pg-copy-streams").CopyStreamQuery;
  let conn: PostgresqlDbConn;

  beforeAll(async () => {
    pg = await import("pg");
    const pgCopyStreams = await import("pg-copy-streams");
    pgCopyFrom = pgCopyStreams.from;
    conn = new PostgresqlDbConn(pg, pgCopyFrom, postgresqlConfig);
  });

  afterAll(async () => {
    if (conn.isConnected) {
      await conn.closeAsync();
    }
  });

  describe("연결", () => {
    it("연결 성공", async () => {
      await conn.connectAsync();
      expect(conn.isConnected).toBe(true);
    });

    it("중복 연결 시 에러", async () => {
      await expect(conn.connectAsync()).rejects.toThrow("이미 'Connection'이 연결되어있습니다.");
    });

    it("연결 종료", async () => {
      await conn.closeAsync();
      expect(conn.isConnected).toBe(false);
    });
  });

  describe("쿼리 실행", () => {
    beforeAll(async () => {
      conn = new PostgresqlDbConn(pg, pgCopyFrom, postgresqlConfig);
      await conn.connectAsync();

      // 테스트 테이블 생성
      await conn.executeAsync([
        `DROP TABLE IF EXISTS "TestTable"`,
        `CREATE TABLE "TestTable" (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100),
          value INT
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.executeAsync([`DROP TABLE IF EXISTS "TestTable"`]);
      await conn.closeAsync();
    });

    it("INSERT 및 SELECT", async () => {
      await conn.executeAsync([`INSERT INTO "TestTable" (name, value) VALUES ('test', 123)`]);

      const results = await conn.executeAsync([`SELECT * FROM "TestTable" WHERE name = 'test'`]);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
    });

    it("파라미터화된 쿼리", async () => {
      const results = await conn.executeParametrizedAsync(
        `SELECT * FROM "TestTable" WHERE name = $1`,
        ["test"],
      );

      expect(results).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
    });

    it("파라미터화된 쿼리 - 숫자 타입", async () => {
      const results = await conn.executeParametrizedAsync(
        `SELECT * FROM "TestTable" WHERE value = $1`,
        [123],
      );

      expect(results).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ value: 123 });
    });

    it("파라미터화된 쿼리 - 여러 파라미터", async () => {
      const results = await conn.executeParametrizedAsync(
        `SELECT * FROM "TestTable" WHERE name = $1 AND value = $2`,
        ["test", 123],
      );

      expect(results).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
    });
  });

  describe("연결 오류 처리", () => {
    it("미연결 상태에서 쿼리 실행 시 에러", async () => {
      const disconnectedConn = new PostgresqlDbConn(pg, pgCopyFrom, postgresqlConfig);
      await expect(disconnectedConn.executeAsync(["SELECT 1"])).rejects.toThrow(
        "'Connection'이 연결되어있지 않습니다",
      );
    });

    it("잘못된 쿼리 실행 시 에러", async () => {
      const tempConn = new PostgresqlDbConn(pg, pgCopyFrom, postgresqlConfig);
      await tempConn.connectAsync();

      try {
        await expect(tempConn.executeAsync(["SELECT * FROM nonexistent_table_xyz"])).rejects.toThrow();
      } finally {
        await tempConn.closeAsync();
      }
    });
  });

  describe("트랜잭션", () => {
    beforeAll(async () => {
      conn = new PostgresqlDbConn(pg, pgCopyFrom, postgresqlConfig);
      await conn.connectAsync();

      await conn.executeAsync([
        `DROP TABLE IF EXISTS "TxTable"`,
        `CREATE TABLE "TxTable" (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100)
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.executeAsync([`DROP TABLE IF EXISTS "TxTable"`]);
      await conn.closeAsync();
    });

    it("커밋", async () => {
      await conn.beginTransactionAsync();
      expect(conn.isOnTransaction).toBe(true);

      await conn.executeAsync([`INSERT INTO "TxTable" (name) VALUES ('commit-test')`]);
      await conn.commitTransactionAsync();
      expect(conn.isOnTransaction).toBe(false);

      const results = await conn.executeAsync([`SELECT * FROM "TxTable" WHERE name = 'commit-test'`]);
      expect(results[0]).toHaveLength(1);
    });

    it("롤백", async () => {
      await conn.beginTransactionAsync();

      await conn.executeAsync([`INSERT INTO "TxTable" (name) VALUES ('rollback-test')`]);
      await conn.rollbackTransactionAsync();
      expect(conn.isOnTransaction).toBe(false);

      const results = await conn.executeAsync([`SELECT * FROM "TxTable" WHERE name = 'rollback-test'`]);
      expect(results[0]).toHaveLength(0);
    });
  });

  describe("bulkInsertAsync", () => {
    beforeAll(async () => {
      conn = new PostgresqlDbConn(pg, pgCopyFrom, postgresqlConfig);
      await conn.connectAsync();

      await conn.executeAsync([
        `DROP TABLE IF EXISTS "BulkTable"`,
        `CREATE TABLE "BulkTable" (
          id INT,
          name VARCHAR(100),
          value DOUBLE PRECISION
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.executeAsync([`DROP TABLE IF EXISTS "BulkTable"`]);
      await conn.closeAsync();
    });

    it("대량 INSERT (COPY FROM STDIN)", async () => {
      const columnMetas: Record<string, ColumnMeta> = {
        id: { type: "number", dataType: { type: "int" } },
        name: { type: "string", dataType: { type: "varchar", length: 100 } },
        value: { type: "number", dataType: { type: "double" } },
      };

      const records = [
        { id: 1, name: "bulk1", value: 1.1 },
        { id: 2, name: "bulk2", value: 2.2 },
        { id: 3, name: "bulk3", value: 3.3 },
      ];

      await conn.bulkInsertAsync('"BulkTable"', columnMetas, records);

      const results = await conn.executeAsync([`SELECT * FROM "BulkTable" ORDER BY id`]);

      expect(results[0]).toHaveLength(3);
      expect(results[0][0]).toMatchObject({ id: 1, name: "bulk1" });
      expect(results[0][1]).toMatchObject({ id: 2, name: "bulk2" });
      expect(results[0][2]).toMatchObject({ id: 3, name: "bulk3" });
    });

    it("빈 배열 INSERT 시 아무 동작 없음", async () => {
      const columnMetas: Record<string, ColumnMeta> = {
        id: { type: "number", dataType: { type: "int" } },
        name: { type: "string", dataType: { type: "varchar", length: 100 } },
        value: { type: "number", dataType: { type: "double" } },
      };

      // 빈 배열로 호출해도 에러 없이 완료되어야 함
      await expect(conn.bulkInsertAsync('"BulkTable"', columnMetas, [])).resolves.toBeUndefined();
    });

    it("특수 문자 포함 데이터 INSERT", async () => {
      await conn.executeAsync([`DELETE FROM "BulkTable"`]);

      const columnMetas: Record<string, ColumnMeta> = {
        id: { type: "number", dataType: { type: "int" } },
        name: { type: "string", dataType: { type: "varchar", length: 100 } },
        value: { type: "number", dataType: { type: "double" } },
      };

      const records = [
        { id: 10, name: "quote\"here", value: 1.0 },
        { id: 11, name: "comma,here", value: 2.0 },
        { id: 12, name: "new\nline", value: 3.0 },
      ];

      await conn.bulkInsertAsync('"BulkTable"', columnMetas, records);

      const results = await conn.executeAsync([`SELECT * FROM "BulkTable" WHERE id >= 10 ORDER BY id`]);

      expect(results[0]).toHaveLength(3);
      expect((results[0][0] as { name: string }).name).toBe("quote\"here");
      expect((results[0][1] as { name: string }).name).toBe("comma,here");
      expect((results[0][2] as { name: string }).name).toBe("new\nline");
    });
  });

  describe("다양한 타입 테스트", () => {
    beforeAll(async () => {
      conn = new PostgresqlDbConn(pg, pgCopyFrom, postgresqlConfig);
      await conn.connectAsync();

      await conn.executeAsync([
        `DROP TABLE IF EXISTS "TypeTable"`,
        `CREATE TABLE "TypeTable" (
          id SERIAL PRIMARY KEY,
          bool_val BOOLEAN,
          int_val INT,
          float_val DOUBLE PRECISION,
          str_val VARCHAR(100),
          datetime_val TIMESTAMP,
          date_val DATE
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.executeAsync([`DROP TABLE IF EXISTS "TypeTable"`]);
      await conn.closeAsync();
    });

    it("bulkInsert - 다양한 타입", async () => {
      const columnMetas: Record<string, ColumnMeta> = {
        bool_val: { type: "boolean", dataType: { type: "boolean" } },
        int_val: { type: "number", dataType: { type: "int" } },
        float_val: { type: "number", dataType: { type: "double" } },
        str_val: { type: "string", dataType: { type: "varchar", length: 100 } },
        datetime_val: { type: "DateTime", dataType: { type: "datetime" } },
        date_val: { type: "DateOnly", dataType: { type: "date" } },
      };

      const testDate = new DateTime(2024, 6, 15, 10, 30, 45);
      const testDateOnly = new DateOnly(2024, 6, 15);

      const records = [
        {
          bool_val: true,
          int_val: 42,
          float_val: 3.14159,
          str_val: "hello",
          datetime_val: testDate,
          date_val: testDateOnly,
        },
        {
          bool_val: false,
          int_val: -100,
          float_val: -2.5,
          str_val: "world",
          datetime_val: testDate,
          date_val: testDateOnly,
        },
      ];

      await conn.bulkInsertAsync('"TypeTable"', columnMetas, records);

      const results = await conn.executeAsync([`SELECT * FROM "TypeTable" ORDER BY id`]);

      expect(results[0]).toHaveLength(2);
      expect((results[0][0] as Record<string, unknown>)["bool_val"]).toBe(true);
      expect((results[0][0] as Record<string, unknown>)["int_val"]).toBe(42);
      expect((results[0][1] as Record<string, unknown>)["bool_val"]).toBe(false);
      expect((results[0][1] as Record<string, unknown>)["int_val"]).toBe(-100);
    });
  });
});
