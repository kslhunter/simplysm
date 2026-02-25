import type {
  AddColumnQueryDef,
  AddFkQueryDef,
  AddIdxQueryDef,
  AddPkQueryDef,
  ClearSchemaQueryDef,
  CreateProcQueryDef,
  CreateTableQueryDef,
  CreateViewQueryDef,
  SchemaExistsQueryDef,
  DeleteQueryDef,
  DropColumnQueryDef,
  DropFkQueryDef,
  DropIdxQueryDef,
  DropPkQueryDef,
  DropProcQueryDef,
  DropTableQueryDef,
  DropViewQueryDef,
  ExecProcQueryDef,
  InsertIfNotExistsQueryDef,
  InsertIntoQueryDef,
  InsertQueryDef,
  ModifyColumnQueryDef,
  QueryDefObjectName,
  RenameColumnQueryDef,
  RenameTableQueryDef,
  SelectQueryDef,
  SelectQueryDefJoin,
  SwitchFkQueryDef,
  TruncateQueryDef,
  UpdateQueryDef,
  UpsertQueryDef,
} from "../../types/query-def";
import type { QueryBuildResult } from "../../types/db";
import { QueryBuilderBase } from "../base/query-builder-base";
import { MssqlExprRenderer } from "./mssql-expr-renderer";

/**
 * MSSQL QueryBuilder
 */
export class MssqlQueryBuilder extends QueryBuilderBase {
  protected expr = new MssqlExprRenderer((def) => this.select(def).sql);

  //#region ========== 유틸리티 ==========

  /** Table명 Render */
  protected tableName(obj: QueryDefObjectName): string {
    const parts: string[] = [];
    if (obj.database != null) {
      parts.push(this.expr.wrap(obj.database));
    }
    if (obj.schema != null) {
      parts.push(this.expr.wrap(obj.schema));
    } else if (obj.database != null) {
      parts.push("[dbo]");
    }
    parts.push(this.expr.wrap(obj.name));
    return parts.join(".");
  }

  /** OFFSET...FETCH 절 Render */
  protected renderLimit(limit: [number, number] | undefined): string {
    if (limit == null) return "";
    const [offset, count] = limit;
    return ` OFFSET ${offset} ROWS FETCH NEXT ${count} ROWS ONLY`;
  }

  protected renderJoin(join: SelectQueryDefJoin): string {
    const alias = this.expr.wrap(join.as);

    // LATERAL JOIN 필요 여부 감지 → MSSQL은 OUTER APPLY 사용
    if (this.needsLateral(join)) {
      // from이 배열(UNION ALL)이면 renderFrom(join.from),
      // 그 외(orderBy, top, select 등)면 renderFrom(join)으로 Subquery Generate
      const from = Array.isArray(join.from) ? this.renderFrom(join.from) : this.renderFrom(join);
      return ` OUTER APPLY ${from} AS ${alias}`;
    }

    // 일반 JOIN
    const from = this.renderFrom(join.from);
    const where =
      join.where != null && join.where.length > 0
        ? ` ON ${this.expr.renderWhere(join.where)}`
        : " ON 1=1";
    return ` LEFT OUTER JOIN ${from} AS ${alias}${where}`;
  }

  //#endregion

  //#region ========== DML - SELECT ==========

  protected select(def: SelectQueryDef): QueryBuildResult {
    // WITH (CTE)
    let sql = "";
    if (def.with != null) {
      const { name, base, recursive } = def.with;
      sql += `WITH ${this.expr.wrap(name)} AS (${this.select(base).sql} UNION ALL ${this.select(recursive).sql}) `;
    }

    // SELECT
    sql += "SELECT";
    if (def.distinct) {
      sql += " DISTINCT";
    }
    // TOP
    if (def.top != null) {
      sql += ` TOP ${def.top}`;
    }

    // columns
    if (def.select != null) {
      const cols = Object.entries(def.select).map(
        ([alias, expr]) => `${this.expr.render(expr)} AS ${this.expr.wrap(alias)}`,
      );
      sql += ` ${cols.join(", ")}`;
    } else {
      sql += " *";
    }

    // FROM
    if (def.from != null) {
      const from = this.renderFrom(def.from);
      sql += ` FROM ${from} AS ${this.expr.wrap(def.as)}`;

      // LOCK (ROWLOCK으로 row 수준 락 강제 - MySQL/PostgreSQL FOR UPDATE와 동일 Behavior)
      if (def.lock) {
        sql += " WITH (UPDLOCK, ROWLOCK)";
      }
    }

    // JOINs
    sql += this.renderJoins(def.joins);

    // WHERE
    sql += this.renderWhere(def.where);

    // GROUP BY
    sql += this.renderGroupBy(def.groupBy);

    // HAVING
    sql += this.renderHaving(def.having);

    // ORDER BY
    sql += this.renderOrderBy(def.orderBy);

    // LIMIT (OFFSET...FETCH)
    sql += this.renderLimit(def.limit);

    return { sql };
  }

