import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MssqlDbConn, MysqlDbConn, PostgresqlDbConn } from "@simplysm/orm-node";
import { DB_CONN_ERRORS } from "@simplysm/orm-node";
import { mssqlConfig, mysqlConfig, postgresqlConfig } from "../test-configs";
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

// ============================================
// DB-specific definitions
// ============================================

interface DbDialectDef {
  name: string;
  createConn: () => Promise<MssqlDbConn | MysqlDbConn | PostgresqlDbConn>;

  sql: {
    /** Quote identifier (e.g. [x], `db`.`x`, "x") */
    qi: (name: string) => string;
    /** Qualified table name with schema/db prefix */
    table: (name: string) => string;
    /** Drop table if exists */
    dropTable: (name: string) => string;
    /** Parameter placeholder for parametrized query */
    param: (index: number) => string;

    // DDL
    autoIncrementPk: string;
    autoIncrementPkCol: string;
    varchar: (len: number) => string;
    nvarchar: (len: number) => string;
    intType: string;
    floatType: string;
    boolType: string;
    datetimeType: string;
    dateType: string;
    uuidType: string;
    binaryType: string;
    nullableVarchar: (len: number) => string;
    isolationTableExtra: string;
  };

  /** Table name to pass to bulkInsert() */
  bulkTableName: (name: string) => string;

  /** Special-char records for bulk insert test (DB-specific escaping behavior) */
  specialCharRecords: Array<Record<string, unknown>>;
  /** Expected assertions for special-char records */
  specialCharAssertions: Array<{ name: string }>;

  /** How bool values appear in query results */
  boolTrue: unknown;
  boolFalse: unknown;

  /** UUID/binary result assertions */
  assertUuidBinary: (
    results: Record<string, unknown>[][],
    testUuid1: Uuid,
    testUuid2: Uuid,
    testBinary1: Uint8Array,
    testBinary2: Uint8Array,
  ) => void;

  /** UUID/binary SELECT query (MySQL needs HEX extraction) */
  uuidBinarySelectQuery: (tableName: string) => string;
}

const mssqlDef: DbDialectDef = {
  name: "MssqlDbConn",
  createConn: async () => {
    const { MssqlDbConn } = await import("@simplysm/orm-node");
    const tedious = await import("tedious");
    return new MssqlDbConn(tedious, mssqlConfig);
  },
  sql: {
    qi: (name) => `[${name}]`,
    table: (name) => `[${name}]`,
    dropTable: (name) => `IF OBJECT_ID('${name}', 'U') IS NOT NULL DROP TABLE [${name}]`,
    param: (index) => `@p${index}`,
    autoIncrementPk: "INT IDENTITY(1,1) PRIMARY KEY",
    autoIncrementPkCol: "id",
    varchar: (len) => `NVARCHAR(${len})`,
    nvarchar: (len) => `NVARCHAR(${len})`,
    intType: "INT",
    floatType: "FLOAT",
    boolType: "BIT",
    datetimeType: "DATETIME2",
    dateType: "DATE",
    uuidType: "UNIQUEIDENTIFIER",
    binaryType: "VARBINARY(MAX)",
    nullableVarchar: (len) => `NVARCHAR(${len})`,
    isolationTableExtra: "",
  },
  bulkTableName: (name) => `[${name}]`,
  specialCharRecords: [
    { id: 10, name: "tab\there", value: 1.0 },
    { id: 11, name: "new\nline", value: 2.0 },
    { id: 12, name: 'quote"here', value: 3.0 },
    { id: 13, name: "back\\slash", value: 4.0 },
  ],
  specialCharAssertions: [
    { name: "tab\there" },
    { name: "new\nline" },
    { name: 'quote"here' },
    { name: "back\\slash" },
  ],
  boolTrue: true,
  boolFalse: false,
  uuidBinarySelectQuery: (tableName) => `SELECT * FROM [${tableName}] ORDER BY id`,
  assertUuidBinary: (results, testUuid1, testUuid2, testBinary1, testBinary2) => {
    expect(results[0]).toHaveLength(2);
    expect(results[0][0]["uuid_val"]).toBe(testUuid1.toString().toUpperCase());
    expect(results[0][1]["uuid_val"]).toBe(testUuid2.toString().toUpperCase());
    expect(new Uint8Array(results[0][0]["binary_val"] as ArrayBuffer)).toEqual(testBinary1);
    expect(new Uint8Array(results[0][1]["binary_val"] as ArrayBuffer)).toEqual(testBinary2);
  },
};

