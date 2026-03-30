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
 * MySQL 고유 사항:
 * - OUTPUT 미지원: multi-statement 패턴으로 우회 (INSERT + SET @var + SELECT)
 * - INSERT OUTPUT: AI column은 LAST_INSERT_ID() 사용, 비 AI는 레코드에서 PK 추출
 * - UPDATE/UPSERT OUTPUT: UPDATE 후 WHERE 조건이 변경될 수 있으므로 먼저 PK를 임시 테이블에 저장 후 SELECT
 * - DELETE OUTPUT: 삭제 전 output column을 임시 테이블에 저장
 * - switchFk: 전역 설정 (SET FOREIGN_KEY_CHECKS), table 파라미터 무시
 * - FK 추가 시 인덱스 자동 생성
 */
export class MysqlQueryBuilder extends QueryBuilderBase {
  protected expr = new MysqlExprRenderer((def) => this.select(def).sql);

  //#region ========== Utilities ==========

  /** 테이블명 렌더링 (MySQL: schema 무시, database.table만 사용) */
  protected tableName(obj: QueryDefObjectName): string {
    if (obj.database != null) {
      return `${this.expr.wrap(obj.database)}.${this.expr.wrap(obj.name)}`;
    }
    return this.expr.wrap(obj.name);
  }

  /** LIMIT 절 렌더링 */
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

    // LATERAL JOIN이 필요한지 감지
    if (this.needsLateral(join)) {
      // from이 배열(UNION ALL)이면 renderFrom(join.from) 사용,
      // 그 외(orderBy, top, select 등)이면 renderFrom(join)으로 서브쿼리 생성
      const from = Array.isArray(join.from) ? this.renderFrom(join.from) : this.renderFrom(join);
      return ` LEFT OUTER JOIN LATERAL ${from} AS ${alias} ON TRUE`;
    }

    // 일반 JOIN
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
      // MySQL: SELECT ... FOR UPDATE (끝에 추가)
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

