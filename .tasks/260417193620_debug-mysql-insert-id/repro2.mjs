// 실제 파일 크기와 유사한 binary로 INSERT+SELECT multi-statement 재현
import mysql from "../../node_modules/.pnpm/mysql2@3.22.1_@types+node@25.6.0/node_modules/mysql2/promise.js";
import fs from "fs";

const conn = await mysql.createConnection({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "1234",
  database: "adtek",
  multipleStatements: true,
  charset: "utf8mb4",
});

const fileData = fs.readFileSync("D:/workspaces-14/adtek/.docs/260323_추가개발및요청사항_메일및회의/20260305_155228_kaya@ad-tek.co.kr_[ADTEK]WMS기능개발관련요구사항전달및일정확인요청/attachment_001_WMS_scheduling-1/embedded_002_Microsoft_Excel_Binary_Worksheet1.xlsb");
console.log("file size:", fileData.length, "bytes");

const hex = fileData.toString("hex");
console.log("hex length:", hex.length);

await conn.query({ sql: "SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED" });
await conn.beginTransaction();

const sql = `INSERT INTO \`BoaUpload\` (\`boaCode\`, \`uploadDate\`, \`fileName\`, \`buffer\`) VALUES ('R1', NOW(), 'repro.xlsb', 0x${hex});\nSELECT \`id\` FROM \`BoaUpload\` WHERE \`id\` = LAST_INSERT_ID()`;
console.log("sql length:", sql.length);

const [r] = await conn.query({ sql });
console.log("top-level isArray:", Array.isArray(r));
console.log("length:", r?.length);
console.log("r[0] kind:", r?.[0]?.constructor?.name, "has affectedRows:", r?.[0] && "affectedRows" in r[0], "has fieldCount:", r?.[0] && "fieldCount" in r[0]);
console.log("r[0]:", r?.[0]);
console.log("r[1]:", r?.[1]);

await conn.rollback();
await conn.end();
