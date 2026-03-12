import { Uuid } from "@simplysm/core-common";
import type {
  AddColumnQueryDef,
  AddForeignKeyQueryDef,
  AddIndexQueryDef,
  AddPrimaryKeyQueryDef,
  ClearSchemaQueryDef,
  CreateProcQueryDef,
  CreateTableQueryDef,
  CreateViewQueryDef,
  SchemaExistsQueryDef,
  DeleteQueryDef,
  DropColumnQueryDef,
  DropForeignKeyQueryDef,
  DropIndexQueryDef,
  DropPrimaryKeyQueryDef,
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
import { MysqlExprRenderer } from "./mysql-expr-renderer";

/**
 * MySQL QueryBuilder
 *
 * MySQL specifics:
 * - No OUTPUT support: workaround via multi-statement pattern (INSERT + SET @var + SELECT)
 * - INSERT OUTPUT: uses LAST_INSERT_ID() for AI column, extracts PK from record for non-AI
 * - UPDATE/UPSERT OUTPUT: saves PK to temp table first since WHERE condition may change after UPDATE, then SELECT
 * - DELETE OUTPUT: saves output columns to temp table before delete
 * - switchFk: global setting (SET FOREIGN_KEY_CHECKS), table parameter is ignored
 * - Index is automatically created when adding FK
 */
export class MysqlQueryBuilder extends QueryBuilderBase {
  protected expr = new MysqlExprRenderer((def) => this.select(def).sql);

  //#region ========== Utilities ==========

  /** Render table name (MySQL: ignores schema, uses database.table only) */
  protected tableName(obj: QueryDefObjectName): string {
    if (obj.database != null) {
      return `${this.expr.wrap(obj.database)}.${this.expr.wrap(obj.name)}`;
    }
    return this.expr.wrap(obj.name);
  }

  /** Render LIMIT clause */
  protected renderLimit(limit: [number, number] | undefined, top: number | undefined): string {
    if (limit != null) {
      const [offset, count] = limit;
      return ` LIMIT ${offset}, ${count}`;
    }
    if (top != null) {
      return ` LIMIT ${top}`;
    }
    return "";
  }

  protected renderJoin(join: SelectQueryDefJoin): string {
    const alias = this.expr.wrap(join.as);

    // Detect if LATERAL JOIN is needed
    if (this.needsLateral(join)) {
      // If from is an array (UNION ALL), use renderFrom(join.from),
      // otherwise (orderBy, top, select, etc.) use renderFrom(join) to generate subquery
      const from = Array.isArray(join.from) ? this.renderFrom(join.from) : this.renderFrom(join);
      return ` LEFT OUTER JOIN LATERAL ${from} AS ${alias} ON TRUE`;
    }

    // Normal JOIN
    const from = this.renderFrom(join.from);
    const where =
      join.where != null && join.where.length > 0
        ? ` ON ${this.expr.renderWhere(join.where)}`
        : " ON TRUE";
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
    }

    // LOCK
    if (def.lock) {
      // MySQL: SELECT ... FOR UPDATE (appended at the end)
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

    // LIMIT
    sql += this.renderLimit(def.limit, def.top);

    // LOCK (FOR UPDATE at end)
    if (def.lock) {
      sql += " FOR UPDATE";
    }

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

    // No OUTPUT needed: simple batch INSERT
    if (def.output == null) {
      const valuesList = def.records.map((record) => {
        const values = columns.map((c) => this.expr.escapeValue(record[c]));
        return `(${values.join(", ")})`;
      });
      return { sql: `INSERT INTO ${table} (${colList}) VALUES ${valuesList.join(", ")}` };
    }

    // OUTPUT needed: execute INSERT + SELECT via multi-statement
    // Result sets: [INSERT result, SELECT result, INSERT result, SELECT result, ...]
    // → Extract only SELECT results with resultSetIndex=1, resultSetStride=2
    const output = def.output;
    const outputCols = output.columns.map((c) => this.expr.wrap(c)).join(", ");
    const statements: string[] = [];

    for (const record of def.records) {
      const values = columns.map((c) => this.expr.escapeValue(record[c])).join(", ");
      statements.push(`INSERT INTO ${table} (${colList}) VALUES (${values})`);

      // SELECT by PK (uses LAST_INSERT_ID() for aiColName)
      const whereForSelect = output.pkColNames.map((pk) => {
        const wrappedPk = this.expr.wrap(pk);
        if (pk === output.aiColName) {
          return `${wrappedPk} = LAST_INSERT_ID()`;
        }
        return `${wrappedPk} = ${this.expr.escapeValue(record[pk])}`;
      });
      statements.push(`SELECT ${outputCols} FROM ${table} WHERE ${whereForSelect.join(" AND ")}`);
    }

    return {
      sql: statements.join(";\n"),
      resultSetIndex: 1,
      resultSetStride: 2,
    };
  }

  protected insertIfNotExists(def: InsertIfNotExistsQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);

    const columns = Object.keys(def.record);
    const colList = columns.map((c) => this.expr.wrap(c)).join(", ");
    const values = columns.map((c) => this.expr.escapeValue(def.record[c])).join(", ");

    // Render existsSelectQuery as SELECT 1 AS _
    const existsQuerySql = this.select({
      ...def.existsSelectQuery,
      select: { _: { type: "value", value: 1 } },
    }).sql;

    // No OUTPUT needed: simple INSERT IF NOT EXISTS
    if (def.output == null) {
      const sql = `INSERT INTO ${table} (${colList}) SELECT ${values} WHERE NOT EXISTS (${existsQuerySql})`;
      return { sql };
    }

    // OUTPUT needed: multi-statement (INSERT + SET @affected + SELECT)
    const output = def.output;
    const outputCols = output.columns.map((c) => this.expr.wrap(c)).join(", ");

    // SELECT WHERE condition for OUTPUT
    const whereForSelect = output.pkColNames.map((pk) => {
      const wrappedPk = this.expr.wrap(pk);
      if (pk === output.aiColName) {
        return `${wrappedPk} = LAST_INSERT_ID()`;
      }
      return `${wrappedPk} = ${this.expr.escapeValue(def.record[pk])}`;
    });

    // multi-statement: INSERT → SET @affected → SELECT (result only if inserted)
    const statements = [
      `INSERT INTO ${table} (${colList}) SELECT ${values} WHERE NOT EXISTS (${existsQuerySql})`,
      `SET @sd_affected = ROW_COUNT()`,
      `SELECT ${outputCols} FROM ${table} WHERE ${whereForSelect.join(" AND ")} AND @sd_affected > 0`,
    ];

    // results[0]=INSERT, results[1]=SET(empty result), results[2]=SELECT
    return { sql: statements.join(";\n"), resultSetIndex: 2 };
  }

  protected insertInto(def: InsertIntoQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);
    const selectSql = this.select(def.recordsSelectQuery).sql;

    // Extract columns from INSERT INTO SELECT
    const selectDef = def.recordsSelectQuery;
    const colList =
      selectDef.select != null
        ? Object.keys(selectDef.select)
            .map((c) => this.expr.wrap(c))
            .join(", ")
        : "*";

    // No OUTPUT needed: simple INSERT INTO SELECT
    if (def.output == null) {
      return { sql: `INSERT INTO ${table} (${colList}) ${selectSql}` };
    }

    // OUTPUT needed: multi-statement
    const outputCols = def.output.columns.map((c) => this.expr.wrap(c)).join(", ");

    // When PK is AI: query range via LAST_INSERT_ID() + ROW_COUNT()
    if (def.output.aiColName != null) {
      const aiCol = this.expr.wrap(def.output.aiColName);

      const statements = [
        `INSERT INTO ${table} (${colList}) ${selectSql}`,
        `SET @sd_first_id = LAST_INSERT_ID(), @sd_count = ROW_COUNT()`,
        `SELECT ${outputCols} FROM ${table} WHERE ${aiCol} >= @sd_first_id AND ${aiCol} < @sd_first_id + @sd_count`,
      ];

      // results[0]=INSERT, results[1]=SET(empty result), results[2]=SELECT
      return { sql: statements.join(";\n"), resultSetIndex: 2 };
    }

    // PK is not AI: save PKs to temp table then query
    const tempTableName = this.expr.wrap("SD_TEMP_" + Uuid.generate().toString().replace(/-/g, ""));

    // Generate SELECT extracting only PK columns from recordsSelectQuery
    const pkSelectDef: SelectQueryDef = {
      ...def.recordsSelectQuery,
      select: Object.fromEntries(
        def.output.pkColNames.map((pk) => [pk, def.recordsSelectQuery.select![pk]]),
      ),
    };
    const pkSelectSql = this.select(pkSelectDef).sql;

    // SELECT from target using PK from temp table
    const pkConditions = def.output.pkColNames.map((pk) => {
      const wrappedPk = this.expr.wrap(pk);
      return `${table}.${wrappedPk} = ${tempTableName}.${wrappedPk}`;
    });

    const statements = [
      `CREATE TEMPORARY TABLE ${tempTableName} AS ${pkSelectSql}`,
      `INSERT INTO ${table} (${colList}) ${selectSql}`,
      `SELECT ${outputCols} FROM ${table}, ${tempTableName} WHERE ${pkConditions.join(" AND ")}`,
      `DROP TEMPORARY TABLE ${tempTableName}`,
    ];

    // results[0]=CREATE, results[1]=INSERT, results[2]=SELECT, results[3]=DROP
    return { sql: statements.join(";\n"), resultSetIndex: 2 };
  }

  //#endregion

  //#region ========== DML - UPDATE ==========

  protected update(def: UpdateQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);
    const alias = this.expr.wrap(def.as);

    // SET
    const setParts = Object.entries(def.record).map(
      ([col, expr]) => `${alias}.${this.expr.wrap(col)} = ${this.expr.render(expr)}`,
    );

    // No OUTPUT needed: simple UPDATE
    if (def.output == null) {
      let sql = `UPDATE ${table} AS ${alias}`;
      sql += this.renderJoins(def.joins);
      sql += ` SET ${setParts.join(", ")}`;
      sql += this.renderWhere(def.where);
      if (def.limit != null || def.top != null) {
        sql += this.renderLimit(def.limit, def.top);
      }
      return { sql };
    }

    // OUTPUT needed: multi-statement (save PK to temp table + UPDATE + SELECT + DROP)
    const outputCols = def.output.columns.map((c) => `${alias}.${this.expr.wrap(c)}`).join(", ");
    const tempTableName = this.expr.wrap("SD_TEMP_" + Uuid.generate().toString().replace(/-/g, ""));

    // Save target PKs to temp table (since WHERE condition may change after UPDATE)
    const pkSelectCols = def.output.pkColNames
      .map((pk) => `${alias}.${this.expr.wrap(pk)} AS ${this.expr.wrap(pk)}`)
      .join(", ");
    let createTempSql = `CREATE TEMPORARY TABLE ${tempTableName} AS SELECT ${pkSelectCols} FROM ${table} AS ${alias}`;
    createTempSql += this.renderJoins(def.joins);
    createTempSql += this.renderWhere(def.where);

    // UPDATE
    let updateSql = `UPDATE ${table} AS ${alias}`;
    updateSql += this.renderJoins(def.joins);
    updateSql += ` SET ${setParts.join(", ")}`;
    updateSql += this.renderWhere(def.where);
    if (def.top != null) updateSql += ` LIMIT ${def.top}`;

    // SELECT using PK from temp table (query updated values)
    const pkConditions = def.output.pkColNames.map((pk) => {
      const wrappedPk = this.expr.wrap(pk);
      return `${alias}.${wrappedPk} = ${tempTableName}.${wrappedPk}`;
    });
    const selectSql = `SELECT ${outputCols} FROM ${table} AS ${alias}, ${tempTableName} WHERE ${pkConditions.join(" AND ")}`;

    // Drop temp table
    const dropSql = `DROP TEMPORARY TABLE ${tempTableName}`;

    const statements = [createTempSql, updateSql, selectSql, dropSql];
    return { sql: statements.join(";\n"), resultSetIndex: 2 };
  }

  //#endregion

  //#region ========== DML - DELETE ==========

  protected delete(def: DeleteQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);
    const alias = this.expr.wrap(def.as);

    // No OUTPUT needed: simple DELETE
    if (def.output == null) {
      let sql = `DELETE ${alias} FROM ${table} AS ${alias}`;
      sql += this.renderJoins(def.joins);
      sql += this.renderWhere(def.where);
      if (def.limit != null || def.top != null) {
        sql += this.renderLimit(def.limit, def.top);
      }
      return { sql };
    }

    // OUTPUT needed: multi-statement (save to temp table before delete + DELETE + SELECT + DROP)
    const outputCols = def.output.columns.map((c) => `${alias}.${this.expr.wrap(c)}`).join(", ");
    const tempTableName = this.expr.wrap("SD_TEMP_" + Uuid.generate().toString().replace(/-/g, ""));

    // Save to temp table before delete
    let createTempSql = `CREATE TEMPORARY TABLE ${tempTableName} AS SELECT ${outputCols} FROM ${table} AS ${alias}`;
    createTempSql += this.renderJoins(def.joins);
    createTempSql += this.renderWhere(def.where);

    // Execute DELETE
    let deleteSql = `DELETE ${alias} FROM ${table} AS ${alias}`;
    deleteSql += this.renderJoins(def.joins);
    deleteSql += this.renderWhere(def.where);
    if (def.top != null) deleteSql += ` LIMIT ${def.top}`;

    // Return results from temp table
    const selectSql = `SELECT * FROM ${tempTableName}`;

    // Drop temp table
    const dropSql = `DROP TEMPORARY TABLE ${tempTableName}`;

    const statements = [createTempSql, deleteSql, selectSql, dropSql];
    return { sql: statements.join(";\n"), resultSetIndex: 2 };
  }

  //#endregion

  //#region ========== DML - UPSERT ==========

  protected upsert(def: UpsertQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);
    const alias = this.expr.wrap(def.existsSelectQuery.as);
    const existsQuerySql = this.select(def.existsSelectQuery).sql;

    // UPDATE SET part (alias.column format)
    const updateSetParts = Object.entries(def.updateRecord).map(
      ([col, e]) => `${alias}.${this.expr.wrap(col)} = ${this.expr.render(e)}`,
    );

    // INSERT part
    const insertColumns = Object.keys(def.insertRecord);
    const insertColList = insertColumns.map((c) => this.expr.wrap(c)).join(", ");
    const insertValues = insertColumns.map((c) => this.expr.render(def.insertRecord[c])).join(", ");

    // Extract WHERE condition (from existsSelectQuery's where)
    const whereCondition =
      def.existsSelectQuery.where != null && def.existsSelectQuery.where.length > 0
        ? this.expr.renderWhere(def.existsSelectQuery.where)
        : "1=1";

    // No OUTPUT needed: multi-statement (UPDATE + INSERT WHERE NOT EXISTS)
    if (def.output == null) {
      // UPDATE: updates if exists
      // INSERT SELECT WHERE NOT EXISTS: inserts if not exists
      const statements = [
        `UPDATE ${table} AS ${alias} SET ${updateSetParts.join(", ")} WHERE ${whereCondition}`,
        `INSERT INTO ${table} (${insertColList}) SELECT ${insertValues} WHERE NOT EXISTS (${existsQuerySql})`,
      ];
      return { sql: statements.join(";\n") };
    }

    // OUTPUT needed: multi-statement (CREATE TEMP + UPDATE + INSERT + SELECT + DROP)
    const outputCols = def.output.columns.map((c) => this.expr.wrap(c)).join(", ");
    const tempTableName = this.expr.wrap("SD_TEMP_" + Uuid.generate().toString().replace(/-/g, ""));

    // Save target PKs to temp table (since WHERE condition may change after UPDATE)
    const pkSelectCols = def.output.pkColNames.map((pk) => this.expr.wrap(pk)).join(", ");
    const createTempSql = `CREATE TEMPORARY TABLE ${tempTableName} AS SELECT ${pkSelectCols} FROM ${table} AS ${alias} WHERE ${whereCondition}`;

    // UPDATE (update if exists)
    const updateSql = `UPDATE ${table} AS ${alias} SET ${updateSetParts.join(", ")} WHERE ${whereCondition}`;

    // INSERT (NOT EXISTS Pattern)
    const insertSql = `INSERT INTO ${table} (${insertColList}) SELECT ${insertValues} WHERE NOT EXISTS (${existsQuerySql})`;

    // SELECT: query UPDATE result or INSERT result (merged with UNION ALL)
    // UPDATE case: query by PK from temp table
    const output = def.output;
    const updatePkConditions = output.pkColNames.map((pk) => {
      const wrappedPk = this.expr.wrap(pk);
      return `${table}.${wrappedPk} IN (SELECT ${wrappedPk} FROM ${tempTableName})`;
    });
    const selectUpdateSql = `SELECT ${outputCols} FROM ${table} WHERE ${updatePkConditions.join(" AND ")}`;

    // INSERT case: query by PK from insertRecord (LAST_INSERT_ID() for AI, only when temp table is empty)
    const insertPkConditions = output.pkColNames.map((pk) => {
      const wrappedPk = this.expr.wrap(pk);
      if (pk === output.aiColName) {
        return `${wrappedPk} = LAST_INSERT_ID()`;
      }
      const pkExpr = def.insertRecord[pk];
      return `${wrappedPk} = ${this.expr.render(pkExpr)}`;
    });
    const selectInsertSql = `SELECT ${outputCols} FROM ${table} WHERE ${insertPkConditions.join(" AND ")} AND NOT EXISTS (SELECT 1 FROM ${tempTableName})`;

    const selectSql = `${selectUpdateSql} UNION ALL ${selectInsertSql}`;

    // DROP
    const dropSql = `DROP TEMPORARY TABLE ${tempTableName}`;

    const statements = [createTempSql, updateSql, insertSql, selectSql, dropSql];
    return { sql: statements.join(";\n"), resultSetIndex: 3 };
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
        colSql += " AUTO_INCREMENT";
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
    return { sql: `RENAME TABLE ${this.tableName(def.table)} TO ${this.expr.wrap(def.newName)}` };
  }

  protected truncate(def: TruncateQueryDef): QueryBuildResult {
    // MySQL: TRUNCATE automatically resets AUTO_INCREMENT
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
      colSql += " AUTO_INCREMENT";
    }

    if (col.default !== undefined) {
      colSql += ` DEFAULT ${this.expr.escapeValue(col.default)}`;
    }

    return { sql: `ALTER TABLE ${table} ADD COLUMN ${colSql}` };
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

    if (col.autoIncrement) {
      colSql += " AUTO_INCREMENT";
    }

    if (col.default !== undefined) {
      colSql += ` DEFAULT ${this.expr.escapeValue(col.default)}`;
    }

    return { sql: `ALTER TABLE ${table} MODIFY COLUMN ${colSql}` };
  }

  protected renameColumn(def: RenameColumnQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);
    // MySQL 8.0+: RENAME COLUMN supported
    return {
      sql: `ALTER TABLE ${table} RENAME COLUMN ${this.expr.wrap(def.column)} TO ${this.expr.wrap(def.newName)}`,
    };
  }

  //#endregion

  //#region ========== DDL - Constraint ==========

  protected addPrimaryKey(def: AddPrimaryKeyQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);
    const cols = def.columns.map((c) => this.expr.wrap(c)).join(", ");
    return { sql: `ALTER TABLE ${table} ADD PRIMARY KEY (${cols})` };
  }

  protected dropPrimaryKey(def: DropPrimaryKeyQueryDef): QueryBuildResult {
    return { sql: `ALTER TABLE ${this.tableName(def.table)} DROP PRIMARY KEY` };
  }

  protected addForeignKey(def: AddForeignKeyQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);
    const fk = def.foreignKey;
    const fkCols = fk.fkColumns.map((c) => this.expr.wrap(c)).join(", ");
    const targetTable = this.tableName(fk.targetTable);
    const targetCols = fk.targetPkColumns.map((c) => this.expr.wrap(c)).join(", ");

    // MySQL automatically creates index when adding FK, so no separate index needed
    return {
      sql: `ALTER TABLE ${table} ADD CONSTRAINT ${this.expr.wrap(fk.name)} FOREIGN KEY (${fkCols}) REFERENCES ${targetTable} (${targetCols})`,
    };
  }

  protected dropForeignKey(def: DropForeignKeyQueryDef): QueryBuildResult {
    return {
      sql: `ALTER TABLE ${this.tableName(def.table)} DROP FOREIGN KEY ${this.expr.wrap(def.foreignKey)}`,
    };
  }

  protected addIndex(def: AddIndexQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);
    const idx = def.index;
    const cols = idx.columns.map((c) => `${this.expr.wrap(c.name)} ${c.orderBy}`).join(", ");
    const unique = idx.unique ? "UNIQUE " : "";
    return { sql: `CREATE ${unique}INDEX ${this.expr.wrap(idx.name)} ON ${table} (${cols})` };
  }

  protected dropIndex(def: DropIndexQueryDef): QueryBuildResult {
    return { sql: `DROP INDEX ${this.expr.wrap(def.index)} ON ${this.tableName(def.table)}` };
  }

  //#endregion

  //#region ========== DDL - View/Procedure ==========

  protected createView(def: CreateViewQueryDef): QueryBuildResult {
    const view = this.tableName(def.view);
    const selectSql = this.select(def.queryDef).sql;
    return { sql: `CREATE OR REPLACE VIEW ${view} AS ${selectSql}` };
  }

  protected dropView(def: DropViewQueryDef): QueryBuildResult {
    return { sql: `DROP VIEW IF EXISTS ${this.tableName(def.view)}` };
  }

  protected createProc(def: CreateProcQueryDef): QueryBuildResult {
    const proc = this.tableName(def.procedure);

    // Process params
    const paramList =
      def.params
        ?.map((p) => {
          let sql = `IN ${this.expr.wrap(p.name)} ${this.expr.renderDataType(p.dataType)}`;
          if (p.default !== undefined) {
            sql += ` DEFAULT ${this.expr.escapeValue(p.default)}`;
          }
          return sql;
        })
        .join(", ") ?? "";

    let sql = `CREATE PROCEDURE ${proc}(${paramList})\n`;
    sql += `BEGIN\n`;
    sql += def.query;
    if (!def.query.trim().endsWith(";")) {
      sql += ";";
    }
    sql += `\nEND`;

    return { sql };
  }

  protected dropProc(def: DropProcQueryDef): QueryBuildResult {
    return { sql: `DROP PROCEDURE IF EXISTS ${this.tableName(def.procedure)}` };
  }

  protected execProc(def: ExecProcQueryDef): QueryBuildResult {
    const proc = this.tableName(def.procedure);
    if (def.params == null || Object.keys(def.params).length === 0) {
      return { sql: `CALL ${proc}()` };
    }
    const params = Object.values(def.params)
      .map((p) => this.expr.render(p))
      .join(", ");
    return { sql: `CALL ${proc}(${params})` };
  }

  //#endregion

  //#region ========== Utils ==========

  protected clearSchema(def: ClearSchemaQueryDef): QueryBuildResult {
    // MySQL: DROP all tables (in MySQL, database and schema are synonymous)
    // Query table list from information_schema then DROP
    // SQL injection prevention: identifier validation
    if (!/^[a-zA-Z0-9_]+$/.test(def.database)) {
      throw new Error(`Invalid database name: ${def.database}`);
    }

    const dbName = this.expr.escapeString(def.database);
    return {
      sql: `
SET FOREIGN_KEY_CHECKS = 0;
SET @tables = NULL;
SELECT GROUP_CONCAT(table_name) INTO @tables FROM information_schema.tables WHERE table_schema = '${dbName}';
SET @drop_stmt = IF(@tables IS NULL, 'SELECT 1', CONCAT('DROP TABLE IF EXISTS ', @tables));
PREPARE stmt FROM @drop_stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
SET FOREIGN_KEY_CHECKS = 1`,
    };
  }

  protected schemaExists(def: SchemaExistsQueryDef): QueryBuildResult {
    // MySQL: database and schema are synonymous
    const dbName = this.expr.escapeString(def.database);
    return {
      sql: `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '${dbName}'`,
    };
  }

  /** MySQL only supports global setting (table parameter is ignored) */
  protected switchFk(def: SwitchFkQueryDef): QueryBuildResult {
    return def.enabled
      ? { sql: "SET FOREIGN_KEY_CHECKS = 1" }
      : { sql: "SET FOREIGN_KEY_CHECKS = 0" };
  }

  //#endregion
}
