import { PostgresqlQueryHelper } from "../query-helper/PostgresqlQueryHelper";
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
} from "../query-def";
import { BaseQueryBuilder } from "./BaseQueryBuilder";

export class PostgresqlQueryBuilder extends BaseQueryBuilder {
  constructor(qh: PostgresqlQueryHelper) {
    super(qh);
  }

  private _tn(def: IQueryTableNameDef): string {
    return this._qh.wrapNames(def.database, def.schema, def.name);
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

    // UNPIVOT (PostgreSQL: CROSS JOIN LATERAL + VALUES 에뮬레이션)
    if (def.unpivot != null) {
      const valueCol = this._qh.wrapNames(def.unpivot.valueColumn); // wrap unwrapped column name
      const keyCol = this._qh.wrapNames(def.unpivot.pivotColumn); // wrap unwrapped column name

      // CROSS JOIN LATERAL (VALUES (...), (...))
      q += "CROSS JOIN LATERAL (\n";

      const valuesParts = def.unpivot.pivotKeys.map((colQuery) => {
        // colQuery는 "TBL"."jan" 형태
        const colRef = this._qv(colQuery);
        const colName = this._extractColumnName(colRef);
        return `(${colRef}, '${colName}')`;
      });
      q += `  VALUES ${valuesParts.join(", ")}\n`;

      q += `) as ${this._qh.wrapNames("UPVT")}(${valueCol}, ${keyCol})\n`;
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
      q += `LIMIT ${def.limit[1]} OFFSET ${def.limit[0]}\n`;
    }
    if (def.top !== undefined) q += `LIMIT ${def.top}\n`;

    // LOCK
    if (typeof def.from === "string" && def.lock) q += "FOR UPDATE\n";

    // SAMPLE (PostgreSQL: ORDER BY RANDOM() LIMIT n)
    if (def.sample !== undefined) {
      // 기존 ORDER BY가 없으면 RANDOM() 추가
      if (def.orderBy == null || def.orderBy.length < 1) {
        q += `ORDER BY RANDOM()\n`;
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
      q += `) as ${def.as} ON TRUE`;
      return q;
    }

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
    const needsProc = def.disableFkCheck;

    // 프로시저 불필요: 배치 INSERT
    if (!needsProc) {
      return this._buildBatchInsert(def);
    }

    // 프로시저 필요: FK 체크 비활성화 (DO $$ 블록)
    let q = "DO $$\nBEGIN\n\n";
    q += `  ALTER TABLE ${tableName} DISABLE TRIGGER ALL;\n\n`;
    q += "  " + this._buildBatchInsert(def).replace(/\n/g, "\n  ") + "\n\n";
    q += `  ALTER TABLE ${tableName} ENABLE TRIGGER ALL;\n\n`;
    q += "END;\n$$;";

    return q.trim();
  }

  private _buildBatchInsert(def: IInsertQueryDef): string {
    const tableName = this._tn(def.from);
    const firstRecord = def.records[0];
    const columns = Object.keys(firstRecord); // unwrapped column names
    const hasOutput = def.output && def.output.length > 0;

    let q = `INSERT INTO ${tableName} (${columns.map((c) => this._qh.wrapNames(c)).join(", ")})\nVALUES\n`;
    q += def.records
      .map((record) => `  (${columns.map((col) => this._qv(record[col])).join(", ")})`)
      .join(",\n");
    if (hasOutput) {
      q += `\nRETURNING ${def.output!.map((o) => this._qh.wrapNames(o)).join(", ")}`;
    }
    return q + ";";
  }

  insertInto(def: IInsertIntoQueryDef): string {
    const targetName = this._tn(def.target);
    const selectCols = Object.keys(def.select).join(", "); // already wrapped in select
    // stopAutoIdentity는 PostgreSQL에서 의미 없음 (SERIAL/IDENTITY 자동 처리)
    return `INSERT INTO ${targetName} (${selectCols})\n${this.select(def as ISelectQueryDef)};`;
  }

  // ============================================
  // UPDATE
  // ============================================

  update(def: IUpdateQueryDef): string {
    const tableName = this._tn(def.from);
    const needsProc = def.disableFkCheck;

    // 프로시저 불필요
    if (!needsProc) {
      return this._buildSimpleUpdate(def);
    }

    // 프로시저 필요: FK 체크 비활성화 (DO $$ 블록)
    let q = "DO $$\nBEGIN\n\n";
    q += `  ALTER TABLE ${tableName} DISABLE TRIGGER ALL;\n\n`;
    q += "  " + this._buildSimpleUpdate(def).replace(/\n/g, "\n  ") + "\n\n";
    q += `  ALTER TABLE ${tableName} ENABLE TRIGGER ALL;\n\n`;
    q += "END;\n$$;";

    return q.trim();
  }

  private _buildSimpleUpdate(def: IUpdateQueryDef): string {
    const tableName = this._tn(def.from);
    const alias = this._qh.wrapNames(def.as);

    let q = `UPDATE ${tableName} as ${alias}\nSET\n`;
    // PostgreSQL UPDATE SET에서는 alias 없이
    q +=
      Object.entries(def.record)
        .map(([k, v]) => `  ${this._qh.wrapNames(k)} = ${this._qv(v)}`)
        .join(",\n") + "\n";

    // FROM for JOIN
    if (def.join != null && def.join.length > 0) {
      const joinTables = def.join
        .filter((j) => typeof j.from === "string")
        .map((j) => `${j.from} as ${j.as}`);
      if (joinTables.length) q += `FROM ${joinTables.join(", ")}\n`;
    }

    if (def.where != null && def.where.length > 0)
      q += `WHERE ${def.where.map((w) => this._qv(w)).join(" AND ")}\n`;

    // JOIN conditions
    if (def.join != null && def.join.length > 0) {
      for (const j of def.join) {
        if (j.where && j.where.length > 0)
          q += `  AND ${j.where.map((w) => this._qv(w)).join(" AND ")}\n`;
      }
    }

    if (def.output != null)
      q += `RETURNING ${def.output.map((o) => this._qh.wrapNames(o)).join(", ")}\n`;

    return q.trim() + ";";
  }

  // ============================================
  // DELETE
  // ============================================

  delete(def: IDeleteQueryDef): string {
    if (!def.as) throw new Error("DELETE에는 as가 필요합니다.");

    const tableName = this._tn(def.from);
    const needsProc = def.disableFkCheck;

    // 프로시저 불필요
    if (!needsProc) {
      return this._buildSimpleDelete(def);
    }

    // 프로시저 필요: FK 체크 비활성화 (DO $$ 블록)
    let q = "DO $$\nBEGIN\n\n";
    q += `ALTER TABLE ${tableName} DISABLE TRIGGER ALL;\n\n`;
    q += this._buildSimpleDelete(def) + "\n\n";
    q += `ALTER TABLE ${tableName} ENABLE TRIGGER ALL;\n\n`;
    q += "END;\n$$;";

    return q.trim();
  }

  private _buildSimpleDelete(def: IDeleteQueryDef): string {
    const tableName = this._tn(def.from);
    const alias = this._qh.wrapNames(def.as);

    let q = `DELETE FROM ${tableName} as ${alias}\n`;

    // USING for JOIN
    if (def.join != null && def.join.length > 0) {
      const joinTables = def.join
        .filter((j) => typeof j.from === "string")
        .map((j) => `${j.from} as ${j.as}`);
      if (joinTables.length) q += `USING ${joinTables.join(", ")}\n`;
    }

    if (def.where != null && def.where.length > 0)
      q += `WHERE ${def.where.map((w) => this._qv(w)).join(" AND ")}\n`;

    // JOIN conditions
    if (def.join != null && def.join.length > 0) {
      for (const j of def.join) {
        if (j.where && j.where.length > 0)
          q += `  AND ${j.where.map((w) => this._qv(w)).join(" AND ")}\n`;
      }
    }

    if (def.output != null)
      q += `RETURNING ${def.output.map((o) => this._qh.wrapNames(o)).join(", ")}\n`;

    return q.trim() + ";";
  }

  // ============================================
  // UPSERT (ON CONFLICT)
  // ============================================

  upsert(def: IUpsertQueryDef): string {
    const tableName = this._tn(def.from);
    const insertCols = Object.keys(def.insertRecord); // unwrapped column names

    let q = `INSERT INTO ${tableName} (${insertCols.map((c) => this._qh.wrapNames(c)).join(", ")})\n`;
    q += `VALUES (${Object.values(def.insertRecord)
      .map((v) => this._qv(v))
      .join(", ")})\n`;

    if (def.pkColNames.length > 0) {
      q += `ON CONFLICT (${def.pkColNames.map((pk) => this._qh.wrapNames(pk)).join(", ")})`;
      if (Object.keys(def.updateRecord).length > 0) {
        q += " DO UPDATE SET\n";
        q +=
          Object.entries(def.updateRecord)
            .map(([k, v]) => `  ${this._qh.wrapNames(k)} = ${this._qv(v)}`)
            .join(",\n") + "\n";
      } else {
        q += " DO NOTHING\n";
      }
    }

    if (def.output != null)
      q += `RETURNING ${def.output.map((o) => this._qh.wrapNames(o)).join(", ")}\n`;

    return q.trim() + ";";
  }

  // ============================================
  // INSERT IF NOT EXISTS
  // ============================================

  insertIfNotExists(def: IInsertIfNotExistsQueryDef): string {
    const tableName = this._tn(def.from);
    const alias = this._qh.wrapNames(def.as);
    const insertCols = Object.keys(def.insertRecord); // unwrapped column names

    let q = `INSERT INTO ${tableName} (${insertCols.map((c) => this._qh.wrapNames(c)).join(", ")})\n`;
    q += `SELECT ${Object.values(def.insertRecord).map((v) => this._qv(v)).join(", ")}\n`;
    q += `WHERE NOT EXISTS (\n`;
    q += `  SELECT 1 FROM ${tableName} as ${alias}\n`;
    q += `  WHERE ${def.where.map((w) => this._qv(w)).join(" AND ")}\n`;
    q += `)\n`;
    if (def.output != null)
      q += `RETURNING ${def.output.map((o) => this._qh.wrapNames(o)).join(", ")}\n`;
    return q.trim() + ";";
  }

  // ============================================
  // DDL - Database
  // ============================================

  createDatabase(def: ICreateDatabaseQueryDef): string {
    return `CREATE DATABASE ${this._qh.wrapNames(def.database)}`;
  }

  clearDatabase(_def: IClearDatabaseQueryDef): string {
    return `
DO $$
DECLARE
  r RECORD;
BEGIN
  -- 함수 삭제 (시스템 스키마 제외, 집계함수 제외)
  FOR r IN (
    SELECT n.nspname as schema, p.proname as name, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema') AND NOT p.proisagg
  ) LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS "' || r.schema || '"."' || r.name || '"(' || r.args || ') CASCADE';
  END LOOP;

  -- 뷰 삭제 (시스템 스키마 제외)
  FOR r IN (
    SELECT schemaname, viewname FROM pg_views
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  ) LOOP
    EXECUTE 'DROP VIEW IF EXISTS "' || r.schemaname || '"."' || r.viewname || '" CASCADE';
  END LOOP;

  -- 테이블 삭제 (시스템 스키마 제외, FK 자동 삭제를 위해 CASCADE)
  FOR r IN (
    SELECT schemaname, tablename FROM pg_tables
    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  ) LOOP
    EXECUTE 'DROP TABLE IF EXISTS "' || r.schemaname || '"."' || r.tablename || '" CASCADE';
  END LOOP;
END$$;`.trim();
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
      // autoIncrement인 경우 SERIAL/BIGSERIAL 사용 (PostgreSQL 9.x 호환)
      let dataType = col.dataType;
      if (col.autoIncrement) {
        if (col.dataType === "BIGINT") {
          dataType = "BIGSERIAL";
        } else {
          dataType = "SERIAL";
        }
      }
      let colDef = `  ${this._qh.wrapNames(col.name)} ${dataType}`;
      colDef += col.nullable ? " NULL" : " NOT NULL";
      if (col.defaultValue != null) colDef += ` DEFAULT ${this._qv(col.defaultValue)}`;
      colDefs.push(colDef);
    }

    // PK 제약조건
    if (def.primaryKeys.length > 0) {
      const pkCols = def.primaryKeys.map((pk) => this._qh.wrapNames(pk.columnName)).join(", ");
      colDefs.push(`  CONSTRAINT "PK_${def.table.name}" PRIMARY KEY (${pkCols})`);
    }

    q += colDefs.join(",\n") + "\n);";
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
    return `CREATE OR REPLACE FUNCTION ${this._tn(def.procedure)}() RETURNS VOID AS $$ BEGIN ${def.query}; END; $$ LANGUAGE plpgsql;`;
  }