const mysqlDef: DbDialectDef = {
  name: "MysqlDbConn",
  createConn: async () => {
    const { MysqlDbConn } = await import("@simplysm/orm-node");
    const mysql2 = await import("mysql2/promise");
    return new MysqlDbConn(mysql2, mysqlConfig);
  },
  sql: {
    qi: (name) => `\`${name}\``,
    table: (name) => `\`TestDb\`.\`${name}\``,
    dropTable: (name) => `DROP TABLE IF EXISTS \`TestDb\`.\`${name}\``,
    param: () => "?",
    autoIncrementPk: "INT AUTO_INCREMENT PRIMARY KEY",
    autoIncrementPkCol: "id",
    varchar: (len) => `VARCHAR(${len})`,
    nvarchar: (len) => `VARCHAR(${len})`,
    intType: "INT",
    floatType: "DOUBLE",
    boolType: "TINYINT(1)",
    datetimeType: "DATETIME(3)",
    dateType: "DATE",
    uuidType: "BINARY(16)",
    binaryType: "VARBINARY(255)",
    nullableVarchar: (len) => `VARCHAR(${len})`,
    isolationTableExtra: " ENGINE=InnoDB",
  },
  bulkTableName: (name) => `\`TestDb\`.\`${name}\``,
  specialCharRecords: [
    { id: 10, name: "tab\there", value: 1.0 },
    { id: 11, name: "new\nline", value: 2.0 },
    { id: 12, name: "back\\slash", value: 3.0 },
  ],
  specialCharAssertions: [
    { name: "tab\there" },
    { name: "new\nline" },
    { name: "back\\slash" },
  ],
  boolTrue: 1,
  boolFalse: 0,
  uuidBinarySelectQuery: (tableName) =>
    `SELECT *, HEX(uuid_val) as uuid_hex, HEX(binary_val) as binary_hex FROM \`TestDb\`.\`${tableName}\` ORDER BY id`,
  assertUuidBinary: (results, testUuid1, testUuid2) => {
    expect(results[0]).toHaveLength(2);
    const expectedUuid1Hex = testUuid1.toString().replace(/-/g, "").toUpperCase();
    const expectedUuid2Hex = testUuid2.toString().replace(/-/g, "").toUpperCase();
    expect(results[0][0]["uuid_hex"]).toBe(expectedUuid1Hex);
    expect(results[0][1]["uuid_hex"]).toBe(expectedUuid2Hex);
    expect(results[0][0]["binary_hex"]).toBe("01020304");
    expect(results[0][1]["binary_hex"]).toBe("AABBCCDDEEFF");
  },
};

const postgresqlDef: DbDialectDef = {
  name: "PostgresqlDbConn",
  createConn: async () => {
    const { PostgresqlDbConn } = await import("@simplysm/orm-node");
    const pg = await import("pg");
    const pgCopyStreams = await import("pg-copy-streams");
    return new PostgresqlDbConn(pg, pgCopyStreams, postgresqlConfig);
  },
  sql: {
    qi: (name) => `"${name}"`,
    table: (name) => `"${name}"`,
    dropTable: (name) => `DROP TABLE IF EXISTS "${name}"`,
    param: (index) => `$${index + 1}`,
    autoIncrementPk: "SERIAL PRIMARY KEY",
    autoIncrementPkCol: "id",
    varchar: (len) => `VARCHAR(${len})`,
    nvarchar: (len) => `VARCHAR(${len})`,
    intType: "INT",
    floatType: "DOUBLE PRECISION",
    boolType: "BOOLEAN",
    datetimeType: "TIMESTAMP",
    dateType: "DATE",
    uuidType: "UUID",
    binaryType: "BYTEA",
    nullableVarchar: (len) => `VARCHAR(${len})`,
    isolationTableExtra: "",
  },
  bulkTableName: (name) => `"${name}"`,
  specialCharRecords: [
    { id: 10, name: 'quote"here', value: 1.0 },
    { id: 11, name: "comma,here", value: 2.0 },
    { id: 12, name: "new\nline", value: 3.0 },
  ],
  specialCharAssertions: [
    { name: 'quote"here' },
    { name: "comma,here" },
    { name: "new\nline" },
  ],
  boolTrue: true,
  boolFalse: false,
  uuidBinarySelectQuery: (tableName) => `SELECT * FROM "${tableName}" ORDER BY id`,
  assertUuidBinary: (results, testUuid1, testUuid2, testBinary1, testBinary2) => {
    expect(results[0]).toHaveLength(2);
    expect(results[0][0]["uuid_val"]).toBe(testUuid1.toString());
    expect(results[0][1]["uuid_val"]).toBe(testUuid2.toString());
    expect(new Uint8Array(results[0][0]["binary_val"] as ArrayBuffer)).toEqual(testBinary1);
    expect(new Uint8Array(results[0][1]["binary_val"] as ArrayBuffer)).toEqual(testBinary2);
  },
};

