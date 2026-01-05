import { Uuid } from "@simplysm/sd-core-common";
import { MysqlQueryHelper } from "../query-helper/MysqlQueryHelper";
import { TDataType } from "../../types";
import {
  IAddForeignKeyQueryDef,
  IClearDatabaseQueryDef,
  ICreateDatabaseQueryDef,
  ICreateIndexQueryDef,
  ICreateProcedureQueryDef,
  ICreateTableQueryDef,
  ICreateViewQueryDef,
  IDeleteQueryDef,
  IExecuteProcedureQueryDef,
  IGetDatabaseInfoDef,
  IGetTableColumnInfosDef,
  IGetTableForeignKeysDef,
  IGetTableIndexesDef,
  IGetTableInfoDef,
  IGetTableInfosDef,
  IGetTablePrimaryKeysDef,
  IInsertIfNotExistsQueryDef,
  IInsertIntoQueryDef,
  IInsertQueryDef,
  IJoinQueryDef,
  IQueryTableNameDef,
  ISelectQueryDef,
  ITruncateTableQueryDef,
  IUpdateQueryDef,
  IUpsertQueryDef,
  TQueryBuilderValue,
} from "../query-def";
import { BaseQueryBuilder } from "./BaseQueryBuilder";

export class MysqlQueryBuilder extends BaseQueryBuilder {
  constructor(qh: MysqlQueryHelper) {
    super(qh);
  }

  private _tn(def: IQueryTableNameDef): string {
    return this._qh.wrapNames(def.database, def.name);
  }

  // ============================================
  // SELECT
  // ============================================

