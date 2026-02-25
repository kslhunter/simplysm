import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgresqlDbConn, DB_CONN_ERRORS } from "@simplysm/orm-node";
import { postgresqlConfig } from "../test-configs";
import {
  bulkColumnMetas,
  bulkRecords,
  typeColumnMetas,
  typeRecords,
  nullableColumnMetas,
  nullableRecords,
  uuidBinaryColumnMetas,
} from "../test-fixtures";
import { Uuid } from "@simplysm/core-common";

describe("PostgresqlDbConn", () => {
  let pg: typeof import("pg");
  let pgCopyStreams: typeof import("pg-copy-streams");
  let conn: PostgresqlDbConn;

  beforeAll(async () => {
    pg = await import("pg");
    pgCopyStreams = await import("pg-copy-streams");
    conn = new PostgresqlDbConn(pg, pgCopyStreams, postgresqlConfig);
  });

  afterAll(async () => {
    if (conn.isConnected) {
      await conn.close();
    }
  });

  describe("Connection", () => {
    it("Successful connection", async () => {
      const testConn = new PostgresqlDbConn(pg, pgCopyStreams, postgresqlConfig);
      await testConn.connect();
      expect(testConn.isConnected).toBe(true);
      await testConn.close();
    });

    it("Error on duplicate connection", async () => {
      const testConn = new PostgresqlDbConn(pg, pgCopyStreams, postgresqlConfig);
      await testConn.connect();
      try {
        await expect(testConn.connect()).rejects.toThrow(DB_CONN_ERRORS.ALREADY_CONNECTED);
      } finally {
        await testConn.close();
      }
    });

    it("Connection close", async () => {
      const testConn = new PostgresqlDbConn(pg, pgCopyStreams, postgresqlConfig);
      await testConn.connect();
      await testConn.close();
      expect(testConn.isConnected).toBe(false);
    });
  });

  describe("Query execution", () => {
    beforeAll(async () => {
      conn = new PostgresqlDbConn(pg, pgCopyStreams, postgresqlConfig);
      await conn.connect();

      // Create test table
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

    it("INSERT and SELECT", async () => {
      await conn.execute([`INSERT INTO "TestTable" (name, value) VALUES ('test', 123)`]);

      const results = await conn.execute([`SELECT * FROM "TestTable" WHERE name = 'test'`]);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
    });

    it("Parameterized query", async () => {
      const results = await conn.executeParametrized(`SELECT * FROM "TestTable" WHERE name = $1`, [
        "test",
      ]);

      expect(results).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
    });

    it("Parameterized query - numeric type", async () => {
      const results = await conn.executeParametrized(
        `SELECT * FROM "TestTable" WHERE value = $1`,
        [123],
      );

      expect(results).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ value: 123 });
    });

    it("Parameterized query - multiple parameters", async () => {
      const results = await conn.executeParametrized(
        `SELECT * FROM "TestTable" WHERE name = $1 AND value = $2`,
        ["test", 123],
      );

      expect(results).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
    });
  });

  describe("Connection error handling", () => {
    it("Error when executing query on disconnected connection", async () => {
      const disconnectedConn = new PostgresqlDbConn(pg, pgCopyStreams, postgresqlConfig);
      await expect(disconnectedConn.execute(["SELECT 1"])).rejects.toThrow(
        DB_CONN_ERRORS.NOT_CONNECTED,
      );
    });

    it("Error on invalid query execution", async () => {
      const tempConn = new PostgresqlDbConn(pg, pgCopyStreams, postgresqlConfig);
      await tempConn.connect();

      try {
        await expect(tempConn.execute(["SELECT * FROM nonexistent_table_xyz"])).rejects.toThrow();
      } finally {
        await tempConn.close();
      }
    });
  });

  describe("Transaction", () => {
    beforeAll(async () => {
      conn = new PostgresqlDbConn(pg, pgCopyStreams, postgresqlConfig);
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

    it("Commit", async () => {
      await conn.beginTransaction();
      expect(conn.isInTransaction).toBe(true);

      await conn.execute([`INSERT INTO "TxTable" (name) VALUES ('commit-test')`]);
      await conn.commitTransaction();
      expect(conn.isInTransaction).toBe(false);

      const results = await conn.execute([`SELECT * FROM "TxTable" WHERE name = 'commit-test'`]);
      expect(results[0]).toHaveLength(1);
    });

    it("Rollback", async () => {
      await conn.beginTransaction();

      await conn.execute([`INSERT INTO "TxTable" (name) VALUES ('rollback-test')`]);
      await conn.rollbackTransaction();
      expect(conn.isInTransaction).toBe(false);

      const results = await conn.execute([`SELECT * FROM "TxTable" WHERE name = 'rollback-test'`]);
      expect(results[0]).toHaveLength(0);
    });
  });

  describe("bulkInsert", () => {
    beforeAll(async () => {
      conn = new PostgresqlDbConn(pg, pgCopyStreams, postgresqlConfig);
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

    it("Bulk INSERT (COPY FROM STDIN)", async () => {
      await conn.bulkInsert('"BulkTable"', bulkColumnMetas, bulkRecords);

      const results = await conn.execute([`SELECT * FROM "BulkTable" ORDER BY id`]);

      expect(results[0]).toHaveLength(3);
      expect(results[0][0]).toMatchObject({ id: 1, name: "bulk1" });
      expect(results[0][1]).toMatchObject({ id: 2, name: "bulk2" });
      expect(results[0][2]).toMatchObject({ id: 3, name: "bulk3" });
    });

    it("Empty array INSERT has no effect", async () => {
      // Calling with empty array should complete without error
      await expect(conn.bulkInsert('"BulkTable"', bulkColumnMetas, [])).resolves.toBeUndefined();
    });

    it("INSERT data with special characters", async () => {
      await conn.execute([`DELETE FROM "BulkTable"`]);

      const records = [
        { id: 10, name: 'quote"here', value: 1.0 },
        { id: 11, name: "comma,here", value: 2.0 },
        { id: 12, name: "new\nline", value: 3.0 },
      ];

      await conn.bulkInsert('"BulkTable"', bulkColumnMetas, records);

      const results = await conn.execute([`SELECT * FROM "BulkTable" WHERE id >= 10 ORDER BY id`]);

      expect(results[0]).toHaveLength(3);
      expect(results[0][0]["name"]).toBe('quote"here');
      expect(results[0][1]["name"]).toBe("comma,here");
      expect(results[0][2]["name"]).toBe("new\nline");
    });
  });

  describe("Various type test", () => {
    beforeAll(async () => {
      conn = new PostgresqlDbConn(pg, pgCopyStreams, postgresqlConfig);
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

    it("bulkInsert - various types", async () => {
      await conn.bulkInsert('"TypeTable"', typeColumnMetas, typeRecords);

      const results = await conn.execute([`SELECT * FROM "TypeTable" ORDER BY id`]);

      expect(results[0]).toHaveLength(2);
      expect(results[0][0]["bool_val"]).toBe(true);
      expect(results[0][0]["int_val"]).toBe(42);
      expect(results[0][1]["bool_val"]).toBe(false);
      expect(results[0][1]["int_val"]).toBe(-100);
    });
  });

  describe("bulkInsert NULL and special type test", () => {
    beforeAll(async () => {
      conn = new PostgresqlDbConn(pg, pgCopyStreams, postgresqlConfig);
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

    it("bulkInsert - insert NULL values", async () => {
      await conn.bulkInsert('"NullableTable"', nullableColumnMetas, nullableRecords);

      const results = await conn.execute([`SELECT * FROM "NullableTable" ORDER BY id`]);

      expect(results[0]).toHaveLength(4);
      expect(results[0][0]["name"]).toBe("test1");
      expect(results[0][0]["value"]).toBe(100);
      expect(results[0][1]["name"]).toBeNull();
      expect(results[0][1]["value"]).toBe(200);
      expect(results[0][2]["name"]).toBe("test3");
      expect(results[0][2]["value"]).toBeNull();
      expect(results[0][3]["name"]).toBeNull();
      expect(results[0][3]["value"]).toBeNull();
    });
  });

  describe("bulkInsert UUID and binary type test", () => {
    beforeAll(async () => {
      conn = new PostgresqlDbConn(pg, pgCopyStreams, postgresqlConfig);
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

    it("bulkInsert - insert UUID and binary types", async () => {
      const testUuid1 = Uuid.new();
      const testUuid2 = Uuid.new();
      const testBinary1 = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
      const testBinary2 = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]);

      const records = [
        { id: 1, uuid_val: testUuid1, binary_val: testBinary1 },
        { id: 2, uuid_val: testUuid2, binary_val: testBinary2 },
      ];

      await conn.bulkInsert('"UuidBinaryTable"', uuidBinaryColumnMetas, records);

      const results = await conn.execute([`SELECT * FROM "UuidBinaryTable" ORDER BY id`]);

      expect(results[0]).toHaveLength(2);
      expect(results[0][0]["uuid_val"]).toBe(testUuid1.toString());
      expect(results[0][1]["uuid_val"]).toBe(testUuid2.toString());
      // PostgreSQL BYTEA is returned as Buffer
      expect(new Uint8Array(results[0][0]["binary_val"] as ArrayBuffer)).toEqual(testBinary1);
      expect(new Uint8Array(results[0][1]["binary_val"] as ArrayBuffer)).toEqual(testBinary2);
    });
  });

  describe("Transaction isolation level test", () => {
    beforeAll(async () => {
      conn = new PostgresqlDbConn(pg, pgCopyStreams, postgresqlConfig);
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

    it("READ_UNCOMMITTED isolation level", async () => {
      // In PostgreSQL, READ_UNCOMMITTED behaves the same as READ_COMMITTED
      await conn.beginTransaction("READ_UNCOMMITTED");
      expect(conn.isInTransaction).toBe(true);

      await conn.execute([`UPDATE "IsolationTable" SET value = 200 WHERE id = 1`]);
      await conn.rollbackTransaction();
      expect(conn.isInTransaction).toBe(false);
    });

    it("READ_COMMITTED isolation level", async () => {
      await conn.beginTransaction("READ_COMMITTED");
      expect(conn.isInTransaction).toBe(true);

      await conn.execute([`UPDATE "IsolationTable" SET value = 300 WHERE id = 1`]);
      await conn.commitTransaction();
      expect(conn.isInTransaction).toBe(false);
    });

    it("REPEATABLE_READ isolation level", async () => {
      await conn.beginTransaction("REPEATABLE_READ");
      expect(conn.isInTransaction).toBe(true);

      const results = await conn.execute([`SELECT * FROM "IsolationTable" WHERE id = 1`]);
      expect(results[0]).toHaveLength(1);

      await conn.rollbackTransaction();
      expect(conn.isInTransaction).toBe(false);
    });

    it("SERIALIZABLE isolation level", async () => {
      await conn.beginTransaction("SERIALIZABLE");
      expect(conn.isInTransaction).toBe(true);

      const results = await conn.execute([`SELECT * FROM "IsolationTable" WHERE id = 1`]);
      expect(results[0]).toHaveLength(1);

      await conn.commitTransaction();
      expect(conn.isInTransaction).toBe(false);
    });
  });
});
