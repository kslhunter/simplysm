import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MysqlDbConn } from "@simplysm/orm-node";
import { mysqlConfig } from "../test-configs";
import type { ColumnMeta } from "@simplysm/orm-common";

describe("MysqlDbConn", () => {
  let mysql2: typeof import("mysql2/promise");
  let conn: MysqlDbConn;

  beforeAll(async () => {
    mysql2 = await import("mysql2/promise");
    conn = new MysqlDbConn(mysql2, mysqlConfig);
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
      conn = new MysqlDbConn(mysql2, mysqlConfig);
      await conn.connectAsync();

      // 테스트 테이블 생성
      await conn.executeAsync([
        `DROP TABLE IF EXISTS \`TestDb\`.\`TestTable\``,
        `CREATE TABLE \`TestDb\`.\`TestTable\` (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100),
          value INT
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.executeAsync([`DROP TABLE IF EXISTS \`TestDb\`.\`TestTable\``]);
      await conn.closeAsync();
    });

    it("INSERT 및 SELECT", async () => {
      await conn.executeAsync([`INSERT INTO \`TestDb\`.\`TestTable\` (name, value) VALUES ('test', 123)`]);

      const results = await conn.executeAsync([`SELECT * FROM \`TestDb\`.\`TestTable\` WHERE name = 'test'`]);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
    });

    it("파라미터화된 쿼리", async () => {
      const results = await conn.executeParametrizedAsync(
        `SELECT * FROM \`TestDb\`.\`TestTable\` WHERE name = ?`,
        ["test"],
      );

      expect(results).toHaveLength(1);
      expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
    });
  });

  describe("트랜잭션", () => {
    beforeAll(async () => {
      conn = new MysqlDbConn(mysql2, mysqlConfig);
      await conn.connectAsync();

      await conn.executeAsync([
        `DROP TABLE IF EXISTS \`TestDb\`.\`TxTable\``,
        `CREATE TABLE \`TestDb\`.\`TxTable\` (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100)
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.executeAsync([`DROP TABLE IF EXISTS \`TestDb\`.\`TxTable\``]);
      await conn.closeAsync();
    });

    it("커밋", async () => {
      await conn.beginTransactionAsync();
      expect(conn.isOnTransaction).toBe(true);

      await conn.executeAsync([`INSERT INTO \`TestDb\`.\`TxTable\` (name) VALUES ('commit-test')`]);
      await conn.commitTransactionAsync();
      expect(conn.isOnTransaction).toBe(false);

      const results = await conn.executeAsync([
        `SELECT * FROM \`TestDb\`.\`TxTable\` WHERE name = 'commit-test'`,
      ]);
      expect(results[0]).toHaveLength(1);
    });

    it("롤백", async () => {
      await conn.beginTransactionAsync();

      await conn.executeAsync([`INSERT INTO \`TestDb\`.\`TxTable\` (name) VALUES ('rollback-test')`]);
      await conn.rollbackTransactionAsync();
      expect(conn.isOnTransaction).toBe(false);

      const results = await conn.executeAsync([
        `SELECT * FROM \`TestDb\`.\`TxTable\` WHERE name = 'rollback-test'`,
      ]);
      expect(results[0]).toHaveLength(0);
    });
  });

  describe("bulkInsertAsync", () => {
    beforeAll(async () => {
      conn = new MysqlDbConn(mysql2, mysqlConfig);
      await conn.connectAsync();

      await conn.executeAsync([
        `DROP TABLE IF EXISTS \`TestDb\`.\`BulkTable\``,
        `CREATE TABLE \`TestDb\`.\`BulkTable\` (
          id INT,
          name VARCHAR(100),
          value DOUBLE
        )`,
      ]);
    });

    afterAll(async () => {
      await conn.executeAsync([`DROP TABLE IF EXISTS \`TestDb\`.\`BulkTable\``]);
      await conn.closeAsync();
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

      await conn.bulkInsertAsync("`TestDb`.`BulkTable`", columnMetas, records);

      const results = await conn.executeAsync([`SELECT * FROM \`TestDb\`.\`BulkTable\` ORDER BY id`]);

      expect(results[0]).toHaveLength(3);
      expect(results[0][0]).toMatchObject({ id: 1, name: "bulk1" });
      expect(results[0][1]).toMatchObject({ id: 2, name: "bulk2" });
      expect(results[0][2]).toMatchObject({ id: 3, name: "bulk3" });
    });
  });
});