  select(def: ISelectQueryDef): string {
    if (def.top !== undefined && def.limit)
      throw new Error("TOP과 LIMIT은 함께 사용할 수 없습니다.");

    let q = "SELECT";
    if (def.distinct) q += " DISTINCT";

    // SELECT columns
    if (def.select != null) {
      q += "\n";
      const fields: string[] = [];
      for (const [key, value] of Object.entries(def.select)) {
        const valueStr = typeof value === "string" ? value : "";

        if (this._isSubQuery(value)) {
          fields.push(`  (\n    ${this.select(value).replace(/\n/g, "\n    ")}\n  ) as ${key}`);
        } else {
          fields.push(`  ${valueStr !== "" ? valueStr : this._qv(value)} as ${key}`);
        }
      }
      q += fields.join(",\n") + "\n";
    } else {
      q += " *\n";
    }

    // FROM
    if (Array.isArray(def.from)) {
      q += "FROM (\n";
      q += def.from
        .map((f) => "  " + this.select(f).replace(/\n/g, "\n  "))
        .join("\n\n  UNION ALL\n\n");
      q += "\n)";
    } else if (this._isSubQuery(def.from)) {
      q += `FROM (\n  ${this.select(def.from).replace(/\n/g, "\n  ")}\n)`;
    } else if (def.from !== undefined) {
      q += `FROM ${def.from}`;
    }

    if (def.from !== undefined && def.as !== undefined) q += ` as ${def.as}`;
    q += "\n";

    // UNPIVOT (MySQL: CROSS JOIN LATERAL 에뮬레이션)
    if (def.unpivot != null) {
      const valueCol = this._qh.wrapNames(def.unpivot.valueColumn); // wrap unwrapped column name
      const keyCol = this._qh.wrapNames(def.unpivot.pivotColumn); // wrap unwrapped column name

      // CROSS JOIN LATERAL (SELECT ... UNION ALL SELECT ...)
      q += "CROSS JOIN LATERAL (\n";

      const unionParts = def.unpivot.pivotKeys.map((colQuery, idx) => {
        // colQuery는 `TBL`.`jan` 형태
        const colRef = this._qv(colQuery);
        const colName = this._extractColumnName(colRef);
        // 모든 SELECT에 명시적 컬럼 별칭 사용
        if (idx === 0) {
          return `  SELECT ${colRef} as ${valueCol}, '${colName}' as ${keyCol}`;
        }
        return `  UNION ALL\n  SELECT ${colRef} as ${valueCol}, '${colName}' as ${keyCol}`;
      });
      q += unionParts.join("\n") + "\n";

      q += `) as ${this._qh.wrapNames("UPVT")}\n`;
    }

    // JOIN
    if (def.join != null && def.join.length > 0) {
      for (const j of def.join) q += this._join(j) + "\n";
    }

    // WHERE
    if (def.where != null && def.where.length > 0)
      q += `WHERE ${def.where.map((w) => this._qv(w)).join(" AND ")}\n`;

    // GROUP BY (PIVOT 시 자동 생성)
    if (def.pivot && def.select) {
      // pivot 키 컬럼 제외한 나머지를 GROUP BY
      const pivotKeySet = new Set(def.pivot.pivotKeys.map((k) => this._qh.wrapNames(k)));
      const groupByCols: string[] = [];
      for (const [key, value] of Object.entries(def.select)) {
        // pivot 키 컬럼 제외 (def.select의 key는 wrapped 형태)
        if (pivotKeySet.has(key)) continue;
        groupByCols.push(this._qv(value));
      }
      if (groupByCols.length > 0) {
        q += `GROUP BY ${groupByCols.join(", ")}\n`;
      }
    } else if (def.groupBy != null && def.groupBy.length > 0) {
      q += `GROUP BY ${def.groupBy.map((g) => this._qv(g)).join(", ")}\n`;
    }

    // HAVING
    if (def.having != null && def.having.length > 0) {
      if (def.groupBy == null || def.groupBy.length < 1)
        throw new Error("HAVING을 사용하려면 GROUP BY를 먼저 설정해야 합니다.");
      q += `HAVING ${def.having.map((h) => this._qv(h)).join(" AND ")}\n`;
    }

    // ORDER BY
    if (def.orderBy != null && def.orderBy.length > 0)
      q += `ORDER BY ${def.orderBy.map(([col, dir]) => this._qv(col) + " " + dir).join(", ")}\n`;

    // LIMIT
    if (def.limit != null) {
      if (def.orderBy == null || def.orderBy.length < 1)
        throw new Error("LIMIT을 사용하려면 ORDER BY를 먼저 설정해야 합니다.");
      q += `LIMIT ${def.limit[0]}, ${def.limit[1]}\n`;
    }
    if (def.top !== undefined) q += `LIMIT ${def.top}\n`;

    // LOCK
    if (typeof def.from === "string" && def.lock) q += "FOR UPDATE\n";

    // SAMPLE (MySQL: ORDER BY RAND() LIMIT n)
    if (def.sample !== undefined) {
      // 기존 ORDER BY가 없으면 RAND() 추가, 있으면 앞에 추가
      if (def.orderBy == null || def.orderBy.length < 1) {
        q += `ORDER BY RAND()\n`;
      }
      q += `LIMIT ${def.sample}\n`;
    }

    return q.trim();
  }

  private _needsLateral(def: IJoinQueryDef): boolean {
    const simpleKeys = ["from", "as", "where", "select", "isCustomSelect", "isSingle"];
    return (
      Object.keys(def).some(
        (key) => !simpleKeys.includes(key) && def[key as keyof IJoinQueryDef] !== undefined,
      ) ||
      (def.isCustomSelect ?? false)
    );
  }

  private _join(def: IJoinQueryDef): string {
    // 복잡한 쿼리면 LATERAL 사용
    if (this._needsLateral(def)) {
      let q = `LEFT OUTER JOIN LATERAL (\n`;
      q += `  ${this.select(def).replace(/\n/g, "\n  ")}\n`;
      q += `) as ${def.as} ON 1=1`;
      return q;
    }

    // 단순 JOIN
    let q = "LEFT OUTER JOIN ";
    if (this._isSubQuery(def.from)) {
      q += `(\n  ${this.select(def.from).replace(/\n/g, "\n  ")}\n)`;
    } else {
      q += def.from;
    }
    q += ` as ${def.as}`;
    if (def.where != null && def.where.length > 0)
      q += ` ON ${def.where.map((w) => this._qv(w)).join(" AND ")}`;
    return q;
  }

  // ============================================
  // INSERT
  // ============================================

