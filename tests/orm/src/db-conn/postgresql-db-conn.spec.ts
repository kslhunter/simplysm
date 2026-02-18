import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgresqlDbConn } from "@simplysm/orm-node";
import { postgresqlConfig } from "../test-configs";
import type { ColumnMeta } from "@simplysm/orm-common";
import { DateTime, DateOnly, Uuid } from "@simplysm/core-common";

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
      await conn.close();
    }
  });

  describe("연결", () => {
    it("연결 성공", async () => {
      await conn.connect();
      expect(conn.isConnected).toBe(true);
    });

    it("중복 연결 시 에러", async () => {
      await expect(conn.connect()).rejects.toThrow("이미 'Connection'이 연결되어있습니다.");
    });

    it("연결 종료", async () => {
      await conn.close();
      expect(conn.isConnected).toBe(false);
    });
  });

  describe("쿼리 실행", () => {
    beforeAll(async () => {
      conn = new PostgresqlDbConn(pg, pgCopyFrom, postgresqlConfig);
      await conn.connect();

      // 테스트 테이블 생성
      await conn.execute([
        `DROP TABLE IF EXISTS "TestTable"`,
        `CREATE TABLE "TestTable" (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100),
          value INT
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.execute([`DROP TABLE IF EXISTS "TestTable"`]);
      await conn.close();
    });

    it("INSERT 및 SELECT", async () => {
      await conn.execute([`INSERT INTO "TestTable" (name, value) VALUES ('test', 123)`]);

      const results = await conn.execute([`SELECT * FROM "TestTable" WHERE name = 'test'`]);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
    });

    it("파라미터화된 쿼리", async () => {
      const results = await conn.executeParametrized(`SELECT * FROM "TestTable" WHERE name = $1`, [
        "test",
      ]);

      expect(results).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
    });

    it("파라미터화된 쿼리 - 숫자 타입", async () => {
      const results = await conn.executeParametrized(
        `SELECT * FROM "TestTable" WHERE value = $1`,
        [123],
      );

      expect(results).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ value: 123 });
    });

    it("파라미터화된 쿼리 - 여러 파라미터", async () => {
      const results = await conn.executeParametrized(
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
      await expect(disconnectedConn.execute(["SELECT 1"])).rejects.toThrow(
        "'Connection'이 연결되어있지 않습니다",
      );
    });

    it("잘못된 쿼리 실행 시 에러", async () => {
      const tempConn = new PostgresqlDbConn(pg, pgCopyFrom, postgresqlConfig);
      await tempConn.connect();

      try {
        await expect(tempConn.execute(["SELECT * FROM nonexistent_table_xyz"])).rejects.toThrow();
      } finally {
        await tempConn.close();
      }
    });
  });

  describe("트랜잭션", () => {
    beforeAll(async () => {
      conn = new PostgresqlDbConn(pg, pgCopyFrom, postgresqlConfig);
      await conn.connect();

      await conn.execute([
        `DROP TABLE IF EXISTS "TxTable"`,
        `CREATE TABLE "TxTable" (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100)
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.execute([`DROP TABLE IF EXISTS "TxTable"`]);
      await conn.close();
    });

    it("커밋", async () => {
      await conn.beginTransaction();
      expect(conn.isOnTransaction).toBe(true);

      await conn.execute([`INSERT INTO "TxTable" (name) VALUES ('commit-test')`]);
      await conn.commitTransaction();
      expect(conn.isOnTransaction).toBe(false);

      const results = await conn.execute([`SELECT * FROM "TxTable" WHERE name = 'commit-test'`]);
      expect(results[0]).toHaveLength(1);
    });

    it("롤백", async () => {
      await conn.beginTransaction();

      await conn.execute([`INSERT INTO "TxTable" (name) VALUES ('rollback-test')`]);
      await conn.rollbackTransaction();
      expect(conn.isOnTransaction).toBe(false);

      const results = await conn.execute([`SELECT * FROM "TxTable" WHERE name = 'rollback-test'`]);
      expect(results[0]).toHaveLength(0);
    });
  });

  describe("bulkInsert", () => {
    beforeAll(async () => {
      conn = new PostgresqlDbConn(pg, pgCopyFrom, postgresqlConfig);
      await conn.connect();

      await conn.execute([
        `DROP TABLE IF EXISTS "BulkTable"`,
        `CREATE TABLE "BulkTable" (
          id INT,
          name VARCHAR(100),
          value DOUBLE PRECISION
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.execute([`DROP TABLE IF EXISTS "BulkTable"`]);
      await conn.close();
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

      await conn.bulkInsert('"BulkTable"', columnMetas, records);

      const results = await conn.execute([`SELECT * FROM "BulkTable" ORDER BY id`]);

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
      await expect(conn.bulkInsert('"BulkTable"', columnMetas, [])).resolves.toBeUndefined();
    });

    it("특수 문자 포함 데이터 INSERT", async () => {
      await conn.execute([`DELETE FROM "BulkTable"`]);

      const columnMetas: Record<string, ColumnMeta> = {
        id: { type: "number", dataType: { type: "int" } },
        name: { type: "string", dataType: { type: "varchar", length: 100 } },
        value: { type: "number", dataType: { type: "double" } },
      };

      const records = [
        { id: 10, name: 'quote"here', value: 1.0 },
        { id: 11, name: "comma,here", value: 2.0 },
        { id: 12, name: "new\nline", value: 3.0 },
      ];

      await conn.bulkInsert('"BulkTable"', columnMetas, records);

      const results = await conn.execute([`SELECT * FROM "BulkTable" WHERE id >= 10 ORDER BY id`]);

      expect(results[0]).toHaveLength(3);
      expect((results[0][0] as { name: string }).name).toBe('quote"here');
      expect((results[0][1] as { name: string }).name).toBe("comma,here");
      expect((results[0][2] as { name: string }).name).toBe("new\nline");
    });
  });

  describe("다양한 타입 테스트", () => {
    beforeAll(async () => {
      conn = new PostgresqlDbConn(pg, pgCopyFrom, postgresqlConfig);
      await conn.connect();

      await conn.execute([
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
      await conn.execute([`DROP TABLE IF EXISTS "TypeTable"`]);
      await conn.close();
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

      await conn.bulkInsert('"TypeTable"', columnMetas, records);

      const results = await conn.execute([`SELECT * FROM "TypeTable" ORDER BY id`]);

      expect(results[0]).toHaveLength(2);
      expect((results[0][0] as Record<string, unknown>)["bool_val"]).toBe(true);
      expect((results[0][0] as Record<string, unknown>)["int_val"]).toBe(42);
      expect((results[0][1] as Record<string, unknown>)["bool_val"]).toBe(false);
      expect((results[0][1] as Record<string, unknown>)["int_val"]).toBe(-100);
    });
  });

  describe("bulkInsert NULL 및 특수 타입 테스트", () => {
    beforeAll(async () => {
      conn = new PostgresqlDbConn(pg, pgCopyFrom, postgresqlConfig);
      await conn.connect();

      await conn.execute([
        `DROP TABLE IF EXISTS "NullableTable"`,
        `CREATE TABLE "NullableTable" (
          id INT NOT NULL,
          name VARCHAR(100) NULL,
          value INT NULL
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.execute([`DROP TABLE IF EXISTS "NullableTable"`]);
      await conn.close();
    });

    it("bulkInsert - NULL 값 삽입", async () => {
      const columnMetas: Record<string, ColumnMeta> = {
        id: { type: "number", dataType: { type: "int" } },
        name: { type: "string", dataType: { type: "varchar", length: 100 }, nullable: true },
        value: { type: "number", dataType: { type: "int" }, nullable: true },
      };

      const records = [
        { id: 1, name: "test1", value: 100 },
        { id: 2, name: null, value: 200 },
        { id: 3, name: "test3", value: null },
        { id: 4, name: null, value: null },
      ];

      await conn.bulkInsert('"NullableTable"', columnMetas, records);

      const results = await conn.execute([`SELECT * FROM "NullableTable" ORDER BY id`]);

      expect(results[0]).toHaveLength(4);
      expect((results[0][0] as Record<string, unknown>)["name"]).toBe("test1");
      expect((results[0][0] as Record<string, unknown>)["value"]).toBe(100);
      expect((results[0][1] as Record<string, unknown>)["name"]).toBeNull();
      expect((results[0][1] as Record<string, unknown>)["value"]).toBe(200);
      expect((results[0][2] as Record<string, unknown>)["name"]).toBe("test3");
      expect((results[0][2] as Record<string, unknown>)["value"]).toBeNull();
      expect((results[0][3] as Record<string, unknown>)["name"]).toBeNull();
      expect((results[0][3] as Record<string, unknown>)["value"]).toBeNull();
    });
  });

  describe("bulkInsert UUID 및 binary 타입 테스트", () => {
    beforeAll(async () => {
      conn = new PostgresqlDbConn(pg, pgCopyFrom, postgresqlConfig);
      await conn.connect();

      await conn.execute([
        `DROP TABLE IF EXISTS "UuidBinaryTable"`,
        `CREATE TABLE "UuidBinaryTable" (
          id INT NOT NULL,
          uuid_val UUID NOT NULL,
          binary_val BYTEA NOT NULL
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.execute([`DROP TABLE IF EXISTS "UuidBinaryTable"`]);
      await conn.close();
    });

    it("bulkInsert - UUID 및 binary 타입 삽입", async () => {
      const columnMetas: Record<string, ColumnMeta> = {
        id: { type: "number", dataType: { type: "int" } },
        uuid_val: { type: "Uuid", dataType: { type: "uuid" } },
        binary_val: { type: "Bytes", dataType: { type: "binary" } },
      };

      const testUuid1 = Uuid.new();
      const testUuid2 = Uuid.new();
      const testBinary1 = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
      const testBinary2 = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]);

      const records = [
        { id: 1, uuid_val: testUuid1, binary_val: testBinary1 },
        { id: 2, uuid_val: testUuid2, binary_val: testBinary2 },
      ];

      await conn.bulkInsert('"UuidBinaryTable"', columnMetas, records);

      const results = await conn.execute([`SELECT * FROM "UuidBinaryTable" ORDER BY id`]);

      expect(results[0]).toHaveLength(2);
      expect((results[0][0] as Record<string, unknown>)["uuid_val"]).toBe(testUuid1.toString());
      expect((results[0][1] as Record<string, unknown>)["uuid_val"]).toBe(testUuid2.toString());
      // PostgreSQL BYTEA는 Buffer로 반환됨
      expect(
        new Uint8Array((results[0][0] as Record<string, unknown>)["binary_val"] as ArrayBuffer),
      ).toEqual(testBinary1);
      expect(
        new Uint8Array((results[0][1] as Record<string, unknown>)["binary_val"] as ArrayBuffer),
      ).toEqual(testBinary2);
    });
  });

  describe("트랜잭션 격리 수준 테스트", () => {
    beforeAll(async () => {
      conn = new PostgresqlDbConn(pg, pgCopyFrom, postgresqlConfig);
      await conn.connect();

      await conn.execute([
        `DROP TABLE IF EXISTS "IsolationTable"`,
        `CREATE TABLE "IsolationTable" (
          id INT PRIMARY KEY,
          value INT
        )`,
        `INSERT INTO "IsolationTable" (id, value) VALUES (1, 100)`,
      ]);
    });

    afterAll(async () => {
      await conn.execute([`DROP TABLE IF EXISTS "IsolationTable"`]);
      await conn.close();
    });

    it("READ_UNCOMMITTED 격리 수준", async () => {
      // PostgreSQL에서 READ_UNCOMMITTED는 READ_COMMITTED와 동일하게 동작
      await conn.beginTransaction("READ_UNCOMMITTED");
      expect(conn.isOnTransaction).toBe(true);

      await conn.execute([`UPDATE "IsolationTable" SET value = 200 WHERE id = 1`]);
      await conn.rollbackTransaction();
      expect(conn.isOnTransaction).toBe(false);
    });

    it("READ_COMMITTED 격리 수준", async () => {
      await conn.beginTransaction("READ_COMMITTED");
      expect(conn.isOnTransaction).toBe(true);

      await conn.execute([`UPDATE "IsolationTable" SET value = 300 WHERE id = 1`]);
      await conn.commitTransaction();
      expect(conn.isOnTransaction).toBe(false);
    });

    it("REPEATABLE_READ 격리 수준", async () => {
      await conn.beginTransaction("REPEATABLE_READ");
      expect(conn.isOnTransaction).toBe(true);

      const results = await conn.execute([`SELECT * FROM "IsolationTable" WHERE id = 1`]);
      expect(results[0]).toHaveLength(1);

      await conn.rollbackTransaction();
      expect(conn.isOnTransaction).toBe(false);
    });

    it("SERIALIZABLE 격리 수준", async () => {
      await conn.beginTransaction("SERIALIZABLE");
      expect(conn.isOnTransaction).toBe(true);

      const results = await conn.execute([`SELECT * FROM "IsolationTable" WHERE id = 1`]);
      expect(results[0]).toHaveLength(1);

      await conn.commitTransaction();
      expect(conn.isOnTransaction).toBe(false);
    });
  });
});