  executeProcedure(def: IExecuteProcedureQueryDef): string {
    return `SELECT ${this._tn(def.procedure)}();`;
  }

  // ============================================
  // Meta Queries
  // ============================================

  getDatabaseInfo(def: IGetDatabaseInfoDef): string {
    return `SELECT * FROM pg_database WHERE datname = '${def.database}'`;
  }

  getTableInfos(def: IGetTableInfosDef): string {
    const schema = def.schema ?? "public";
    if (def.database == null)
      return `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}' AND table_type = 'BASE TABLE'`;
    return `SELECT table_name FROM information_schema.tables WHERE table_catalog = '${def.database}' AND table_schema = '${schema}' AND table_type = 'BASE TABLE'`;
  }

  getTableInfo(def: IGetTableInfoDef): string {
    const schema = def.table.schema ?? "public";
    return `SELECT * FROM information_schema.tables WHERE table_name = '${def.table.name}' AND table_schema = '${schema}'`;
  }

  getTableColumnInfos(def: IGetTableColumnInfosDef): string {
    const schema = def.table.schema ?? "public";
    return `SELECT * FROM information_schema.columns WHERE table_name = '${def.table.name}' AND table_schema = '${schema}'`;
  }

  getTablePrimaryKeys(def: IGetTablePrimaryKeysDef): string {
    const schema = def.table.schema ?? "public";
    return `SELECT a.attname as column_name FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) WHERE i.indrelid = '${schema}.${def.table.name}'::regclass AND i.indisprimary`;
  }