  insert(def: IInsertQueryDef): string {
    if (def.records.length === 0) return "";

    const tableName = this._tn(def.from);
    const hasOutput = def.output && def.output.length > 0;
    const needsProc = hasOutput || def.disableFkCheck;

    // 프로시저 불필요: 단순 배치 INSERT
    if (!needsProc) {
      return this._buildBatchInsert(def);
    }

    // 프로시저 필요
    const procName = this._qh.wrapNames("SD" + Uuid.new().toString().replace(/-/g, ""));
    const dbName = def.from.database != null ? this._qh.wrapNames(def.from.database) : tableName.split(".")[0];

    let q = `USE ${dbName};\n\n`;
    q += `CREATE PROCEDURE ${procName}()\nBEGIN\n\n`;

    // FK 체크 비활성화
    if (def.disableFkCheck) {
      q += "  SET FOREIGN_KEY_CHECKS = 0;\n\n";
    }

    // OUTPUT 있으면: 개별 INSERT + SELECT 반복
    if (hasOutput) {
      for (const record of def.records) {
        const columns = Object.keys(record); // unwrapped column names
        q += `  INSERT INTO ${tableName} (${columns.map((c) => this._qh.wrapNames(c)).join(", ")})\n`;
        q += `  VALUES (${Object.values(record)
          .map((v) => this._qv(v))
          .join(", ")});\n\n`;

        if (def.pkColNames && def.pkColNames.length > 0) {
          const whereForSelect = def.pkColNames.map((pk) => {
            const wrappedPk = this._qh.wrapNames(pk);
            if (pk === def.aiColName) {
              return `${wrappedPk} = LAST_INSERT_ID()`;
            }
            return `${wrappedPk} = ${this._qv(record[pk])}`;
          });
          q += `  SELECT ${def.output!.map((o) => this._qh.wrapNames(o)).join(", ")} FROM ${tableName} WHERE ${whereForSelect.join(" AND ")};\n\n`;
        }
      }
    }
    // OUTPUT 없으면: 배치 INSERT
    else {
      const firstRecord = def.records[0];
      const columns = Object.keys(firstRecord); // unwrapped column names
      q += `  INSERT INTO ${tableName} (${columns.map((c) => this._qh.wrapNames(c)).join(", ")})\n  VALUES\n`;
      q += def.records
        .map((record) => `    (${columns.map((col) => this._qv(record[col])).join(", ")})`)
        .join(",\n");
      q += ";\n\n";
    }

    // FK 체크 활성화
    if (def.disableFkCheck) {
      q += "  SET FOREIGN_KEY_CHECKS = 1;\n\n";
    }

    q += "END;\n";
    q += `CALL ${procName};\nDROP PROCEDURE ${procName};`;

    return q.trim();
  }

  // 배치 INSERT (프로시저 없이)
  private _buildBatchInsert(def: IInsertQueryDef): string {
    const tableName = this._tn(def.from);
    const firstRecord = def.records[0];
    const columns = Object.keys(firstRecord); // unwrapped column names

    let q = `INSERT INTO ${tableName} (${columns.map((c) => this._qh.wrapNames(c)).join(", ")})\nVALUES\n`;
    q += def.records
      .map((record) => `  (${columns.map((col) => this._qv(record[col])).join(", ")})`)
      .join(",\n");
    return q + ";";
  }

  insertInto(def: IInsertIntoQueryDef): string {
    const targetName = this._tn(def.target);
    const selectCols = Object.keys(def.select).join(", "); // already wrapped in select
    // stopAutoIdentity는 MySQL에서 의미 없음, 무시
    return `INSERT INTO ${targetName} (${selectCols})\n${this.select(def as ISelectQueryDef)};`;
  }

  // ============================================
  // UPDATE
  // ============================================