  //#endregion

  //#region ========== DML - INSERT ==========

  protected insert(def: InsertQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);

    if (def.records.length === 0) {
      throw new Error("INSERT requires at least one record.");
    }

    const columns = Object.keys(def.records[0]);
    const colList = columns.map((c) => this.expr.wrap(c)).join(", ");

    let sql = "";

    // IDENTITY_INSERT ON (AI 컬럼에 explicit value 삽입 시)
    if (def.overrideIdentity) {
      sql += `SET IDENTITY_INSERT ${table} ON;\n`;
    }

    sql += `INSERT INTO ${table} (${colList})`;

    // OUTPUT (MSSQL 네이티브 지원)
    if (def.output != null) {
      const outputCols = def.output.columns.map((c) => `INSERTED.${this.expr.wrap(c)}`).join(", ");
      sql += ` OUTPUT ${outputCols}`;
    }

    sql += ` VALUES`;

    const valuesList = def.records.map((record) => {
      const values = columns.map((c) => this.expr.escapeValue(record[c]));
      return `(${values.join(", ")})`;
    });
    sql += ` ${valuesList.join(", ")}`;

    // IDENTITY_INSERT OFF
    if (def.overrideIdentity) {
      sql += `;\nSET IDENTITY_INSERT ${table} OFF;`;
    }