    // LOCK (끝에 FOR UPDATE 추가)
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
      throw new Error("INSERT에는 최소 1개의 레코드가 필요합니다.");
    }

    const columns = Object.keys(def.records[0]);
    const colList = columns.map((c) => this.expr.wrap(c)).join(", ");

    // OUTPUT 불필요: 단순 배치 INSERT
    if (def.output == null) {
      const valuesList = def.records.map((record) => {
        const values = columns.map((c) => this.expr.escapeValue(record[c]));
        return `(${values.join(", ")})`;
      });
      return { sql: `INSERT INTO ${table} (${colList}) VALUES ${valuesList.join(", ")}` };
    }

    // OUTPUT 필요: multi-statement로 INSERT + SELECT 실행
    // 결과 셋: [INSERT 결과, SELECT 결과, INSERT 결과, SELECT 결과, ...]
    // → resultSetIndex=1, resultSetStride=2로 SELECT 결과만 추출
    const output = def.output;
    const outputCols = output.columns.map((c) => this.expr.wrap(c)).join(", ");
    const statements: string[] = [];

    for (const record of def.records) {
      const values = columns.map((c) => this.expr.escapeValue(record[c])).join(", ");
      statements.push(`INSERT INTO ${table} (${colList}) VALUES (${values})`);

      // PK로 SELECT (aiColName에는 LAST_INSERT_ID() 사용)
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

    // existsSelectQuery를 SELECT 1 AS _로 렌더링
    const existsQuerySql = this.select({
      ...def.existsSelectQuery,
      select: { _: { type: "value", value: 1 } },
    }).sql;

    // OUTPUT 불필요: 단순 INSERT IF NOT EXISTS
    if (def.output == null) {
      const sql = `INSERT INTO ${table} (${colList}) SELECT ${values} WHERE NOT EXISTS (${existsQuerySql})`;
      return { sql };
    }

    // OUTPUT 필요: multi-statement (INSERT + SET @affected + SELECT)
    const output = def.output;
    const outputCols = output.columns.map((c) => this.expr.wrap(c)).join(", ");

    // OUTPUT용 SELECT WHERE 조건
    const whereForSelect = output.pkColNames.map((pk) => {
      const wrappedPk = this.expr.wrap(pk);
      if (pk === output.aiColName) {
        return `${wrappedPk} = LAST_INSERT_ID()`;
      }
      return `${wrappedPk} = ${this.expr.escapeValue(def.record[pk])}`;
    });

    // multi-statement: INSERT → SET @affected → SELECT (삽입된 경우에만 결과 반환)
    const statements = [
      `INSERT INTO ${table} (${colList}) SELECT ${values} WHERE NOT EXISTS (${existsQuerySql})`,
      `SET @sd_affected = ROW_COUNT()`,
      `SELECT ${outputCols} FROM ${table} WHERE ${whereForSelect.join(" AND ")} AND @sd_affected > 0`,
    ];

    // results[0]=INSERT, results[1]=SET(빈 결과), results[2]=SELECT
    return { sql: statements.join(";\n"), resultSetIndex: 2 };
  }

  protected insertInto(def: InsertIntoQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);
    const selectSql = this.select(def.recordsSelectQuery).sql;

    // INSERT INTO SELECT에서 column 추출
    const selectDef = def.recordsSelectQuery;
    const colList =
      selectDef.select != null
        ? Object.keys(selectDef.select)
            .map((c) => this.expr.wrap(c))
            .join(", ")
        : "*";

    // OUTPUT 불필요: 단순 INSERT INTO SELECT
    if (def.output == null) {
      return { sql: `INSERT INTO ${table} (${colList}) ${selectSql}` };
    }

    // OUTPUT 필요: multi-statement
    const outputCols = def.output.columns.map((c) => this.expr.wrap(c)).join(", ");

    // PK가 AI인 경우: LAST_INSERT_ID() + ROW_COUNT()로 범위 조회
    if (def.output.aiColName != null) {
      const aiCol = this.expr.wrap(def.output.aiColName);

      const statements = [
        `INSERT INTO ${table} (${colList}) ${selectSql}`,
        `SET @sd_first_id = LAST_INSERT_ID(), @sd_count = ROW_COUNT()`,
        `SELECT ${outputCols} FROM ${table} WHERE ${aiCol} >= @sd_first_id AND ${aiCol} < @sd_first_id + @sd_count`,
      ];

      // results[0]=INSERT, results[1]=SET(빈 결과), results[2]=SELECT
      return { sql: statements.join(";\n"), resultSetIndex: 2 };
    }

    // PK가 AI가 아닌 경우: PK를 임시 테이블에 저장 후 조회
    const tempTableName = this.expr.wrap("SD_TEMP_" + Uuid.generate().toString().replace(/-/g, ""));

    // recordsSelectQuery에서 PK column만 추출하는 SELECT 생성
    const pkSelectDef: SelectQueryDef = {
      ...def.recordsSelectQuery,
      select: Object.fromEntries(
        def.output.pkColNames.map((pk) => [pk, def.recordsSelectQuery.select![pk]]),
      ),
    };
    const pkSelectSql = this.select(pkSelectDef).sql;

    // 임시 테이블의 PK를 사용하여 대상에서 SELECT
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

    // results[0]=CREATE, results[1]=INSERT, results[2]=SELECT, results[3]=DROP 결과
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

    // OUTPUT 불필요: 단순 UPDATE
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

    // OUTPUT 필요: multi-statement (PK를 임시 테이블에 저장 + UPDATE + SELECT + DROP)
    const outputCols = def.output.columns.map((c) => `${alias}.${this.expr.wrap(c)}`).join(", ");
    const tempTableName = this.expr.wrap("SD_TEMP_" + Uuid.generate().toString().replace(/-/g, ""));

    // 대상 PK를 임시 테이블에 저장 (UPDATE 후 WHERE 조건이 변경될 수 있으므로)
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

    // 임시 테이블의 PK로 SELECT (업데이트된 값 조회)
    const pkConditions = def.output.pkColNames.map((pk) => {
      const wrappedPk = this.expr.wrap(pk);
      return `${alias}.${wrappedPk} = ${tempTableName}.${wrappedPk}`;
    });
    const selectSql = `SELECT ${outputCols} FROM ${table} AS ${alias}, ${tempTableName} WHERE ${pkConditions.join(" AND ")}`;

    // 임시 테이블 삭제
    const dropSql = `DROP TEMPORARY TABLE ${tempTableName}`;

    const statements = [createTempSql, updateSql, selectSql, dropSql];
    return { sql: statements.join(";\n"), resultSetIndex: 2 };
  }

  //#endregion

  //#region ========== DML - DELETE ==========

  protected delete(def: DeleteQueryDef): QueryBuildResult {
    const table = this.tableName(def.table);
    const alias = this.expr.wrap(def.as);

    // OUTPUT 불필요: 단순 DELETE
    if (def.output == null) {
      let sql = `DELETE ${alias} FROM ${table} AS ${alias}`;
      sql += this.renderJoins(def.joins);
      sql += this.renderWhere(def.where);
      if (def.limit != null || def.top != null) {
        sql += this.renderLimit(def.limit, def.top);
      }
      return { sql };
    }

    // OUTPUT 필요: multi-statement (삭제 전 임시 테이블에 저장 + DELETE + SELECT + DROP)
    const outputCols = def.output.columns.map((c) => `${alias}.${this.expr.wrap(c)}`).join(", ");
    const tempTableName = this.expr.wrap("SD_TEMP_" + Uuid.generate().toString().replace(/-/g, ""));

    // 삭제 전 임시 테이블에 저장
    let createTempSql = `CREATE TEMPORARY TABLE ${tempTableName} AS SELECT ${outputCols} FROM ${table} AS ${alias}`;
    createTempSql += this.renderJoins(def.joins);
    createTempSql += this.renderWhere(def.where);

    // DELETE 실행
    let deleteSql = `DELETE ${alias} FROM ${table} AS ${alias}`;
    deleteSql += this.renderJoins(def.joins);
    deleteSql += this.renderWhere(def.where);
    if (def.top != null) deleteSql += ` LIMIT ${def.top}`;

    // 임시 테이블에서 결과 반환
    const selectSql = `SELECT * FROM ${tempTableName}`;

    // 임시 테이블 삭제
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

    // UPDATE SET 부분 (alias.column 형식)
    const updateSetParts = Object.entries(def.updateRecord).map(
      ([col, e]) => `${alias}.${this.expr.wrap(col)} = ${this.expr.render(e)}`,
    );

    // INSERT 부분
    const insertColumns = Object.keys(def.insertRecord);
    const insertColList = insertColumns.map((c) => this.expr.wrap(c)).join(", ");
    const insertValues = insertColumns.map((c) => this.expr.render(def.insertRecord[c])).join(", ");

    // WHERE 조건 추출 (existsSelectQuery의 where에서)
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

    // OUTPUT 필요: multi-statement (CREATE TEMP + UPDATE + INSERT + SELECT + DROP)
    const outputCols = def.output.columns.map((c) => this.expr.wrap(c)).join(", ");
    const tempTableName = this.expr.wrap("SD_TEMP_" + Uuid.generate().toString().replace(/-/g, ""));

    // 대상 PK를 임시 테이블에 저장 (UPDATE 후 WHERE 조건이 변경될 수 있으므로)
    const pkSelectCols = def.output.pkColNames.map((pk) => this.expr.wrap(pk)).join(", ");
    const createTempSql = `CREATE TEMPORARY TABLE ${tempTableName} AS SELECT ${pkSelectCols} FROM ${table} AS ${alias} WHERE ${whereCondition}`;

    // UPDATE (존재하면 업데이트)
    const updateSql = `UPDATE ${table} AS ${alias} SET ${updateSetParts.join(", ")} WHERE ${whereCondition}`;

    // INSERT (NOT EXISTS 패턴)
    const insertSql = `INSERT INTO ${table} (${insertColList}) SELECT ${insertValues} WHERE NOT EXISTS (${existsQuerySql})`;

    // SELECT: UPDATE 결과 또는 INSERT 결과 조회 (UNION ALL로 병합)
    // UPDATE 경우: 임시 테이블의 PK로 조회
    const output = def.output;
    const updatePkConditions = output.pkColNames.map((pk) => {
      const wrappedPk = this.expr.wrap(pk);
      return `${table}.${wrappedPk} IN (SELECT ${wrappedPk} FROM ${tempTableName})`;
    });
    const selectUpdateSql = `SELECT ${outputCols} FROM ${table} WHERE ${updatePkConditions.join(" AND ")}`;

    // INSERT 경우: insertRecord의 PK로 조회 (AI에는 LAST_INSERT_ID() 사용, 임시 테이블이 비어있을 때만)
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

    // 임시 테이블 삭제
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

      // nullable: true → NULL, 아니면 → NOT NULL
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

    // CONSTRAINT 이름이 포함된 Primary Key
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
    // MySQL: TRUNCATE는 AUTO_INCREMENT를 자동으로 초기화
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
    // MySQL 8.0+: RENAME COLUMN 지원
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

    // MySQL은 FK 추가 시 인덱스를 자동 생성하므로 별도 인덱스 불필요
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

    // 파라미터 처리
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
    // MySQL: 모든 테이블 삭제 (MySQL에서 database와 schema는 동의어)
    // information_schema에서 테이블 목록 조회 후 DROP
    // SQL 인젝션 방지: 식별자 유효성 검사
    if (!/^[a-zA-Z0-9_]+$/.test(def.database)) {
      throw new Error(`잘못된 데이터베이스 이름: ${def.database}`);
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
    // MySQL: database와 schema는 동의어
    const dbName = this.expr.escapeString(def.database);
    return {
      sql: `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '${dbName}'`,
    };
  }

  /** MySQL은 전역 설정만 지원 (table 파라미터 무시) */
  protected switchFk(def: SwitchFkQueryDef): QueryBuildResult {
    return def.enabled
      ? { sql: "SET FOREIGN_KEY_CHECKS = 1" }
      : { sql: "SET FOREIGN_KEY_CHECKS = 0" };
  }

  //#endregion
}