  update(def: IUpdateQueryDef): string {
    const tableName = this._tn(def.from);
    const alias = this._qh.wrapNames(def.as);
    const hasOutput = def.output && def.output.length > 0;
    const needsProc = hasOutput || def.disableFkCheck;

    // 프로시저 불필요: 단순 UPDATE
    if (!needsProc) {
      return this._buildSimpleUpdate(def);
    }

    // 프로시저 필요
    const procName = this._qh.wrapNames("SD" + Uuid.new().toString().replace(/-/g, ""));
    const dbName = def.from.database != null ? this._qh.wrapNames(def.from.database) : tableName.split(".")[0];

    let q = `USE ${dbName};\n\n`;
    q += `CREATE PROCEDURE ${procName}()\nBEGIN\n\n`;

    // FK 체크 비활성화
    if (def.disableFkCheck) {
      q += "  SET FOREIGN_KEY_CHECKS = 0;\n\n";
    }

    // UPDATE 실행
    q += `  UPDATE ${tableName} as ${alias}\n`;
    if (def.join != null && def.join.length > 0) {
      for (const j of def.join) q += this._join(j) + "\n";
    }
    q += "  SET\n";
    q +=
      Object.entries(def.record)
        .map(([k, v]) => `    ${alias}.${this._qh.wrapNames(k)} = ${this._qv(v)}`)
        .join(",\n") + "\n";
    if (def.where != null && def.where.length > 0)
      q += `  WHERE ${def.where.map((w) => this._qv(w)).join(" AND ")}\n`;
    if (def.top !== undefined) q += `LIMIT ${def.top}\n`;
    q = q.slice(0, -1) + ";\n\n";

    // OUTPUT을 위한 SELECT (같은 WHERE 조건)
    if (hasOutput) {
      q += `  SELECT ${def.output!.map((o) => this._qh.wrapNames(o)).join(", ")} FROM ${tableName} as ${alias}\n`;
      if (def.join != null && def.join.length > 0) {
        for (const j of def.join) q += this._join(j) + "\n";
      }
      if (def.where != null && def.where.length > 0)
        q += `  WHERE ${def.where.map((w) => this._qv(w)).join(" AND ")}\n`;
      q = q.slice(0, -1) + ";\n\n";
    }

    // FK 체크 활성화
    if (def.disableFkCheck) {
      q += "  SET FOREIGN_KEY_CHECKS = 1;\n\n";
    }

    q += "END;\n";
    q += `CALL ${procName};\nDROP PROCEDURE ${procName};`;

    return q.trim();
  }

  private _buildSimpleUpdate(def: IUpdateQueryDef): string {
    const tableName = this._tn(def.from);
    const alias = this._qh.wrapNames(def.as);

    let q = `UPDATE ${tableName} as ${alias}\n`;

    if (def.join != null && def.join.length > 0) {
      for (const j of def.join) q += this._join(j) + "\n";
    }

    q += "SET\n";
    q +=
      Object.entries(def.record)
        .map(([k, v]) => `  ${alias}.${this._qh.wrapNames(k)} = ${this._qv(v)}`)
        .join(",\n") + "\n";

    if (def.where != null && def.where.length > 0)
      q += `WHERE ${def.where.map((w) => this._qv(w)).join(" AND ")}\n`;
    if (def.top !== undefined) q += `LIMIT ${def.top}\n`;

    return q.trim() + ";";
  }

  // ============================================
  // DELETE
  // ============================================

  delete(def: IDeleteQueryDef): string {
    const tableName = this._tn(def.from);
    const alias = this._qh.wrapNames(def.as);
    const hasOutput = def.output && def.output.length > 0;
    const needsProc = hasOutput || def.disableFkCheck;

    // 프로시저 불필요: 단순 DELETE
    if (!needsProc) {
      return this._buildSimpleDelete(def);
    }

    // 프로시저 필요
    const procName = this._qh.wrapNames("SD" + Uuid.new().toString().replace(/-/g, ""));
    const dbName = def.from.database != null ? this._qh.wrapNames(def.from.database) : tableName.split(".")[0];

    let q = `USE ${dbName};\n\n`;
    q += `CREATE PROCEDURE ${procName}()\nBEGIN\n\n`;

    // FK 체크 비활성화
    if (def.disableFkCheck) {
      q += "SET FOREIGN_KEY_CHECKS = 0;\n\n";
    }

    // OUTPUT 있으면: 삭제 전 임시테이블에 저장
    if (hasOutput) {
      const tempTableName = this._qh.wrapNames(
        "SD_TEMP_" + Uuid.new().toString().replace(/-/g, ""),
      );

      q += `CREATE TEMPORARY TABLE ${tempTableName} AS\n`;
      q += `SELECT ${def.output!.map((o) => this._qh.wrapNames(o)).join(", ")} FROM ${tableName} as ${alias}\n`;
      if (def.join != null && def.join.length > 0) {
        for (const j of def.join) q += this._join(j) + "\n";
      }
      if (def.where != null && def.where.length > 0)
        q += `WHERE ${def.where.map((w) => this._qv(w)).join(" AND ")}\n`;
      q = q.slice(0, -1) + ";\n\n";

      // DELETE 실행
      q += this._buildDeleteStatement(def) + ";\n\n";

      // 임시 테이블에서 결과 반환
      q += `SELECT * FROM ${tempTableName};\n\n`;

      // 임시 테이블 삭제
      q += `DROP TEMPORARY TABLE ${tempTableName};\n\n`;
    } else {
      // OUTPUT 없으면: 단순 DELETE
      q += this._buildDeleteStatement(def) + ";\n\n";
    }

    // FK 체크 활성화
    if (def.disableFkCheck) {
      q += "SET FOREIGN_KEY_CHECKS = 1;\n\n";
    }

    q += "END;\n";
    q += `CALL ${procName};\nDROP PROCEDURE ${procName};`;

    return q.trim();
  }

