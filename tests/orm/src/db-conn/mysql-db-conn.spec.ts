import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MysqlDbConn } from "@simplysm/orm-node";
import { mysqlConfig } from "../test-configs";
import type { ColumnMeta } from "@simplysm/orm-common";
import { DateTime, DateOnly } from "@simplysm/core-common";

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
      conn = new MysqlDbConn(mysql2, mysqlConfig);
      await conn.connect();

      // 테스트 테이블 생성
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

    it("INSERT 및 SELECT", async () => {
      await conn.execute([`INSERT INTO \`TestDb\`.\`TestTable\` (name, value) VALUES ('test', 123)`]);

      const results = await conn.execute([`SELECT * FROM \`TestDb\`.\`TestTable\` WHERE name = 'test'`]);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
    });

    it("파라미터화된 쿼리", async () => {
      const results = await conn.executeParametrized(
        `SELECT * FROM \`TestDb\`.\`TestTable\` WHERE name = ?`,
        ["test"],
      );

      expect(results).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
    });

    it("파라미터화된 쿼리 - 숫자 타입", async () => {
      const results = await conn.executeParametrized(
        `SELECT * FROM \`TestDb\`.\`TestTable\` WHERE value = ?`,
        [123],
      );

      expect(results).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ value: 123 });
    });

    it("파라미터화된 쿼리 - 여러 파라미터", async () => {
      const results = await conn.executeParametrized(
        `SELECT * FROM \`TestDb\`.\`TestTable\` WHERE name = ? AND value = ?`,
        ["test", 123],
      );

      expect(results).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
    });
  });

  describe("연결 오류 처리", () => {
    it("미연결 상태에서 쿼리 실행 시 에러", async () => {
      const disconnectedConn = new MysqlDbConn(mysql2, mysqlConfig);
      await expect(disconnectedConn.execute(["SELECT 1"])).rejects.toThrow(
        "'Connection'이 연결되어있지 않습니다",
      );
    });

    it("잘못된 쿼리 실행 시 에러", async () => {
      const tempConn = new MysqlDbConn(mysql2, mysqlConfig);
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

    it("커밋", async () => {
      await conn.beginTransaction();
      expect(conn.isOnTransaction).toBe(true);

      await conn.execute([`INSERT INTO \`TestDb\`.\`TxTable\` (name) VALUES ('commit-test')`]);
      await conn.commitTransaction();
      expect(conn.isOnTransaction).toBe(false);

      const results = await conn.execute([
        `SELECT * FROM \`TestDb\`.\`TxTable\` WHERE name = 'commit-test'`,
      ]);
      expect(results[0]).toHaveLength(1);
    });

    it("롤백", async () => {
      await conn.beginTransaction();

      await conn.execute([`INSERT INTO \`TestDb\`.\`TxTable\` (name) VALUES ('rollback-test')`]);
      await conn.rollbackTransaction();
      expect(conn.isOnTransaction).toBe(false);

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

    it("대량 INSERT (LOAD DATA INFILE)", async () => {
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

      await conn.bulkInsert("`TestDb`.`BulkTable`", columnMetas, records);

      const results = await conn.execute([`SELECT * FROM \`TestDb\`.\`BulkTable\` ORDER BY id`]);

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
      await expect(conn.bulkInsert("`TestDb`.`BulkTable`", columnMetas, [])).resolves.toBeUndefined();
    });

    it("특수 문자 포함 데이터 INSERT", async () => {
      await conn.execute([`DELETE FROM \`TestDb\`.\`BulkTable\``]);

      const columnMetas: Record<string, ColumnMeta> = {
        id: { type: "number", dataType: { type: "int" } },
        name: { type: "string", dataType: { type: "varchar", length: 100 } },
        value: { type: "number", dataType: { type: "double" } },
      };

      const records = [
        { id: 10, name: "tab\there", value: 1.0 },
        { id: 11, name: "new\nline", value: 2.0 },
        { id: 12, name: "back\\slash", value: 3.0 },
      ];

      await conn.bulkInsert("`TestDb`.`BulkTable`", columnMetas, records);

      const results = await conn.execute([`SELECT * FROM \`TestDb\`.\`BulkTable\` WHERE id >= 10 ORDER BY id`]);

      expect(results[0]).toHaveLength(3);
      expect((results[0][0] as { name: string }).name).toBe("tab\there");
      expect((results[0][1] as { name: string }).name).toBe("new\nline");
      expect((results[0][2] as { name: string }).name).toBe("back\\slash");
    });
  });

  describe("다양한 타입 테스트", () => {
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

      await conn.bulkInsert("`TestDb`.`TypeTable`", columnMetas, records);

      const results = await conn.execute([`SELECT * FROM \`TestDb\`.\`TypeTable\` ORDER BY id`]);

      expect(results[0]).toHaveLength(2);
      expect((results[0][0] as Record<string, unknown>)["bool_val"]).toBe(1);
      expect((results[0][0] as Record<string, unknown>)["int_val"]).toBe(42);
      expect((results[0][1] as Record<string, unknown>)["bool_val"]).toBe(0);
      expect((results[0][1] as Record<string, unknown>)["int_val"]).toBe(-100);
    });
  });
});