    // overrideIdentity 시: SET ON → results[0], INSERT → results[1], SET OFF → results[2]
    return { sql, resultSetIndex: def.overrideIdentity ? 1 : undefined };
  }

  protected insertIfNotExists(def: InsertIfNotExistsQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);

    const columns = Object.keys(def.record);
    const colList = columns.map((c) => this.expr.wrap(c)).join(", ");
    const values = columns.map((c) => this.expr.escapeValue(def.record[c])).join(", ");

    // existsSelectQuery를 SELECT 1 AS _ 형태로 Render
    const existsQuerySql = this.select({
      ...def.existsSelectQuery,
      select: { _: { type: "value", value: 1 } },
    }).sql;

    let sql = `INSERT INTO ${table} (${colList})`;

    // OUTPUT (MSSQL: OUTPUT은 SELECT 앞에 위치해야 함)
    if (def.output != null) {
      const outputCols = def.output.columns.map((c) => `INSERTED.${this.expr.wrap(c)}`).join(", ");
      sql += ` OUTPUT ${outputCols}`;
    }

    sql += ` SELECT ${values} WHERE NOT EXISTS (${existsQuerySql})`;

    return { sql };
  }

  protected insertInto(def: InsertIntoQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);
    const selectSql = this.select(def.recordsSelectQuery).sql;

    // INSERT INTO SELECT에서 columns 추출
    const selectDef = def.recordsSelectQuery;
    const colList =
      selectDef.select != null
        ? Object.keys(selectDef.select)
            .map((c) => this.expr.wrap(c))
            .join(", ")
        : "*";

    let sql = `INSERT INTO ${table} (${colList})`;

    // OUTPUT
    if (def.output != null) {
      const outputCols = def.output.columns.map((c) => `INSERTED.${this.expr.wrap(c)}`).join(", ");
      sql += ` OUTPUT ${outputCols}`;
    }

    sql += ` ${selectSql}`;
    return { sql };
  }

  //#endregion

  //#region ========== DML - UPDATE ==========

  protected update(def: UpdateQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);
    const alias = this.expr.wrap(def.as);

    // SET
    const setParts = Object.entries(def.record).map(
      ([col, e]) => `${alias}.${this.expr.wrap(col)} = ${this.expr.render(e)}`,
    );

    let sql = "UPDATE";
    if (def.top != null) {
      sql += ` TOP ${def.top}`;
    }
    sql += ` ${alias} SET ${setParts.join(", ")}`;

    // OUTPUT
    if (def.output != null) {
      const outputCols = def.output.columns.map((c) => `INSERTED.${this.expr.wrap(c)}`).join(", ");
      sql += ` OUTPUT ${outputCols}`;
    }

    sql += ` FROM ${table} AS ${alias}`;
    sql += this.renderJoins(def.joins);
    sql += this.renderWhere(def.where);

    return { sql };
  }

  //#endregion

  //#region ========== DML - DELETE ==========

  protected delete(def: DeleteQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);
    const alias = this.expr.wrap(def.as);

    let sql = "DELETE";
    if (def.top != null) {
      sql += ` TOP ${def.top}`;
    }
    sql += ` ${alias}`;

    // OUTPUT (MSSQL: DELETED for DELETE)
    if (def.output != null) {
      const outputCols = def.output.columns.map((c) => `DELETED.${this.expr.wrap(c)}`).join(", ");
      sql += ` OUTPUT ${outputCols}`;
    }

    sql += ` FROM ${table} AS ${alias}`;
    sql += this.renderJoins(def.joins);
    sql += this.renderWhere(def.where);

    return { sql };
  }

  //#endregion

  //#region ========== DML - UPSERT ==========

  protected upsert(def: UpsertQueryDef): QueryBuildResult {
    // MSSQL: MERGE 사용
    const table = this.tableName(def.table);
    const alias = this.expr.wrap(def.existsSelectQuery.as);
    const existsWhere = def.existsSelectQuery.where;

    // UPDATE SET 부분
    const updateSetParts = Object.entries(def.updateRecord).map(
      ([col, e]) => `${this.expr.wrap(col)} = ${this.expr.render(e)}`,
    );

    // INSERT 부분
    const insertColumns = Object.keys(def.insertRecord);
    const insertColList = insertColumns.map((c) => this.expr.wrap(c)).join(", ");
    const insertValues = insertColumns.map((c) => this.expr.render(def.insertRecord[c])).join(", ");

    let sql = `MERGE ${table} AS ${alias}\n`;
    sql += `USING (SELECT 1 AS [_]) AS [_src] ON `;
    sql +=
      existsWhere != null && existsWhere.length > 0 ? this.expr.renderWhere(existsWhere) : "1=0";

    if (updateSetParts.length > 0) {
      sql += `\nWHEN MATCHED THEN UPDATE SET ${updateSetParts.join(", ")}`;
    }

    sql += `\nWHEN NOT MATCHED THEN INSERT (${insertColList}) VALUES (${insertValues})`;

    // OUTPUT
    if (def.output != null) {
      const outputCols = def.output.columns.map((c) => `INSERTED.${this.expr.wrap(c)}`).join(", ");
      sql += `\nOUTPUT ${outputCols}`;
    }

    sql += ";";
    return { sql };
  }

  //#endregion

  //#region ========== DDL - Table ==========

  protected createTable(def: CreateTableQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);

    const colDefs = def.columns.map((col) => {
      let colSql = `${this.expr.wrap(col.name)} ${this.expr.renderDataType(col.dataType)}`;

      // nullable: true → NULL, else → NOT NULL
      if (col.nullable === true) {
        colSql += " NULL";
      } else {
        colSql += " NOT NULL";
      }

      if (col.autoIncrement) {
        colSql += " IDENTITY(1,1)";
      }

      if (col.default !== undefined) {
        colSql += ` DEFAULT ${this.expr.escapeValue(col.default)}`;
      }

      return colSql;
    });

    // Primary Key with CONSTRAINT name
    if (def.primaryKey != null && def.primaryKey.length > 0) {
      const pkCols = def.primaryKey.map((c) => this.expr.wrap(c)).join(", ");
      const pkName = this.expr.wrap(`PK_${def.table.name}`);
      colDefs.push(`CONSTRAINT ${pkName} PRIMARY KEY (${pkCols})`);
    }

    return { sql: `CREATE TABLE ${table} (\n  ${colDefs.join(",\n  ")}\n)` };
  }

  protected dropTable(def: DropTableQueryDef): QueryBuildResult {
    return { sql: `DROP TABLE ${this.tableName(def.table)}` };
  }

  protected renameTable(def: RenameTableQueryDef): QueryBuildResult {
    // MSSQL: sp_rename 사용
    const tableName = this.expr.escapeString(this.tableName(def.table));
    const newName = this.expr.escapeString(def.newName);
    return { sql: `EXEC sp_rename '${tableName}', '${newName}'` };
  }

  protected truncate(def: TruncateQueryDef): QueryBuildResult {
    // MSSQL: TRUNCATE는 IDENTITY automatic 리셋
    return { sql: `TRUNCATE TABLE ${this.tableName(def.table)}` };
  }

  //#endregion

  //#region ========== DDL - Column ==========

  protected addColumn(def: AddColumnQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);
    const col = def.column;

    let colSql = `${this.expr.wrap(col.name)} ${this.expr.renderDataType(col.dataType)}`;

    // nullable: true → NULL, else → NOT NULL
    if (col.nullable === true) {
      colSql += " NULL";
    } else {
      colSql += " NOT NULL";
    }

    if (col.autoIncrement) {
      colSql += " IDENTITY(1,1)";
    }

    if (col.default !== undefined) {
      colSql += ` DEFAULT ${this.expr.escapeValue(col.default)}`;
    }

    return { sql: `ALTER TABLE ${table} ADD ${colSql}` };
  }

  protected dropColumn(def: DropColumnQueryDef): QueryBuildResult {
    return {
      sql: `ALTER TABLE ${this.tableName(def.table)} DROP COLUMN ${this.expr.wrap(def.column)}`,
    };
  }

  protected modifyColumn(def: ModifyColumnQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);
    const col = def.column;

    let colSql = `${this.expr.wrap(col.name)} ${this.expr.renderDataType(col.dataType)}`;

    // nullable: true → NULL, else → NOT NULL
    if (col.nullable === true) {
      colSql += " NULL";
    } else {
      colSql += " NOT NULL";
    }

    // MSSQL: ALTER COLUMN (IDENTITY와 DEFAULT는 별도 처리 필요)
    return { sql: `ALTER TABLE ${table} ALTER COLUMN ${colSql}` };
  }

  protected renameColumn(def: RenameColumnQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);
    // MSSQL: sp_rename 사용
    const tableCol = this.expr.escapeString(`${table}.${def.column}`);
    const newName = this.expr.escapeString(def.newName);
    return { sql: `EXEC sp_rename '${tableCol}', '${newName}', 'COLUMN'` };
  }

  //#endregion

  //#region ========== DDL - Constraint ==========

  protected addPk(def: AddPkQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);
    const cols = def.columns.map((c) => this.expr.wrap(c)).join(", ");
    const pkName = `PK_${def.table.name}`;
    return {
      sql: `ALTER TABLE ${table} ADD CONSTRAINT ${this.expr.wrap(pkName)} PRIMARY KEY (${cols})`,
    };
  }

  protected dropPk(def: DropPkQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);
    const pkName = `PK_${def.table.name}`;
    return { sql: `ALTER TABLE ${table} DROP CONSTRAINT ${this.expr.wrap(pkName)}` };
  }

  protected addFk(def: AddFkQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);
    const fk = def.foreignKey;
    const fkCols = fk.fkColumns.map((c) => this.expr.wrap(c)).join(", ");
    const targetTable = this.tableName(fk.targetTable);
    const targetCols = fk.targetPkColumns.map((c) => this.expr.wrap(c)).join(", ");

    let sql = `ALTER TABLE ${table} ADD CONSTRAINT ${this.expr.wrap(fk.name)} FOREIGN KEY (${fkCols}) REFERENCES ${targetTable} (${targetCols})`;

    // MSSQL/PostgreSQL: FK용 Index 별도 Generate 필요
    const idxName = `IDX_${def.table.name}_${fk.name.replace(/^FK_/, "")}`;
    sql += `;\nCREATE INDEX ${this.expr.wrap(idxName)} ON ${table} (${fkCols});`;

    return { sql };
  }

  protected dropFk(def: DropFkQueryDef): QueryBuildResult {
    return {
      sql: `ALTER TABLE ${this.tableName(def.table)} DROP CONSTRAINT ${this.expr.wrap(def.foreignKey)}`,
    };
  }

  protected addIdx(def: AddIdxQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);
    const idx = def.index;
    const cols = idx.columns.map((c) => `${this.expr.wrap(c.name)} ${c.orderBy}`).join(", ");
    const unique = idx.unique ? "UNIQUE " : "";
    return { sql: `CREATE ${unique}INDEX ${this.expr.wrap(idx.name)} ON ${table} (${cols})` };
  }

  protected dropIdx(def: DropIdxQueryDef): QueryBuildResult {
    return { sql: `DROP INDEX ${this.expr.wrap(def.index)} ON ${this.tableName(def.table)}` };
  }

  //#endregion

  //#region ========== DDL - View/Procedure ==========

  protected createView(def: CreateViewQueryDef): QueryBuildResult {
    const view = this.tableName(def.view);
    const selectSql = this.select(def.queryDef).sql;
    // MSSQL: CREATE OR ALTER VIEW (2016 SP1+)
    return { sql: `CREATE OR ALTER VIEW ${view} AS ${selectSql}` };
  }

  protected dropView(def: DropViewQueryDef): QueryBuildResult {
    return { sql: `DROP VIEW IF EXISTS ${this.tableName(def.view)}` };
  }

  protected createProc(def: CreateProcQueryDef): QueryBuildResult {
    const proc = this.tableName(def.procedure);

    // params 처리
    const paramList =
      def.params
        ?.map((p) => {
          let sql = `@${p.name} ${this.expr.renderDataType(p.dataType)}`;
          if (p.default !== undefined) {
            sql += ` = ${this.expr.escapeValue(p.default)}`;
          }
          return sql;
        })
        .join(", ") ?? "";

    let sql = `CREATE OR ALTER PROCEDURE ${proc}`;
    if (paramList) {
      sql += ` ${paramList}`;
    }
    sql += `\nAS\nBEGIN\n`;
    sql += `SET NOCOUNT ON;\n`;
    sql += def.query;
    sql += `\nEND`;

    return { sql };
  }

  protected dropProc(def: DropProcQueryDef): QueryBuildResult {
    return { sql: `DROP PROCEDURE IF EXISTS ${this.tableName(def.procedure)}` };
  }

  protected execProc(def: ExecProcQueryDef): QueryBuildResult {
    const proc = this.tableName(def.procedure);
    if (def.params == null || Object.keys(def.params).length === 0) {
      return { sql: `EXEC ${proc}` };
    }
    const params = Object.values(def.params)
      .map((p) => this.expr.render(p))
      .join(", ");
    return { sql: `EXEC ${proc} ${params}` };
  }

  //#endregion

  //#region ========== Utils ==========

  protected clearSchema(def: ClearSchemaQueryDef): QueryBuildResult {
    // SQL Injection 방지: 식별자 유효성 Validation
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(def.database)) {
      throw new Error(`Invalid database name: ${def.database}`);
    }
    const schemaName = def.schema ?? "dbo";
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaName)) {
      throw new Error(`Invalid schema name: ${schemaName}`);
    }

    const db = this.expr.wrap(def.database);
    const schema = this.expr.escapeString(schemaName);
    return {
      sql: `
DECLARE @sql NVARCHAR(MAX);
SET @sql = N'';

-- FK constraint Delete
SELECT @sql = @sql + N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + N' DROP CONSTRAINT ' + QUOTENAME(name) + N';' + CHAR(13)
FROM ${db}.sys.foreign_keys
WHERE OBJECT_SCHEMA_NAME(parent_object_id) = '${schema}';

-- Drop table
SELECT @sql = @sql + N'DROP TABLE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(name) + N';' + CHAR(13)
FROM ${db}.sys.tables
WHERE SCHEMA_NAME(schema_id) = '${schema}';

-- Drop view
SELECT @sql = @sql + N'DROP VIEW ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(name) + N';' + CHAR(13)
FROM ${db}.sys.views
WHERE schema_id = SCHEMA_ID('${schema}');

-- Procedure Delete
SELECT @sql = @sql + N'DROP PROCEDURE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(name) + N';' + CHAR(13)
FROM ${db}.sys.procedures
WHERE SCHEMA_NAME(schema_id) = '${schema}';

EXEC sp_executesql @sql;`,
    };
  }

  protected schemaExists(def: SchemaExistsQueryDef): QueryBuildResult {
    // SQL Injection 방지: 식별자 유효성 Validation
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(def.database)) {
      throw new Error(`Invalid database name: ${def.database}`);
    }
    const schemaName = def.schema ?? "dbo";
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schemaName)) {
      throw new Error(`Invalid schema name: ${schemaName}`);
    }

    const dbName = this.expr.escapeString(def.database);
    const schema = this.expr.escapeString(schemaName);
    // MSSQL: database 존재 확인 후 schema 확인 (동적 SQL 사용)
    return {
      sql: `DECLARE @result NVARCHAR(MAX) = NULL;
IF EXISTS (SELECT 1 FROM sys.databases WHERE name = '${dbName}')
BEGIN
  DECLARE @sql NVARCHAR(MAX) = N'SELECT @result = name FROM ' + QUOTENAME('${dbName}') + N'.sys.schemas WHERE name = ''${schema}''';
  EXEC sp_executesql @sql, N'@result NVARCHAR(MAX) OUTPUT', @result OUTPUT;
END
SELECT @result AS name WHERE @result IS NOT NULL`,
    };
  }

  protected switchFk(def: SwitchFkQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);
    if (def.switch === "on") {
      return { sql: `ALTER TABLE ${table} WITH CHECK CHECK CONSTRAINT ALL` };
    }
    return { sql: `ALTER TABLE ${table} NOCHECK CONSTRAINT ALL` };
  }

  //#endregion
}