  private _buildSimpleDelete(def: IDeleteQueryDef): string {
    const tableName = this._tn(def.from);
    const alias = this._qh.wrapNames(def.as);

    // Simple delete - MySQL은 alias 사용 시 multi-table DELETE 구문 필요
    // DELETE alias FROM table AS alias WHERE ...
    if (!def.join && def.top === undefined) {
      let q = `DELETE ${alias} FROM ${tableName} AS ${alias}`;
      if (def.where != null && def.where.length > 0)
        q += `\nWHERE ${def.where.map((w) => this._qv(w)).join(" AND ")}`;
      return q.trim() + ";";
    }

    // Complex delete with JOIN
    let q = `DELETE ${alias}\nFROM ${tableName} AS ${alias}\n`;
    if (def.join != null && def.join.length > 0) {
      for (const j of def.join) q += this._join(j) + "\n";
    }
    if (def.where != null && def.where.length > 0)
      q += `WHERE ${def.where.map((w) => this._qv(w)).join(" AND ")}\n`;
    if (def.top !== undefined) q += `LIMIT ${def.top}\n`;

    return q.trim() + ";";
  }

  private _buildDeleteStatement(def: IDeleteQueryDef): string {
    const tableName = this._tn(def.from);
    const alias = this._qh.wrapNames(def.as);

    // Simple delete - MySQL은 alias 사용 시 multi-table DELETE 구문 필요
    if (!def.join && def.top === undefined) {
      let q = `DELETE ${alias} FROM ${tableName} AS ${alias}`;
      if (def.where != null && def.where.length > 0)
        q += `\nWHERE ${def.where.map((w) => this._qv(w)).join(" AND ")}`;
      return q.trim();
    }

    // Complex delete with JOIN
    let q = `DELETE ${alias}\nFROM ${tableName} AS ${alias}\n`;
    if (def.join != null && def.join.length > 0) {
      for (const j of def.join) q += this._join(j) + "\n";
    }
    if (def.where != null && def.where.length > 0)
      q += `WHERE ${def.where.map((w) => this._qv(w)).join(" AND ")}\n`;
    if (def.top !== undefined) q += `LIMIT ${def.top}\n`;

    return q.trim();
  }

  // ============================================
  // UPSERT (Stored Procedure)
  // ============================================