  getTableForeignKeys(def: IGetTableForeignKeysDef): string {
    const schema = def.table.schema ?? "public";
    return `SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = '${def.table.name}' AND tc.table_schema = '${schema}'`;
  }

  getTableIndexes(def: IGetTableIndexesDef): string {
    const schema = def.table.schema ?? "public";
    return `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = '${def.table.name}' AND schemaname = '${schema}' AND indexname NOT LIKE '%_pkey'`;
  }

  // ============================================
  // Utils
  // ============================================

  getDataTypeString(dataType: TDataType): string {
    switch (dataType.type) {
      case "int":
        return "INTEGER";
      case "bigint":
        return "BIGINT";
      case "float":
        return "REAL";
      case "double":
        return "DOUBLE PRECISION";
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
        return "BYTEA";
      case "boolean":
        return "BOOLEAN";
      case "datetime":
        return "TIMESTAMP";
      case "date":
        return "DATE";
      case "time":
        return "TIME";
      case "uuid":
        return "UUID";
      default:
        throw new Error(`Unknown data type: ${(dataType as any).type}`);
    }
  }

  // ============================================
  // UNPIVOT 헬퍼
  // ============================================

  /** "TBL"."jan" → jan (컬럼명만 추출) */
  private _extractColumnName(str: string): string {
    // "xxx"."yyy" 패턴에서 yyy 추출
    const match = str.match(/"([^"]+)"$/);
    return match ? match[1] : str;
  }
}
