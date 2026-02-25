import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MssqlDbConn, DB_CONN_ERRORS } from "@simplysm/orm-node";
import { mssqlConfig } from "../test-configs";
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

describe("MssqlDbConn", () => {
  let tedious: typeof import("tedious");
  let conn: MssqlDbConn;

  beforeAll(async () => {
    tedious = await import("tedious");
    conn = new MssqlDbConn(tedious, mssqlConfig);
  });

  afterAll(async () => {
    if (conn.isConnected) {
      await conn.close();
    }
  });

  describe("Connection", () => {
    it("Successful connection", async () => {
      const testConn = new MssqlDbConn(tedious, mssqlConfig);
      await testConn.connect();
      expect(testConn.isConnected).toBe(true);
      await testConn.close();
    });

    it("Error on duplicate connection", async () => {
      const testConn = new MssqlDbConn(tedious, mssqlConfig);
      await testConn.connect();
      try {
        await expect(testConn.connect()).rejects.toThrow(DB_CONN_ERRORS.ALREADY_CONNECTED);
      } finally {
        await testConn.close();
      }
    });

    it("Connection close", async () => {
      const testConn = new MssqlDbConn(tedious, mssqlConfig);
      await testConn.connect();
      await testConn.close();
      expect(testConn.isConnected).toBe(false);
    });
  });

  describe("Query execution", () => {
    beforeAll(async () => {
      conn = new MssqlDbConn(tedious, mssqlConfig);
      await conn.connect();

      // Create test table
      await conn.execute([
        `IF OBJECT_ID('TestTable', 'U') IS NOT NULL DROP TABLE [TestTable]`,
        `CREATE TABLE [TestTable] (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(100),
          value INT
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.execute([`IF OBJECT_ID('TestTable', 'U') IS NOT NULL DROP TABLE [TestTable]`]);
      await conn.close();
    });

    it("INSERT and SELECT", async () => {
      await conn.execute([`INSERT INTO [TestTable] (name, value) VALUES ('test', 123)`]);

      const results = await conn.execute([`SELECT * FROM [TestTable] WHERE name = 'test'`]);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
    });

    it("Parameterized query", async () => {
      const results = await conn.executeParametrized(`SELECT * FROM [TestTable] WHERE name = @p0`, [
        "test",
      ]);

      expect(results).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
    });

    it("Parameterized query - numeric type", async () => {
      const results = await conn.executeParametrized(
        `SELECT * FROM [TestTable] WHERE value = @p0`,
        [123],
      );

      expect(results).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ value: 123 });
    });

    it("Parameterized query - multiple parameters", async () => {
      const results = await conn.executeParametrized(
        `SELECT * FROM [TestTable] WHERE name = @p0 AND value = @p1`,
        ["test", 123],
      );

      expect(results).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
    });
  });

  describe("Connection error handling", () => {
    it("Error when executing query on disconnected connection", async () => {
      const disconnectedConn = new MssqlDbConn(tedious, mssqlConfig);
      await expect(disconnectedConn.execute(["SELECT 1"])).rejects.toThrow(
        DB_CONN_ERRORS.NOT_CONNECTED,
      );
    });

    it("Error on invalid query execution", async () => {
      const tempConn = new MssqlDbConn(tedious, mssqlConfig);
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
      conn = new MssqlDbConn(tedious, mssqlConfig);
      await conn.connect();

      await conn.execute([
        `IF OBJECT_ID('TxTable', 'U') IS NOT NULL DROP TABLE [TxTable]`,
        `CREATE TABLE [TxTable] (
          id INT IDENTITY(1,1) PRIMARY KEY,
          name NVARCHAR(100)
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.execute([`IF OBJECT_ID('TxTable', 'U') IS NOT NULL DROP TABLE [TxTable]`]);
      await conn.close();
    });

    it("Commit", async () => {
      await conn.beginTransaction();
      expect(conn.isInTransaction).toBe(true);

      await conn.execute([`INSERT INTO [TxTable] (name) VALUES ('commit-test')`]);
      await conn.commitTransaction();
      expect(conn.isInTransaction).toBe(false);

      const results = await conn.execute([`SELECT * FROM [TxTable] WHERE name = 'commit-test'`]);
      expect(results[0]).toHaveLength(1);
    });

    it("Rollback", async () => {
      await conn.beginTransaction();

      await conn.execute([`INSERT INTO [TxTable] (name) VALUES ('rollback-test')`]);
      await conn.rollbackTransaction();
      expect(conn.isInTransaction).toBe(false);

      const results = await conn.execute([`SELECT * FROM [TxTable] WHERE name = 'rollback-test'`]);
      expect(results[0]).toHaveLength(0);
    });
  });

  describe("bulkInsert", () => {
    beforeAll(async () => {
      conn = new MssqlDbConn(tedious, mssqlConfig);
      await conn.connect();

      await conn.execute([
        `IF OBJECT_ID('BulkTable', 'U') IS NOT NULL DROP TABLE [BulkTable]`,
        `CREATE TABLE [BulkTable] (
          id INT NOT NULL,
          name NVARCHAR(100) NOT NULL,
          value FLOAT NOT NULL
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.execute([`IF OBJECT_ID('BulkTable', 'U') IS NOT NULL DROP TABLE [BulkTable]`]);
      await conn.close();
    });

    it("Bulk INSERT (BulkLoad)", async () => {
      await conn.bulkInsert("[BulkTable]", bulkColumnMetas, bulkRecords);

      const results = await conn.execute([`SELECT * FROM [BulkTable] ORDER BY id`]);

      expect(results[0]).toHaveLength(3);
      expect(results[0][0]).toMatchObject({ id: 1, name: "bulk1" });
      expect(results[0][1]).toMatchObject({ id: 2, name: "bulk2" });
      expect(results[0][2]).toMatchObject({ id: 3, name: "bulk3" });
    });

    it("Empty array INSERT has no effect", async () => {
      // Calling with empty array should complete without error
      await expect(conn.bulkInsert("[BulkTable]", bulkColumnMetas, [])).resolves.toBeUndefined();
    });

    it("INSERT data with special characters", async () => {
      await conn.execute([`DELETE FROM [BulkTable]`]);

      const records = [
        { id: 10, name: "tab\there", value: 1.0 },
        { id: 11, name: "new\nline", value: 2.0 },
        { id: 12, name: 'quote"here', value: 3.0 },
        { id: 13, name: "back\\slash", value: 4.0 },
      ];

      await conn.bulkInsert("[BulkTable]", bulkColumnMetas, records);

      const results = await conn.execute([`SELECT * FROM [BulkTable] WHERE id >= 10 ORDER BY id`]);
      expect(results[0]).toHaveLength(4);
      expect(results[0][0]["name"]).toBe("tab\there");
      expect(results[0][1]["name"]).toBe("new\nline");
      expect(results[0][2]["name"]).toBe('quote"here');
      expect(results[0][3]["name"]).toBe("back\\slash");
    });
  });

  describe("Various type test", () => {
    beforeAll(async () => {
      conn = new MssqlDbConn(tedious, mssqlConfig);
      await conn.connect();

      await conn.execute([
        `IF OBJECT_ID('TypeTable', 'U') IS NOT NULL DROP TABLE [TypeTable]`,
        `CREATE TABLE [TypeTable] (
          id INT IDENTITY(1,1) PRIMARY KEY,
          bool_val BIT NOT NULL,
          int_val INT NOT NULL,
          float_val FLOAT NOT NULL,
          str_val NVARCHAR(100) NOT NULL,
          datetime_val DATETIME2 NOT NULL,
          date_val DATE NOT NULL
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.execute([`IF OBJECT_ID('TypeTable', 'U') IS NOT NULL DROP TABLE [TypeTable]`]);
      await conn.close();
    });

    it("bulkInsert - various types", async () => {
      await conn.bulkInsert("[TypeTable]", typeColumnMetas, typeRecords);

      const results = await conn.execute([`SELECT * FROM [TypeTable] ORDER BY id`]);

      expect(results[0]).toHaveLength(2);
      expect(results[0][0]["bool_val"]).toBe(true);
      expect(results[0][0]["int_val"]).toBe(42);
      expect(results[0][1]["bool_val"]).toBe(false);
      expect(results[0][1]["int_val"]).toBe(-100);
    });
  });

  describe("bulkInsert NULL and special type test", () => {
    beforeAll(async () => {
      conn = new MssqlDbConn(tedious, mssqlConfig);
      await conn.connect();

      await conn.execute([
        `IF OBJECT_ID('NullableTable', 'U') IS NOT NULL DROP TABLE [NullableTable]`,
        `CREATE TABLE [NullableTable] (
          id INT NOT NULL,
          name NVARCHAR(100) NULL,
          value INT NULL
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.execute([
        `IF OBJECT_ID('NullableTable', 'U') IS NOT NULL DROP TABLE [NullableTable]`,
      ]);
      await conn.close();
    });

    it("bulkInsert - insert NULL values", async () => {
      await conn.bulkInsert("[NullableTable]", nullableColumnMetas, nullableRecords);

      const results = await conn.execute([`SELECT * FROM [NullableTable] ORDER BY id`]);

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
      conn = new MssqlDbConn(tedious, mssqlConfig);
      await conn.connect();

      await conn.execute([
        `IF OBJECT_ID('UuidBinaryTable', 'U') IS NOT NULL DROP TABLE [UuidBinaryTable]`,
        `CREATE TABLE [UuidBinaryTable] (
          id INT NOT NULL,
          uuid_val UNIQUEIDENTIFIER NOT NULL,
          binary_val VARBINARY(MAX) NOT NULL
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.execute([
        `IF OBJECT_ID('UuidBinaryTable', 'U') IS NOT NULL DROP TABLE [UuidBinaryTable]`,
      ]);
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

      await conn.bulkInsert("[UuidBinaryTable]", uuidBinaryColumnMetas, records);

      const results = await conn.execute([`SELECT * FROM [UuidBinaryTable] ORDER BY id`]);

      expect(results[0]).toHaveLength(2);
      expect(results[0][0]["uuid_val"]).toBe(testUuid1.toString().toUpperCase());
      expect(results[0][1]["uuid_val"]).toBe(testUuid2.toString().toUpperCase());
      expect(new Uint8Array(results[0][0]["binary_val"] as ArrayBuffer)).toEqual(testBinary1);
      expect(new Uint8Array(results[0][1]["binary_val"] as ArrayBuffer)).toEqual(testBinary2);
    });
  });

  describe("Transaction isolation level test", () => {
    beforeAll(async () => {
      conn = new MssqlDbConn(tedious, mssqlConfig);
      await conn.connect();

      await conn.execute([
        `IF OBJECT_ID('IsolationTable', 'U') IS NOT NULL DROP TABLE [IsolationTable]`,
        `CREATE TABLE [IsolationTable] (
          id INT PRIMARY KEY,
          value INT
        )`,
        `INSERT INTO [IsolationTable] (id, value) VALUES (1, 100)`,
      ]);
    });

    afterAll(async () => {
      await conn.execute([
        `IF OBJECT_ID('IsolationTable', 'U') IS NOT NULL DROP TABLE [IsolationTable]`,
      ]);
      await conn.close();
    });

    it("READ_UNCOMMITTED isolation level", async () => {
      await conn.beginTransaction("READ_UNCOMMITTED");
      expect(conn.isInTransaction).toBe(true);

      await conn.execute([`UPDATE [IsolationTable] SET value = 200 WHERE id = 1`]);
      await conn.rollbackTransaction();
      expect(conn.isInTransaction).toBe(false);
    });

    it("READ_COMMITTED isolation level", async () => {
      await conn.beginTransaction("READ_COMMITTED");
      expect(conn.isInTransaction).toBe(true);

      await conn.execute([`UPDATE [IsolationTable] SET value = 300 WHERE id = 1`]);
      await conn.commitTransaction();
      expect(conn.isInTransaction).toBe(false);
    });

    it("REPEATABLE_READ isolation level", async () => {
      await conn.beginTransaction("REPEATABLE_READ");
      expect(conn.isInTransaction).toBe(true);

      const results = await conn.execute([`SELECT * FROM [IsolationTable] WHERE id = 1`]);
      expect(results[0]).toHaveLength(1);

      await conn.rollbackTransaction();
      expect(conn.isInTransaction).toBe(false);
    });

    it("SERIALIZABLE isolation level", async () => {
      await conn.beginTransaction("SERIALIZABLE");
      expect(conn.isInTransaction).toBe(true);

      const results = await conn.execute([`SELECT * FROM [IsolationTable] WHERE id = 1`]);
      expect(results[0]).toHaveLength(1);

      await conn.commitTransaction();
      expect(conn.isInTransaction).toBe(false);
    });
  });
});