  upsert(def: IUpsertQueryDef): string {
    const tableName = this._tn(def.from);
    const alias = this._qh.wrapNames(def.as);
    const procName = this._qh.wrapNames("SD" + Uuid.new().toString().replace(/-/g, ""));
    const dbName = def.from.database != null ? this._qh.wrapNames(def.from.database) : tableName.split(".")[0];

    let q = `USE ${dbName};\n\n`;
    q += `CREATE PROCEDURE ${procName}()\nproc_label:BEGIN\n\n`;
    q += `IF EXISTS (\n  ${this.select({ from: tableName, as: alias, where: def.where }).replace(/\n/g, "\n  ")}\n) THEN\n\n`;

    if (Object.keys(def.updateRecord).length > 0) {
      // update 호출 시 output을 undefined로 하여 프로시저 중복 생성 방지
      q += this.update({ ...def, record: def.updateRecord, output: undefined } as IUpdateQueryDef) + "\n\n";
    } else {
      q += "LEAVE proc_label;\n\n";
    }

    if (def.output != null)
      q += this.select({ from: tableName, as: alias, where: def.where }) + ";\n\n";

    q += "ELSE\n\n";

    if (Object.keys(def.insertRecord).length > 0) {
      // 단일 레코드 INSERT (output 없이)
      q += this._buildSingleInsert(tableName, def.insertRecord) + "\n\n";
    } else {
      q += "LEAVE proc_label;\n\n";
    }

    if (def.output && def.pkColNames.length > 0) {
      // INSERT 후 SELECT - 테이블 alias 포함한 where 조건 직접 생성
      const whereConditions = def.pkColNames.map((pk) => {
        const wrappedPk = this._qh.wrapNames(pk);
        const qualifiedCol = `${alias}.${wrappedPk}`;
        if (pk === def.aiColName) return `${qualifiedCol} = LAST_INSERT_ID()`;
        return `${qualifiedCol} = ${this._qv(def.insertRecord[pk])}`;
      });
      q += `SELECT *\nFROM ${tableName} as ${alias}\nWHERE ${whereConditions.join(" AND ")};\n\n`;
    }

    q += "END IF;\n\nEND;\n";
    q += `CALL ${procName};\nDROP PROCEDURE ${procName};`;

    return q.trim();
  }

  // 단일 INSERT 문 생성 (프로시저 내부용)
  private _buildSingleInsert(tableName: string, record: Record<string, TQueryBuilderValue>): string {
    const columns = Object.keys(record); // unwrapped column names
    let q = `INSERT INTO ${tableName} (${columns.map((c) => this._qh.wrapNames(c)).join(", ")})\n`;
    q += `VALUES (${columns.map((col) => this._qv(record[col])).join(", ")});`;
    return q;
  }

  // ============================================
  // INSERT IF NOT EXISTS
  // ============================================

  insertIfNotExists(def: IInsertIfNotExistsQueryDef): string {
    const tableName = this._tn(def.from);
    const alias = this._qh.wrapNames(def.as);
    const procName = this._qh.wrapNames("SD" + Uuid.new().toString().replace(/-/g, ""));
    const dbName = def.from.database != null ? this._qh.wrapNames(def.from.database) : tableName.split(".")[0];

    let q = `USE ${dbName};\n\n`;
    q += `CREATE PROCEDURE ${procName}()\nBEGIN\n\n`;

    // IF NOT EXISTS
    q += `IF NOT EXISTS (\n  ${this.select({ from: tableName, as: alias, where: def.where }).replace(/\n/g, "\n  ")}\n) THEN\n\n`;

    // INSERT (단일 레코드, output 없이)
    q += this._buildSingleInsert(tableName, def.insertRecord) + "\n\n";

    // OUTPUT을 위한 SELECT
    if (def.output && def.output.length > 0 && def.pkColNames && def.pkColNames.length > 0) {
      const whereForSelect = def.pkColNames.map((pk) => {
        const wrappedPk = this._qh.wrapNames(pk);
        if (pk === def.aiColName) {
          return `${wrappedPk} = LAST_INSERT_ID()`;
        }
        return `${wrappedPk} = ${this._qv(def.insertRecord[pk])}`;
      });
      q += `SELECT ${def.output.map((o) => this._qh.wrapNames(o)).join(", ")} FROM ${tableName} WHERE ${whereForSelect.join(" AND ")};\n\n`;
    }

    q += "END IF;\n\nEND;\n";
    q += `CALL ${procName};\nDROP PROCEDURE ${procName};`;

    return q.trim();
  }

  // ============================================
  // DDL - Database
  // ============================================

  createDatabase(def: ICreateDatabaseQueryDef): string {
    const db = this._qh.wrapNames(def.database);
    return `CREATE DATABASE ${db};\nALTER DATABASE ${db} CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;`;
  }

