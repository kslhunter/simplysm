import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MysqlDbConn, DB_CONN_ERRORS } from "@simplysm/orm-node";
import { mysqlConfig } from "../test-configs";
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

describe("MysqlDbConn", () => {
  let mysql2: typeof import("mysql2/promise");
  let conn: MysqlDbConn;

  beforeAll(async () => {
    mysql2 = await import("mysql2/promise");
    conn = new MysqlDbConn(mysql2, mysqlConfig);
  });

  afterAll(async () => {
    if (conn.isConnected) {
      await conn.close();
    }
  });

  describe("Connection", () => {
    it("Successful connection", async () => {
      const testConn = new MysqlDbConn(mysql2, mysqlConfig);
      await testConn.connect();
      expect(testConn.isConnected).toBe(true);
      await testConn.close();
    });

    it("Error on duplicate connection", async () => {
      const testConn = new MysqlDbConn(mysql2, mysqlConfig);
      await testConn.connect();
      try {
        await expect(testConn.connect()).rejects.toThrow(DB_CONN_ERRORS.ALREADY_CONNECTED);
      } finally {
        await testConn.close();
      }
    });

    it("Connection close", async () => {
      const testConn = new MysqlDbConn(mysql2, mysqlConfig);
      await testConn.connect();
      await testConn.close();
      expect(testConn.isConnected).toBe(false);
    });
  });

  describe("Query execution", () => {
    beforeAll(async () => {
      conn = new MysqlDbConn(mysql2, mysqlConfig);
      await conn.connect();

      // Create test table
      await conn.execute([
        `DROP TABLE IF EXISTS \`TestDb\`.\`TestTable\``,
        `CREATE TABLE \`TestDb\`.\`TestTable\` (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100),
          value INT
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.execute([`DROP TABLE IF EXISTS \`TestDb\`.\`TestTable\``]);
      await conn.close();
    });

    it("INSERT and SELECT", async () => {
      await conn.execute([
        `INSERT INTO \`TestDb\`.\`TestTable\` (name, value) VALUES ('test', 123)`,
      ]);

      const results = await conn.execute([
        `SELECT * FROM \`TestDb\`.\`TestTable\` WHERE name = 'test'`,
      ]);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
    });

    it("Parameterized query", async () => {
      const results = await conn.executeParametrized(
        `SELECT * FROM \`TestDb\`.\`TestTable\` WHERE name = ?`,
        ["test"],
      );

      expect(results).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
    });

    it("Parameterized query - numeric type", async () => {
      const results = await conn.executeParametrized(
        `SELECT * FROM \`TestDb\`.\`TestTable\` WHERE value = ?`,
        [123],
      );

      expect(results).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ value: 123 });
    });

    it("Parameterized query - multiple parameters", async () => {
      const results = await conn.executeParametrized(
        `SELECT * FROM \`TestDb\`.\`TestTable\` WHERE name = ? AND value = ?`,
        ["test", 123],
      );

      expect(results).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
    });
  });

  describe("Connection error handling", () => {
    it("Error when executing query on disconnected connection", async () => {
      const disconnectedConn = new MysqlDbConn(mysql2, mysqlConfig);
      await expect(disconnectedConn.execute(["SELECT 1"])).rejects.toThrow(
        DB_CONN_ERRORS.NOT_CONNECTED,
      );
    });

    it("Error on invalid query execution", async () => {
      const tempConn = new MysqlDbConn(mysql2, mysqlConfig);
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
      conn = new MysqlDbConn(mysql2, mysqlConfig);
      await conn.connect();

      await conn.execute([
        `DROP TABLE IF EXISTS \`TestDb\`.\`TxTable\``,
        `CREATE TABLE \`TestDb\`.\`TxTable\` (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100)
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.execute([`DROP TABLE IF EXISTS \`TestDb\`.\`TxTable\``]);
      await conn.close();
    });

    it("Commit", async () => {
      await conn.beginTransaction();
      expect(conn.isInTransaction).toBe(true);

      await conn.execute([`INSERT INTO \`TestDb\`.\`TxTable\` (name) VALUES ('commit-test')`]);
      await conn.commitTransaction();
      expect(conn.isInTransaction).toBe(false);

      const results = await conn.execute([
        `SELECT * FROM \`TestDb\`.\`TxTable\` WHERE name = 'commit-test'`,
      ]);
      expect(results[0]).toHaveLength(1);
    });

    it("Rollback", async () => {
      await conn.beginTransaction();

      await conn.execute([`INSERT INTO \`TestDb\`.\`TxTable\` (name) VALUES ('rollback-test')`]);
      await conn.rollbackTransaction();
      expect(conn.isInTransaction).toBe(false);

      const results = await conn.execute([
        `SELECT * FROM \`TestDb\`.\`TxTable\` WHERE name = 'rollback-test'`,
      ]);
      expect(results[0]).toHaveLength(0);
    });
  });

  describe("bulkInsert", () => {
    beforeAll(async () => {
      conn = new MysqlDbConn(mysql2, mysqlConfig);
      await conn.connect();

      await conn.execute([
        `DROP TABLE IF EXISTS \`TestDb\`.\`BulkTable\``,
        `CREATE TABLE \`TestDb\`.\`BulkTable\` (
          id INT,
          name VARCHAR(100),
          value DOUBLE
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.execute([`DROP TABLE IF EXISTS \`TestDb\`.\`BulkTable\``]);
      await conn.close();
    });

    it("Bulk INSERT (LOAD DATA INFILE)", async () => {
      await conn.bulkInsert("`TestDb`.`BulkTable`", bulkColumnMetas, bulkRecords);

      const results = await conn.execute([`SELECT * FROM \`TestDb\`.\`BulkTable\` ORDER BY id`]);

      expect(results[0]).toHaveLength(3);
      expect(results[0][0]).toMatchObject({ id: 1, name: "bulk1" });
      expect(results[0][1]).toMatchObject({ id: 2, name: "bulk2" });
      expect(results[0][2]).toMatchObject({ id: 3, name: "bulk3" });
    });

    it("Empty array INSERT has no effect", async () => {
      // Calling with empty array should complete without error
      await expect(
        conn.bulkInsert("`TestDb`.`BulkTable`", bulkColumnMetas, []),
      ).resolves.toBeUndefined();
    });

    it("INSERT data with special characters", async () => {
      await conn.execute([`DELETE FROM \`TestDb\`.\`BulkTable\``]);

      const records = [
        { id: 10, name: "tab\there", value: 1.0 },
        { id: 11, name: "new\nline", value: 2.0 },
        { id: 12, name: "back\\slash", value: 3.0 },
      ];

      await conn.bulkInsert("`TestDb`.`BulkTable`", bulkColumnMetas, records);

      const results = await conn.execute([
        `SELECT * FROM \`TestDb\`.\`BulkTable\` WHERE id >= 10 ORDER BY id`,
      ]);

      expect(results[0]).toHaveLength(3);
      expect(results[0][0]["name"]).toBe("tab\there");
      expect(results[0][1]["name"]).toBe("new\nline");
      expect(results[0][2]["name"]).toBe("back\\slash");
    });
  });

  describe("Various type test", () => {
    beforeAll(async () => {
      conn = new MysqlDbConn(mysql2, mysqlConfig);
      await conn.connect();

      await conn.execute([
        `DROP TABLE IF EXISTS \`TestDb\`.\`TypeTable\``,
        `CREATE TABLE \`TestDb\`.\`TypeTable\` (
          id INT AUTO_INCREMENT PRIMARY KEY,
          bool_val TINYINT(1),
          int_val INT,
          float_val DOUBLE,
          str_val VARCHAR(100),
          datetime_val DATETIME(3),
          date_val DATE
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.execute([`DROP TABLE IF EXISTS \`TestDb\`.\`TypeTable\``]);
      await conn.close();
    });

    it("bulkInsert - various types", async () => {
      await conn.bulkInsert("`TestDb`.`TypeTable`", typeColumnMetas, typeRecords);

      const results = await conn.execute([`SELECT * FROM \`TestDb\`.\`TypeTable\` ORDER BY id`]);

      expect(results[0]).toHaveLength(2);
      expect(results[0][0]["bool_val"]).toBe(1);
      expect(results[0][0]["int_val"]).toBe(42);
      expect(results[0][1]["bool_val"]).toBe(0);
      expect(results[0][1]["int_val"]).toBe(-100);
    });
  });

  describe("bulkInsert NULL and special type test", () => {
    beforeAll(async () => {
      conn = new MysqlDbConn(mysql2, mysqlConfig);
      await conn.connect();

      await conn.execute([
        `DROP TABLE IF EXISTS \`TestDb\`.\`NullableTable\``,
        `CREATE TABLE \`TestDb\`.\`NullableTable\` (
          id INT NOT NULL,
          name VARCHAR(100) NULL,
          value INT NULL
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.execute([`DROP TABLE IF EXISTS \`TestDb\`.\`NullableTable\``]);
      await conn.close();
    });

    it("bulkInsert - insert NULL values", async () => {
      await conn.bulkInsert("`TestDb`.`NullableTable`", nullableColumnMetas, nullableRecords);

      const results = await conn.execute([
        `SELECT * FROM \`TestDb\`.\`NullableTable\` ORDER BY id`,
      ]);

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
      conn = new MysqlDbConn(mysql2, mysqlConfig);
      await conn.connect();

      await conn.execute([
        `DROP TABLE IF EXISTS \`TestDb\`.\`UuidBinaryTable\``,
        `CREATE TABLE \`TestDb\`.\`UuidBinaryTable\` (
          id INT NOT NULL,
          uuid_val BINARY(16) NOT NULL,
          binary_val VARBINARY(255) NOT NULL
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.execute([`DROP TABLE IF EXISTS \`TestDb\`.\`UuidBinaryTable\``]);
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

      await conn.bulkInsert("`TestDb`.`UuidBinaryTable`", uuidBinaryColumnMetas, records);

      const results = await conn.execute([
        `SELECT *, HEX(uuid_val) as uuid_hex, HEX(binary_val) as binary_hex FROM \`TestDb\`.\`UuidBinaryTable\` ORDER BY id`,
      ]);

      expect(results[0]).toHaveLength(2);
      // MySQL stores UUID as BINARY(16), so compare with HEX conversion result
      const expectedUuid1Hex = testUuid1.toString().replace(/-/g, "").toUpperCase();
      const expectedUuid2Hex = testUuid2.toString().replace(/-/g, "").toUpperCase();
      expect(results[0][0]["uuid_hex"]).toBe(expectedUuid1Hex);
      expect(results[0][1]["uuid_hex"]).toBe(expectedUuid2Hex);
      expect(results[0][0]["binary_hex"]).toBe("01020304");
      expect(results[0][1]["binary_hex"]).toBe("AABBCCDDEEFF");
    });
  });

  describe("Transaction isolation level test", () => {
    beforeAll(async () => {
      conn = new MysqlDbConn(mysql2, mysqlConfig);
      await conn.connect();

      await conn.execute([
        `DROP TABLE IF EXISTS \`TestDb\`.\`IsolationTable\``,
        `CREATE TABLE \`TestDb\`.\`IsolationTable\` (
          id INT PRIMARY KEY,
          value INT
        ) ENGINE=InnoDB`,
        `INSERT INTO \`TestDb\`.\`IsolationTable\` (id, value) VALUES (1, 100)`,
      ]);
    });

    afterAll(async () => {
      await conn.execute([`DROP TABLE IF EXISTS \`TestDb\`.\`IsolationTable\``]);
      await conn.close();
    });

    it("READ_UNCOMMITTED isolation level", async () => {
      await conn.beginTransaction("READ_UNCOMMITTED");
      expect(conn.isInTransaction).toBe(true);

      await conn.execute([`UPDATE \`TestDb\`.\`IsolationTable\` SET value = 200 WHERE id = 1`]);
      await conn.rollbackTransaction();
      expect(conn.isInTransaction).toBe(false);
    });

    it("READ_COMMITTED isolation level", async () => {
      await conn.beginTransaction("READ_COMMITTED");
      expect(conn.isInTransaction).toBe(true);

      await conn.execute([`UPDATE \`TestDb\`.\`IsolationTable\` SET value = 300 WHERE id = 1`]);
      await conn.commitTransaction();
      expect(conn.isInTransaction).toBe(false);
    });

    it("REPEATABLE_READ isolation level", async () => {
      await conn.beginTransaction("REPEATABLE_READ");
      expect(conn.isInTransaction).toBe(true);

      const results = await conn.execute([
        `SELECT * FROM \`TestDb\`.\`IsolationTable\` WHERE id = 1`,
      ]);
      expect(results[0]).toHaveLength(1);

      await conn.rollbackTransaction();
      expect(conn.isInTransaction).toBe(false);
    });

    it("SERIALIZABLE isolation level", async () => {
      await conn.beginTransaction("SERIALIZABLE");
      expect(conn.isInTransaction).toBe(true);

      const results = await conn.execute([
        `SELECT * FROM \`TestDb\`.\`IsolationTable\` WHERE id = 1`,
      ]);
      expect(results[0]).toHaveLength(1);

      await conn.commitTransaction();
      expect(conn.isInTransaction).toBe(false);
    });
  });
});
