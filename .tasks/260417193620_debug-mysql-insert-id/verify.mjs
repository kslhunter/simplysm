// 수정된 코드 end-to-end 검증: orm-node + mysql-query-builder
import { createQueryBuilder, pickResultSets } from "../../packages/orm-common/dist/index.js";
import mysql from "../../node_modules/.pnpm/mysql2@3.22.1_@types+node@25.6.0/node_modules/mysql2/promise.js";
import { MysqlDbConn } from "../../packages/orm-node/dist/connections/mysql-db-conn.js";

const conn = new MysqlDbConn(mysql, {
  dialect: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "1234",
  database: "adtek",
});

await conn.connect();
await conn.execute(["USE adtek"]);
await conn.beginTransaction("READ_UNCOMMITTED");

const builder = createQueryBuilder("mysql");

// Case 1: 단일 레코드 INSERT with output
console.log("=== Case 1: single record INSERT with output ===");
const def1 = {
  type: "insert",
  table: { name: "BoaUpload" },
  records: [{ boaCode: "V1", uploadDate: { _serialized: "2026-01-01 00:00:00" }, fileName: "v.txt", buffer: new Uint8Array([1, 2, 3]) }],
  output: { columns: ["id"], pkColNames: ["id"], aiColName: "id" },
};
// But we need proper Expr values, let me just construct SQL manually for simplicity
// Use the raw SQL pattern mysql-query-builder generates

const sql1 = "INSERT INTO `BoaUpload` (`boaCode`, `uploadDate`, `fileName`, `buffer`) VALUES ('V1', '2026-01-01 00:00:00', 'v.txt', 0x010203);\nSELECT `id` FROM `BoaUpload` WHERE `id` = LAST_INSERT_ID()";
const raw1 = await conn.execute([sql1]);
console.log("raw (from mysql-db-conn):", JSON.stringify(raw1));
console.log("pickResultSets (index=1, stride=2):", pickResultSets(raw1, { resultSetIndex: 1, resultSetStride: 2 }));

// Case 2: 배치 INSERT (3 records)
console.log("\n=== Case 2: batch INSERT (3 records) with output ===");
const sql2 = [
  "INSERT INTO `BoaUpload` (`boaCode`, `uploadDate`, `fileName`, `buffer`) VALUES ('B1', '2026-01-01 00:00:00', 'b1.txt', 0x01)",
  "SELECT `id` FROM `BoaUpload` WHERE `id` = LAST_INSERT_ID()",
  "INSERT INTO `BoaUpload` (`boaCode`, `uploadDate`, `fileName`, `buffer`) VALUES ('B2', '2026-01-01 00:00:00', 'b2.txt', 0x02)",
  "SELECT `id` FROM `BoaUpload` WHERE `id` = LAST_INSERT_ID()",
  "INSERT INTO `BoaUpload` (`boaCode`, `uploadDate`, `fileName`, `buffer`) VALUES ('B3', '2026-01-01 00:00:00', 'b3.txt', 0x03)",
  "SELECT `id` FROM `BoaUpload` WHERE `id` = LAST_INSERT_ID()",
].join(";\n");
const raw2 = await conn.execute([sql2]);
console.log("raw length:", raw2.length);
console.log("pickResultSets (index=1, stride=2):", pickResultSets(raw2, { resultSetIndex: 1, resultSetStride: 2 }));

// Case 3: single result set (no stride)
console.log("\n=== Case 3: single target set (index=2, no stride — insertIfNotExists 패턴) ===");
const sql3 = "SELECT 1 AS a;\nSELECT 2 AS b;\nSELECT 3 AS c";
const raw3 = await conn.execute([sql3]);
console.log("pickResultSets (index=2, no stride):", pickResultSets(raw3, { resultSetIndex: 2 }));

// Case 4: default (no meta) - returns raw[0]
console.log("\n=== Case 4: default — no resultSetIndex ===");
const sql4 = "SELECT 42 AS answer";
const raw4 = await conn.execute([sql4]);
console.log("pickResultSets (no meta):", pickResultSets(raw4, {}));

await conn.rollbackTransaction();
await conn.close();