  clearDatabase(def: IClearDatabaseQueryDef): string {
    const db = this._qh.wrapNames(def.database);
    return `
DROP PROCEDURE IF EXISTS ${db}.\`__sd_clear_db__\`;
CREATE PROCEDURE ${db}.\`__sd_clear_db__\`()
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE v_name VARCHAR(255);
  DECLARE v_type VARCHAR(50);

  -- 프로시저 조회 커서
  DECLARE cur_proc CURSOR FOR
    SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES
    WHERE ROUTINE_SCHEMA = '${def.database}' AND ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_NAME <> '__sd_clear_db__';

  -- 함수 조회 커서
  DECLARE cur_func CURSOR FOR
    SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES
    WHERE ROUTINE_SCHEMA = '${def.database}' AND ROUTINE_TYPE = 'FUNCTION';

  -- 뷰 조회 커서
  DECLARE cur_view CURSOR FOR
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS
    WHERE TABLE_SCHEMA = '${def.database}';

  -- 테이블 조회 커서
  DECLARE cur_table CURSOR FOR
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = '${def.database}' AND TABLE_TYPE = 'BASE TABLE';

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  SET FOREIGN_KEY_CHECKS = 0;

  -- 프로시저 삭제
  OPEN cur_proc;
  proc_loop: LOOP
    FETCH cur_proc INTO v_name;
    IF done THEN LEAVE proc_loop; END IF;
    SET @sql = CONCAT('DROP PROCEDURE IF EXISTS ${db}.\`', v_name, '\`');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END LOOP;
  CLOSE cur_proc;
  SET done = FALSE;

  -- 함수 삭제
  OPEN cur_func;
  func_loop: LOOP
    FETCH cur_func INTO v_name;
    IF done THEN LEAVE func_loop; END IF;
    SET @sql = CONCAT('DROP FUNCTION IF EXISTS ${db}.\`', v_name, '\`');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END LOOP;
  CLOSE cur_func;
  SET done = FALSE;

  -- 뷰 삭제
  OPEN cur_view;
  view_loop: LOOP
    FETCH cur_view INTO v_name;
    IF done THEN LEAVE view_loop; END IF;
    SET @sql = CONCAT('DROP VIEW IF EXISTS ${db}.\`', v_name, '\`');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END LOOP;
  CLOSE cur_view;
  SET done = FALSE;

  -- 테이블 삭제
  OPEN cur_table;
  table_loop: LOOP
    FETCH cur_table INTO v_name;
    IF done THEN LEAVE table_loop; END IF;
    SET @sql = CONCAT('DROP TABLE IF EXISTS ${db}.\`', v_name, '\`');
    PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
  END LOOP;
  CLOSE cur_table;

  SET FOREIGN_KEY_CHECKS = 1;
END;
CALL ${db}.\`__sd_clear_db__\`();
DROP PROCEDURE IF EXISTS ${db}.\`__sd_clear_db__\`;`.trim();
  }

  // ============================================
  // DDL - Table
  // ============================================

  truncate(def: ITruncateTableQueryDef): string {
    return `TRUNCATE TABLE ${this._tn(def.table)};`;
  }

  createTable(def: ICreateTableQueryDef): string {
    const tableName = this._tn(def.table);

    let q = `CREATE TABLE ${tableName} (\n`;

    // 컬럼 정의
    const colDefs: string[] = [];
    for (const col of def.columns) {
      let colDef = `  ${this._qh.wrapNames(col.name)} ${col.dataType}`;
      colDef += col.nullable ? " NULL" : " NOT NULL";
      if (col.autoIncrement) colDef += " AUTO_INCREMENT";
      if (col.defaultValue != null) colDef += ` DEFAULT ${this._qv(col.defaultValue)}`;
      colDefs.push(colDef);
    }

    // PK 제약조건
    if (def.primaryKeys.length > 0) {
      const pkCols = def.primaryKeys.map((pk) => this._qh.wrapNames(pk.columnName)).join(", ");
      colDefs.push(`  PRIMARY KEY (${pkCols})`);
    }

    q += colDefs.join(",\n") + "\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;";
    return q;
  }

  // ============================================
  // DDL - Constraints
  // ============================================

  addForeignKey(def: IAddForeignKeyQueryDef): string {
    const fk = def.foreignKey;
    return `ALTER TABLE ${this._tn(def.table)} ADD CONSTRAINT ${this._qh.wrapNames(fk.name)} FOREIGN KEY (${fk.fkColumns.join(", ")}) REFERENCES ${this._tn(fk.targetTable)}(${fk.targetPkColumns.join(", ")});`;
  }