// ============================================
// Parameterized test suite
// ============================================

const dialects: DbDialectDef[] = [mssqlDef, mysqlDef, postgresqlDef];

for (const d of dialects) {
  describe(d.name, () => {
    let conn: MssqlDbConn | MysqlDbConn | PostgresqlDbConn;

    beforeAll(async () => {
      conn = await d.createConn();
    });

    afterAll(async () => {
      if (conn.isConnected) {
        await conn.close();
      }
    });

    describe("연결", () => {
      it("연결 성공", async () => {
        const testConn = await d.createConn();
        await testConn.connect();
        expect(testConn.isConnected).toBe(true);
        await testConn.close();
      });

      it("중복 연결 시 오류 발생", async () => {
        const testConn = await d.createConn();
        await testConn.connect();
        try {
          await expect(testConn.connect()).rejects.toThrow(DB_CONN_ERRORS.ALREADY_CONNECTED);
        } finally {
          await testConn.close();
        }
      });

      it("연결 종료", async () => {
        const testConn = await d.createConn();
        await testConn.connect();
        await testConn.close();
        expect(testConn.isConnected).toBe(false);
      });
    });

    describe("쿼리 실행", () => {
      beforeAll(async () => {
        conn = await d.createConn();
        await conn.connect();

        await conn.execute([
          d.sql.dropTable("TestTable"),
          `CREATE TABLE ${d.sql.table("TestTable")} (
            ${d.sql.autoIncrementPkCol} ${d.sql.autoIncrementPk},
            name ${d.sql.nvarchar(100)},
            value ${d.sql.intType}
          )`,
        ]);
      });

      afterAll(async () => {
        await conn.execute([d.sql.dropTable("TestTable")]);
        await conn.close();
      });

      it("INSERT 및 SELECT", async () => {
        await conn.execute([
          `INSERT INTO ${d.sql.table("TestTable")} (name, value) VALUES ('test', 123)`,
        ]);

        const results = await conn.execute([
          `SELECT * FROM ${d.sql.table("TestTable")} WHERE name = 'test'`,
        ]);

        expect(results).toHaveLength(1);
        expect(results[0]).toHaveLength(1);
        expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
      });

      it("매개변수화된 쿼리", async () => {
        const results = await conn.executeParametrized(
          `SELECT * FROM ${d.sql.table("TestTable")} WHERE name = ${d.sql.param(0)}`,
          ["test"],
        );

        expect(results).toHaveLength(1);
        expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
      });

      it("매개변수화된 쿼리 - 숫자 타입", async () => {
        const results = await conn.executeParametrized(
          `SELECT * FROM ${d.sql.table("TestTable")} WHERE value = ${d.sql.param(0)}`,
          [123],
        );

        expect(results).toHaveLength(1);
        expect(results[0][0]).toMatchObject({ value: 123 });
      });

      it("매개변수화된 쿼리 - 복수 매개변수", async () => {
        const results = await conn.executeParametrized(
          `SELECT * FROM ${d.sql.table("TestTable")} WHERE name = ${d.sql.param(0)} AND value = ${d.sql.param(1)}`,
          ["test", 123],
        );

        expect(results).toHaveLength(1);
        expect(results[0][0]).toMatchObject({ name: "test", value: 123 });
      });
    });

    describe("연결 오류 처리", () => {
      it("연결 해제된 커넥션에서 쿼리 실행 시 오류 발생", async () => {
        const disconnectedConn = await d.createConn();
        await expect(disconnectedConn.execute(["SELECT 1"])).rejects.toThrow(
          DB_CONN_ERRORS.NOT_CONNECTED,
        );
      });

      it("잘못된 쿼리 실행 시 오류 발생", async () => {
        const tempConn = await d.createConn();
        await tempConn.connect();

        try {
          await expect(
            tempConn.execute(["SELECT * FROM nonexistent_table_xyz"]),
          ).rejects.toThrow();
        } finally {
          await tempConn.close();
        }
      });
    });

    describe("트랜잭션", () => {
      beforeAll(async () => {
        conn = await d.createConn();
        await conn.connect();

        await conn.execute([
          d.sql.dropTable("TxTable"),
          `CREATE TABLE ${d.sql.table("TxTable")} (
            ${d.sql.autoIncrementPkCol} ${d.sql.autoIncrementPk},
            name ${d.sql.nvarchar(100)}
          )`,
        ]);
      });

      afterAll(async () => {
        await conn.execute([d.sql.dropTable("TxTable")]);
        await conn.close();
      });

      it("커밋", async () => {
        await conn.beginTransaction();
        expect(conn.isInTransaction).toBe(true);

        await conn.execute([
          `INSERT INTO ${d.sql.table("TxTable")} (name) VALUES ('commit-test')`,
        ]);
        await conn.commitTransaction();
        expect(conn.isInTransaction).toBe(false);

        const results = await conn.execute([
          `SELECT * FROM ${d.sql.table("TxTable")} WHERE name = 'commit-test'`,
        ]);
        expect(results[0]).toHaveLength(1);
      });

      it("롤백", async () => {
        await conn.beginTransaction();

        await conn.execute([
          `INSERT INTO ${d.sql.table("TxTable")} (name) VALUES ('rollback-test')`,
        ]);
        await conn.rollbackTransaction();
        expect(conn.isInTransaction).toBe(false);

        const results = await conn.execute([
          `SELECT * FROM ${d.sql.table("TxTable")} WHERE name = 'rollback-test'`,
        ]);
        expect(results[0]).toHaveLength(0);
      });
    });

    describe("bulkInsert", () => {
      beforeAll(async () => {
        conn = await d.createConn();
        await conn.connect();

        await conn.execute([
          d.sql.dropTable("BulkTable"),
          `CREATE TABLE ${d.sql.table("BulkTable")} (
            id ${d.sql.intType} NOT NULL,
            name ${d.sql.nvarchar(100)} NOT NULL,
            value ${d.sql.floatType} NOT NULL
          )`,
        ]);
      });

      afterAll(async () => {
        await conn.execute([d.sql.dropTable("BulkTable")]);
        await conn.close();
      });

      it("대량 INSERT", async () => {
        await conn.bulkInsert(d.bulkTableName("BulkTable"), bulkColumnMetas, bulkRecords);

        const results = await conn.execute([
          `SELECT * FROM ${d.sql.table("BulkTable")} ORDER BY id`,
        ]);

        expect(results[0]).toHaveLength(3);
        expect(results[0][0]).toMatchObject({ id: 1, name: "bulk1" });
        expect(results[0][1]).toMatchObject({ id: 2, name: "bulk2" });
        expect(results[0][2]).toMatchObject({ id: 3, name: "bulk3" });
      });

      it("빈 배열 INSERT는 효과 없음", async () => {
        await expect(
          conn.bulkInsert(d.bulkTableName("BulkTable"), bulkColumnMetas, []),
        ).resolves.toBeUndefined();
      });

      it("특수 문자가 포함된 데이터 INSERT", async () => {
        await conn.execute([`DELETE FROM ${d.sql.table("BulkTable")}`]);

        await conn.bulkInsert(
          d.bulkTableName("BulkTable"),
          bulkColumnMetas,
          d.specialCharRecords,
        );

        const results = await conn.execute([
          `SELECT * FROM ${d.sql.table("BulkTable")} WHERE id >= 10 ORDER BY id`,
        ]);

        expect(results[0]).toHaveLength(d.specialCharAssertions.length);
        for (let i = 0; i < d.specialCharAssertions.length; i++) {
          expect(results[0][i]["name"]).toBe(d.specialCharAssertions[i].name);
        }
      });
    });

    describe("다양한 타입 테스트", () => {
      beforeAll(async () => {
        conn = await d.createConn();
        await conn.connect();

        await conn.execute([
          d.sql.dropTable("TypeTable"),
          `CREATE TABLE ${d.sql.table("TypeTable")} (
            ${d.sql.autoIncrementPkCol} ${d.sql.autoIncrementPk},
            bool_val ${d.sql.boolType} NOT NULL,
            int_val ${d.sql.intType} NOT NULL,
            float_val ${d.sql.floatType} NOT NULL,
            str_val ${d.sql.nvarchar(100)} NOT NULL,
            datetime_val ${d.sql.datetimeType} NOT NULL,
            date_val ${d.sql.dateType} NOT NULL
          )`,
        ]);
      });

      afterAll(async () => {
        await conn.execute([d.sql.dropTable("TypeTable")]);
        await conn.close();
      });

      it("bulkInsert - 다양한 타입", async () => {
        await conn.bulkInsert(d.bulkTableName("TypeTable"), typeColumnMetas, typeRecords);

        const results = await conn.execute([
          `SELECT * FROM ${d.sql.table("TypeTable")} ORDER BY id`,
        ]);

        expect(results[0]).toHaveLength(2);
        expect(results[0][0]["bool_val"]).toBe(d.boolTrue);
        expect(results[0][0]["int_val"]).toBe(42);
        expect(results[0][1]["bool_val"]).toBe(d.boolFalse);
        expect(results[0][1]["int_val"]).toBe(-100);
      });
    });

    describe("bulkInsert NULL 및 특수 타입 테스트", () => {
      beforeAll(async () => {
        conn = await d.createConn();
        await conn.connect();

        await conn.execute([
          d.sql.dropTable("NullableTable"),
          `CREATE TABLE ${d.sql.table("NullableTable")} (
            id ${d.sql.intType} NOT NULL,
            name ${d.sql.nullableVarchar(100)} NULL,
            value ${d.sql.intType} NULL
          )`,
        ]);
      });

      afterAll(async () => {
        await conn.execute([d.sql.dropTable("NullableTable")]);
        await conn.close();
      });

      it("bulkInsert - NULL 값 삽입", async () => {
        await conn.bulkInsert(
          d.bulkTableName("NullableTable"),
          nullableColumnMetas,
          nullableRecords,
        );

        const results = await conn.execute([
          `SELECT * FROM ${d.sql.table("NullableTable")} ORDER BY id`,
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

    describe("bulkInsert UUID 및 바이너리 타입 테스트", () => {
      beforeAll(async () => {
        conn = await d.createConn();
        await conn.connect();

        await conn.execute([
          d.sql.dropTable("UuidBinaryTable"),
          `CREATE TABLE ${d.sql.table("UuidBinaryTable")} (
            id ${d.sql.intType} NOT NULL,
            uuid_val ${d.sql.uuidType} NOT NULL,
            binary_val ${d.sql.binaryType} NOT NULL
          )`,
        ]);
      });

      afterAll(async () => {
        await conn.execute([d.sql.dropTable("UuidBinaryTable")]);
        await conn.close();
      });

      it("bulkInsert - UUID 및 바이너리 타입 삽입", async () => {
        const testUuid1 = Uuid.generate();
        const testUuid2 = Uuid.generate();
        const testBinary1 = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
        const testBinary2 = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]);

        const records = [
          { id: 1, uuid_val: testUuid1, binary_val: testBinary1 },
          { id: 2, uuid_val: testUuid2, binary_val: testBinary2 },
        ];

        await conn.bulkInsert(d.bulkTableName("UuidBinaryTable"), uuidBinaryColumnMetas, records);

        const results = await conn.execute([d.uuidBinarySelectQuery("UuidBinaryTable")]);

        d.assertUuidBinary(results, testUuid1, testUuid2, testBinary1, testBinary2);
      });
    });

    describe("트랜잭션 격리 수준 테스트", () => {
      beforeAll(async () => {
        conn = await d.createConn();
        await conn.connect();

        await conn.execute([
          d.sql.dropTable("IsolationTable"),
          `CREATE TABLE ${d.sql.table("IsolationTable")} (
            id ${d.sql.intType} PRIMARY KEY,
            value ${d.sql.intType}
          )${d.sql.isolationTableExtra}`,
          `INSERT INTO ${d.sql.table("IsolationTable")} (id, value) VALUES (1, 100)`,
        ]);
      });

      afterAll(async () => {
        await conn.execute([d.sql.dropTable("IsolationTable")]);
        await conn.close();
      });

      it("READ_UNCOMMITTED 격리 수준", async () => {
        await conn.beginTransaction("READ_UNCOMMITTED");
        expect(conn.isInTransaction).toBe(true);

        await conn.execute([
          `UPDATE ${d.sql.table("IsolationTable")} SET value = 200 WHERE id = 1`,
        ]);
        await conn.rollbackTransaction();
        expect(conn.isInTransaction).toBe(false);
      });

      it("READ_COMMITTED 격리 수준", async () => {
        await conn.beginTransaction("READ_COMMITTED");
        expect(conn.isInTransaction).toBe(true);

        await conn.execute([
          `UPDATE ${d.sql.table("IsolationTable")} SET value = 300 WHERE id = 1`,
        ]);
        await conn.commitTransaction();
        expect(conn.isInTransaction).toBe(false);
      });

      it("REPEATABLE_READ 격리 수준", async () => {
        await conn.beginTransaction("REPEATABLE_READ");
        expect(conn.isInTransaction).toBe(true);

        const results = await conn.execute([
          `SELECT * FROM ${d.sql.table("IsolationTable")} WHERE id = 1`,
        ]);
        expect(results[0]).toHaveLength(1);

        await conn.rollbackTransaction();
        expect(conn.isInTransaction).toBe(false);
      });

      it("SERIALIZABLE 격리 수준", async () => {
        await conn.beginTransaction("SERIALIZABLE");
        expect(conn.isInTransaction).toBe(true);

        const results = await conn.execute([
          `SELECT * FROM ${d.sql.table("IsolationTable")} WHERE id = 1`,
        ]);
        expect(results[0]).toHaveLength(1);

        await conn.commitTransaction();
        expect(conn.isInTransaction).toBe(false);
      });
    });
  });
}

// ============================================
// MySQL-specific: multi-statement result separation
// ============================================

describe("MysqlDbConn multi-statement 결과 분리", () => {
  let conn: MysqlDbConn;

  beforeAll(async () => {
    const { MysqlDbConn: MysqlDbConnClass } = await import("@simplysm/orm-node");
    const mysql2 = await import("mysql2/promise");
    conn = new MysqlDbConnClass(mysql2, mysqlConfig);
    await conn.connect();

    await conn.execute([
      "DROP TABLE IF EXISTS `TestDb`.`MultiStmtTable`",
      `CREATE TABLE \`TestDb\`.\`MultiStmtTable\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100)
      )`,
    ]);
  });

  afterAll(async () => {
    if (conn.isConnected) {
      await conn.execute(["DROP TABLE IF EXISTS `TestDb`.`MultiStmtTable`"]);
      await conn.close();
    }
  });

  it("INSERT + SELECT multi-statement 실행 시 각 statement별 result set 분리", async () => {
    const results = await conn.executeParametrized(
      "INSERT INTO `TestDb`.`MultiStmtTable` (name) VALUES ('multi-test');"
      + " SELECT * FROM `TestDb`.`MultiStmtTable` WHERE name = 'multi-test'",
    );

    // 2개의 result set: INSERT(빈 배열) + SELECT(결과 배열)
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results[0]).toEqual([]); // INSERT → ResultSetHeader → 빈 배열
    expect(results[1]).toHaveLength(1); // SELECT → 1개 행
    expect(results[1][0]).toMatchObject({ name: "multi-test" });
  });

  it("SET + INSERT + SET multi-statement 실행 시 3개 result set 분리", async () => {
    const results = await conn.executeParametrized(
      "SET @a = 1;"
      + " INSERT INTO `TestDb`.`MultiStmtTable` (name) VALUES ('set-test');"
      + " SET @b = 2",
    );

    // 3개의 result set: SET(빈) + INSERT(빈) + SET(빈)
    expect(results).toHaveLength(3);
    expect(results[0]).toEqual([]);
    expect(results[1]).toEqual([]);
    expect(results[2]).toEqual([]);
  });

  it("resultSetIndex로 올바른 result set 접근 가능 (INSERT with OUTPUT 시뮬레이션)", async () => {
    // execute()를 통해 multi-statement 실행 후 인덱스 접근 검증
    const results = await conn.execute([
      "INSERT INTO `TestDb`.`MultiStmtTable` (name) VALUES ('output-test');"
      + " SELECT * FROM `TestDb`.`MultiStmtTable` WHERE name = 'output-test'",
    ]);

    // results[0] = INSERT(빈 배열), results[1] = SELECT(결과)
    expect(results[1]).toBeDefined();
    expect(results[1].length).toBeGreaterThanOrEqual(1);
    expect(results[1][0]).toMatchObject({ name: "output-test" });
  });
});