  // ============================================
  // DDL - Index
  // ============================================

  createIndex(def: ICreateIndexQueryDef): string {
    const idx = def.index;
    const unique = idx.columns[0]?.unique ? "UNIQUE " : "";
    const cols = idx.columns.map((c) => `${this._qh.wrapNames(c.name)} ${c.orderBy}`).join(", ");
    return `CREATE ${unique}INDEX ${this._qh.wrapNames(idx.name)} ON ${this._tn(def.table)}(${cols});`;
  }

  // ============================================
  // DDL - View/Procedure
  // ============================================

  createView(def: ICreateViewQueryDef): string {
    return `CREATE OR REPLACE VIEW ${this._tn(def.view)} AS ${def.query};`;
  }

  createProcedure(def: ICreateProcedureQueryDef): string {
    return `CREATE PROCEDURE ${this._tn(def.procedure)}() BEGIN ${def.query}; END;`;
  }

  executeProcedure(def: IExecuteProcedureQueryDef): string {
    return `CALL ${this._tn(def.procedure)}();`;
  }

  // ============================================
  // Meta Queries
  // ============================================

  getDatabaseInfo(def: IGetDatabaseInfoDef): string {
    return `SELECT * FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '${def.database}'`;
  }

  getTableInfos(def: IGetTableInfosDef): string {
    if (def.database == null)
      return `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'`;
    return `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '${def.database}' AND TABLE_TYPE = 'BASE TABLE'`;
  }

  getTableInfo(def: IGetTableInfoDef): string {
    let q = `SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${def.table.name}'`;
    if (def.table.database != null) q += ` AND TABLE_SCHEMA = '${def.table.database}'`;
    return q;
  }

  getTableColumnInfos(def: IGetTableColumnInfosDef): string {
    let q = `SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${def.table.name}'`;
    if (def.table.database != null) q += ` AND TABLE_SCHEMA = '${def.table.database}'`;
    return q;
  }

  getTablePrimaryKeys(def: IGetTablePrimaryKeysDef): string {
    let q = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_NAME = '${def.table.name}' AND CONSTRAINT_NAME = 'PRIMARY'`;
    if (def.table.database != null) q += ` AND TABLE_SCHEMA = '${def.table.database}'`;
    return q;
  }

  getTableForeignKeys(def: IGetTableForeignKeysDef): string {
    let q = `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_NAME = '${def.table.name}' AND REFERENCED_TABLE_NAME IS NOT NULL`;
    if (def.table.database != null) q += ` AND TABLE_SCHEMA = '${def.table.database}'`;
    return q;
  }

  getTableIndexes(def: IGetTableIndexesDef): string {
    return `SHOW INDEX FROM ${this._tn(def.table)} WHERE Key_name != 'PRIMARY'`;
  }

  // ============================================
  // Utils
  // ============================================

  getDataTypeString(dataType: TDataType): string {
    switch (dataType.type) {
      case "int":
        return "INT";
      case "bigint":
        return "BIGINT";
      case "float":
        return "FLOAT";
      case "double":
        return "DOUBLE";
      case "decimal":
        return dataType.scale != null
          ? `DECIMAL(${dataType.precision}, ${dataType.scale})`
          : `DECIMAL(${dataType.precision})`;
      case "varchar":
        return `VARCHAR(${dataType.length})`;
      case "char":
        return `CHAR(${dataType.length})`;
      case "text":
        return "TEXT";
      case "binary":
        return dataType.length != null ? `VARBINARY(${dataType.length})` : "BLOB";
      case "boolean":
        return "TINYINT(1)";
      case "datetime":
        return "DATETIME";
      case "date":
        return "DATE";
      case "time":
        return "TIME";
      case "uuid":
        return "CHAR(36)";
      default:
        throw new Error(`Unknown data type: ${(dataType as any).type}`);
    }
  }

  // ============================================
  // UNPIVOT 헬퍼
  // ============================================

  /** `TBL`.`jan` → jan (컬럼명만 추출) */
  private _extractColumnName(str: string): string {
    // `xxx`.`yyy` 패턴에서 yyy 추출
    const match = str.match(/`([^`]+)`$/);
    return match ? match[1] : str;
  }
}
