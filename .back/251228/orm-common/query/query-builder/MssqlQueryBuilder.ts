import { DateOnly, DateTime, Time, Uuid } from "@simplysm/sd-core-common";
import type { ColumnPrimitive, ColumnPrimitiveStr, TDataType } from "../../types";
import type { Expr, WhereExpr } from "../../expr/expr.types";
import type {
  AddForeignKeyQueryDef,
  ClearDatabaseQueryDef,
  CreateDatabaseQueryDef,
  CreateIndexQueryDef,
  CreateProcedureQueryDef,
  CreateTableQueryDef,
  CreateViewQueryDef,
  DeleteQueryDef,
  ExecuteProcedureQueryDef,
  GetDatabaseInfoDef,
  GetTableColumnInfosDef,
  GetTableForeignKeysDef,
  GetTableIndexesDef,
  GetTableInfoDef,
  GetTableInfosDef,
  GetTablePrimaryKeysDef,
  InsertIfNotExistsQueryDef,
  InsertIntoQueryDef,
  InsertQueryDef,
  JoinQueryDef,
  PivotDef,
  TableName,
  SelectQuery,
  TruncateTableQueryDef,
  UnpivotDef,
  UpdateQueryDef,
  UpsertQueryDef,
} from "../query-def";
import { BaseQueryBuilder } from "./BaseQueryBuilder";

export class MssqlQueryBuilder extends BaseQueryBuilder {
  // ============================================
  // Expr 렌더링 (MSSQL dialect)
  // ============================================

  protected _renderExpr(expr: Expr): string {
    switch (expr.type) {
      // ===== Value Expressions =====
      case "column":
        return this._wrapNames(...expr.path);

      case "value":
        return this._renderValue(expr.value);

      case "raw":
        return expr.sql;

      case "subquery":
        return `(${this.select(expr.queryDef)})`;

      // ===== String Expressions =====
      case "concat":
        return expr.args.map((a) => `ISNULL(${this._renderExpr(a)}, N'')`).join(" + ");

      case "left":
        return `LEFT(${this._renderExpr(expr.source)}, ${this._renderExpr(expr.length)})`;

      case "right":
        return `RIGHT(${this._renderExpr(expr.source)}, ${this._renderExpr(expr.length)})`;

      case "trim":
        return `RTRIM(LTRIM(${this._renderExpr(expr.arg)}))`;

      case "padStart": {
        const pad = new Array(expr.length).fill(expr.fillString).join("");
        return `RIGHT(${this._renderExpr({ type: "concat", args: [{ type: "value", value: pad }, expr.source] })}, ${expr.length})`;
      }

      case "replace":
        return `REPLACE(${this._renderExpr(expr.source)}, ${this._renderExpr(expr.from)}, ${this._renderExpr(expr.to)})`;

      case "upper":
        return `UPPER(${this._renderExpr(expr.arg)})`;

      case "lower":
        return `LOWER(${this._renderExpr(expr.arg)})`;

      case "length":
        return `LEN(${this._renderExpr(expr.arg)})`;

      case "byteLength":
        return `DATALENGTH(${this._renderExpr(expr.arg)})`;

      // ===== Numeric Expressions =====
      case "abs":
        return `ABS(${this._renderExpr(expr.arg)})`;

      case "round":
        return `ROUND(${this._renderExpr(expr.arg)}, ${expr.digits})`;

      case "ceil":
        return `CEILING(${this._renderExpr(expr.arg)})`;

      case "floor":
        return `FLOOR(${this._renderExpr(expr.arg)})`;

      // ===== Date Expressions =====
      case "year":
        return `YEAR(${this._renderExpr(expr.arg)})`;

      case "month":
        return `MONTH(${this._renderExpr(expr.arg)})`;

      case "day":
        return `DAY(${this._renderExpr(expr.arg)})`;

      case "hour":
        return `DATEPART(HOUR, ${this._renderExpr(expr.arg)})`;

      case "minute":
        return `DATEPART(MINUTE, ${this._renderExpr(expr.arg)})`;

      case "second":
        return `DATEPART(SECOND, ${this._renderExpr(expr.arg)})`;

      case "isoWeek": {
        const src = this._renderExpr(expr.arg);
        return `((DATEPART(WEEKDAY, ${src}) + @@DATEFIRST - 2) % 7 + 1)`;
      }

      case "isoWeekStartDate": {
        const src = this._renderExpr(expr.arg);
        const weekDay = `((DATEPART(WEEKDAY, ${src}) + @@DATEFIRST - 2) % 7 + 1)`;
        return `DATEADD(DAY, -(${weekDay} - 1), CAST(${src} AS DATE))`;
      }

      case "isoYearMonth": {
        const src = this._renderExpr(expr.arg);
        const weekDay = `((DATEPART(WEEKDAY, ${src}) + @@DATEFIRST - 2) % 7 + 1)`;
        const weekStartDate = `DATEADD(DAY, -(${weekDay} - 1), CAST(${src} AS DATE))`;
        const baseDate = `DATEADD(DAY, 3, ${weekStartDate})`;
        return `DATEADD(DAY, 1 - DAY(${baseDate}), ${baseDate})`;
      }

      case "dateDiff":
        return `DATEDIFF(${expr.separator}, ${this._renderExpr(expr.from)}, ${this._renderExpr(expr.to)})`;

      case "dateAdd":
        return `DATEADD(${expr.separator}, ${this._renderExpr(expr.value)}, ${this._renderExpr(expr.source)})`;

      case "formatDate": {
        // JS format → MSSQL FORMAT style
        const mssqlFormat = expr.format
          .replace(/yyyy/g, "yyyy")
          .replace(/MM/g, "MM")
          .replace(/dd/g, "dd")
          .replace(/HH/g, "HH")
          .replace(/mm/g, "mm")
          .replace(/ss/g, "ss");
        return `FORMAT(${this._renderExpr(expr.source)}, '${mssqlFormat}')`;
      }

      // ===== Conditional Expressions =====
      case "ifNull":
        return `ISNULL(${this._renderExpr(expr.source)}, ${this._renderExpr(expr.replacement)})`;

      case "is":
        return `CASE WHEN ${this._renderWhereExpr(expr.condition)} THEN 1 ELSE 0 END`;

      case "switch": {
        let q = "CASE";
        for (const c of expr.cases) {
          q += ` WHEN ${this._renderWhereExpr(c.when)} THEN ${this._renderExpr(c.then)}`;
        }
        q += ` ELSE ${this._renderExpr(expr.else)} END`;
        return q;
      }

      // ===== Aggregate Expressions =====
      case "count":
        if (expr.arg != null) {
          return expr.distinct
            ? `COUNT(DISTINCT ${this._renderExpr(expr.arg)})`
            : `COUNT(${this._renderExpr(expr.arg)})`;
        }
        return "COUNT(*)";

      case "sum":
        return `SUM(${this._renderExpr(expr.arg)})`;

      case "avg":
        return `AVG(${this._renderExpr(expr.arg)})`;

      case "max":
        return `MAX(${this._renderExpr(expr.arg)})`;

      case "min":
        return `MIN(${this._renderExpr(expr.arg)})`;

      // ===== Other Expressions =====
      case "greatest": {
        if (expr.args.length === 0) throw new Error("greatest requires at least one argument");
        if (expr.args.length === 1) return this._renderExpr(expr.args[0]);
        // MSSQL 2012+: VALUES + MAX 방식
        const values = expr.args.map((a) => `(${this._renderExpr(a)})`).join(", ");
        return `(SELECT MAX(v) FROM (VALUES ${values}) AS t(v))`;
      }

      case "rowNum":
        return "ROW_NUMBER() OVER (ORDER BY (SELECT NULL))";

      case "cast":
        return `CONVERT(${this._renderType(expr.targetType)}, ${this._renderExpr(expr.source)})`;

      // ===== Pivot Expressions =====
      case "pivotResultColumn":
        return `[PVT].${this._wrapNames(expr.name)}`;

      case "unpivotValueColumn":
        return `[UNPVT].${this._wrapNames(expr.name)}`;

      case "unpivotKeyColumn":
        return `[UNPVT].${this._wrapNames(expr.name)}`;

      default:
        throw new Error(`Unknown Expr type: ${(expr as Expr).type}`);
    }
  }

  protected _renderWhereExpr(expr: WhereExpr): string {
    switch (expr.type) {
      // ===== Comparison Expressions =====
      case "eq":
        return `${this._renderExpr(expr.left)} = ${this._renderExpr(expr.right)}`;

      case "gt":
        return `${this._renderExpr(expr.left)} > ${this._renderExpr(expr.right)}`;

      case "lt":
        return `${this._renderExpr(expr.left)} < ${this._renderExpr(expr.right)}`;

      case "gte":
        return `${this._renderExpr(expr.left)} >= ${this._renderExpr(expr.right)}`;

      case "lte":
        return `${this._renderExpr(expr.left)} <= ${this._renderExpr(expr.right)}`;

      case "between": {
        const src = this._renderExpr(expr.source);
        if (expr.from != null && expr.to != null) {
          return `${src} BETWEEN ${this._renderExpr(expr.from)} AND ${this._renderExpr(expr.to)}`;
        }
        if (expr.from != null) {
          return `${src} >= ${this._renderExpr(expr.from)}`;
        }
        if (expr.to != null) {
          return `${src} <= ${this._renderExpr(expr.to)}`;
        }
        return "1 = 1";
      }

      case "isNull":
        return `${this._renderExpr(expr.arg)} IS NULL`;

      case "like":
        return `${this._renderExpr(expr.source)} LIKE ${this._renderExpr(expr.pattern)}`;

      case "regexp":
        // MSSQL에서는 정규식을 직접 지원하지 않음. PATINDEX로 일부 흉내
        return `PATINDEX(${this._renderExpr(expr.pattern)}, ${this._renderExpr(expr.source)}) > 0`;

      case "in": {
        const src = this._renderExpr(expr.source);
        const values = expr.values.map((v) => this._renderExpr(v)).join(", ");
        return `${src} IN (${values})`;
      }

      // ===== Logical Expressions =====
      case "not":
        return `NOT (${this._renderWhereExpr(expr.arg)})`;

      case "and":
        if (expr.conditions.length === 0) return "1 = 1";
        if (expr.conditions.length === 1) return this._renderWhereExpr(expr.conditions[0]);
        return `(${expr.conditions.map((c) => this._renderWhereExpr(c)).join(" AND ")})`;

      case "or":
        if (expr.conditions.length === 0) return "1 = 0";
        if (expr.conditions.length === 1) return this._renderWhereExpr(expr.conditions[0]);
        return `(${expr.conditions.map((c) => this._renderWhereExpr(c)).join(" OR ")})`;

      default:
        throw new Error(`Unknown WhereExpr type: ${(expr as WhereExpr).type}`);
    }
  }

  // ============================================
  // Private Helpers - 공통
  // ============================================

  /** 이름을 [name] 형태로 래핑 */
  private _wrapNames(...names: string[]): string {
    return names.map((n) => `[${n}]`).join(".");
  }

  /** QueryTableNameDef → [database].[schema].[table] 변환 */
  private _tn(def: TableName): string {
    const names: string[] = [];
    if (def.database != null) {
      names.push(def.database);
      names.push(def.schema ?? "dbo"); // MSSQL 기본 스키마
    } else if (def.schema != null) {
      names.push(def.schema);
    }
    names.push(def.name);
    return this._wrapNames(...names);
  }

  /** JS 값 → MSSQL 리터럴 변환 */
  private _renderValue(value: ColumnPrimitive): string {
    if (typeof value === "string") {
      return `N'${value.replace(/'/g, "''")}'`;
    } else if (typeof value === "boolean") {
      return value ? "1" : "0";
    } else if (value instanceof DateTime) {
      return `'${value.toFormatString("yyyy-MM-dd HH:mm:ss.fff")}'`;
    } else if (value instanceof DateOnly) {
      return `'${value.toFormatString("yyyy-MM-dd")}'`;
    } else if (value instanceof Time) {
      return `'${value.toFormatString("HH:mm:ss")}'`;
    } else if (value instanceof Uuid) {
      return `'${value.toString()}'`;
    } else if (Buffer.isBuffer(value)) {
      return `0x${value.toString("hex")}`;
    } else if (value == null) {
      return "NULL";
    } else {
      return value.toString();
    }
  }

  /** ColumnPrimitiveStr → MSSQL 데이터 타입 변환 */
  private _renderType(type: ColumnPrimitiveStr): string {
    switch (type) {
      case "string":
        return "NVARCHAR(255)";
      case "number":
        return "BIGINT";
      case "boolean":
        return "BIT";
      case "datetime":
        return "DATETIME2";
      case "dateonly":
        return "DATE";
      case "time":
        return "TIME";
      default:
        return "NVARCHAR(255)";
    }
  }

  // ============================================
  // DML - SELECT
  // ============================================

  select(def: SelectQuery): string {
    if (def.top !== undefined && def.limit) {
      throw new Error("TOP과 LIMIT은 함께 사용할 수 없습니다.");
    }

    let q = "SELECT";

    if (def.distinct) q += " DISTINCT";
    if (def.top !== undefined) q += ` TOP ${def.top}`;

    // SELECT columns
    if (def.select != null) {
      q += "\n";
      const fields: string[] = [];
      for (const [key, value] of Object.entries(def.select)) {
        if (this._isSubQuery(value)) {
          fields.push(`  (\n    ${this.select(value).replace(/\n/g, "\n    ")}\n  ) as ${key}`);
        } else {
          fields.push(`  ${this._renderExpr(value)} as ${this._wrapNames(key)}`);
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

    if (def.from !== undefined && def.as !== undefined) q += ` as ${this._wrapNames(def.as)}`;
    if (typeof def.from === "string" && def.lock) q += " WITH (UPDLOCK)";
    q += "\n";

    // PIVOT
    if (def.pivot != null) {
      q += this._renderPivot(def.pivot);
    }

    // UNPIVOT
    if (def.unpivot != null) {
      q += this._renderUnpivot(def.unpivot);
    }

    // JOIN
    if (def.join != null && def.join.length > 0) {
      for (const j of def.join) {
        q += this._renderJoin(j) + "\n";
      }
    }

    // WHERE
    if (def.where != null && def.where.length > 0) {
      q += `WHERE ${def.where.map((w) => this._renderWhereExpr(w)).join(" AND ")}\n`;
    }

    // GROUP BY
    if (def.groupBy != null && def.groupBy.length > 0) {
      q += `GROUP BY ${def.groupBy.map((g) => this._renderExpr(g)).join(", ")}\n`;
    }

    // HAVING
    if (def.having != null && def.having.length > 0) {
      if (def.groupBy == null || def.groupBy.length < 1)
        throw new Error("HAVING을 사용하려면 GROUP BY를 먼저 설정해야 합니다.");
      q += `HAVING ${def.having.map((h) => this._renderWhereExpr(h)).join(" AND ")}\n`;
    }

    // ORDER BY
    if (def.orderBy != null && def.orderBy.length > 0) {
      q += `ORDER BY ${def.orderBy.map(([col, dir]) => this._renderExpr(col) + " " + dir).join(", ")}\n`;
    }

    // LIMIT (OFFSET...FETCH)
    if (def.limit != null) {
      if (def.orderBy == null || def.orderBy.length < 1)
        throw new Error("LIMIT을 사용하려면 ORDER BY를 먼저 설정해야 합니다.");
      q += `OFFSET ${def.limit[0]} ROWS FETCH NEXT ${def.limit[1]} ROWS ONLY\n`;
    }

    // SAMPLE
    if (def.sample !== undefined) {
      q += `TABLESAMPLE (${def.sample} ROWS)\n`;
    }

    return q.trim();
  }

  /**
   * 복잡한 쿼리인지 판단 (APPLY 필요 여부)
   * - from, as, where, select, isSingle 외의 필드가 있으면 서브쿼리로 변환 필요
   */
  private _needsApply(def: JoinQueryDef): boolean {
    const simpleKeys = ["from", "as", "where", "select", "isCustomSelect", "isSingle"];
    return (
      Object.keys(def).some(
        (key) => !simpleKeys.includes(key) && def[key as keyof JoinQueryDef] !== undefined,
      ) ||
      (def.isCustomSelect ?? false)
    );
  }

  private _renderJoin(def: JoinQueryDef): string {
    // 복잡한 쿼리면 OUTER APPLY 사용
    if (this._needsApply(def)) {
      let q = `OUTER APPLY (\n`;
      q += `  ${this.select(def).replace(/\n/g, "\n  ")}\n`;
      q += `) as ${def.as}`;
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
      q += ` ON ${def.where.map((w) => this._renderWhereExpr(w)).join(" AND ")}`;
    return q;
  }

  /** MSSQL PIVOT 절 렌더링 */
  private _renderPivot(def: PivotDef): string {
    const aggregateStr = this._renderExpr(def.aggregateExpr);
    const pivotColumnStr = this._renderExpr(def.pivotColumn);
    const pivotValuesStr = def.pivotValues.map((v) => this._wrapNames(v)).join(", ");

    let q = `PIVOT (\n`;
    q += `  ${aggregateStr} FOR ${pivotColumnStr} IN (${pivotValuesStr})\n`;
    q += `) as [PVT]\n`;

    return q;
  }

  /** MSSQL UNPIVOT 절 렌더링 */
  private _renderUnpivot(def: UnpivotDef): string {
    const valueColumnStr = this._wrapNames(def.valueColumnName);
    const keyColumnStr = this._wrapNames(def.keyColumnName);
    const sourceColumnsStr = def.sourceColumns.map((c) => this._wrapNames(c)).join(", ");

    let q = `UNPIVOT (\n`;
    q += `  ${valueColumnStr} FOR ${keyColumnStr} IN (${sourceColumnsStr})\n`;
    q += `) as [UNPVT]\n`;

    return q;
  }

  // ============================================
  // DML - INSERT
  // ============================================

  insert(def: InsertQueryDef): string {
    if (def.records.length === 0) return "";

    const needsProc = def.disableFkCheck;

    // 프로시저 불필요: 배치 INSERT (OUTPUT 포함 가능)
    if (!needsProc) {
      return this._buildBatchInsert(def);
    }

    // 프로시저 필요: FK 체크 비활성화
    const procName = "[#SD" + Uuid.new().toString().replace(/-/g, "") + "]";
    const tableName = this._tn(def.from);

    let q = `CREATE PROCEDURE ${procName}\nAS\nBEGIN\n\n`;

    // FK 체크 비활성화
    q += `  ALTER TABLE ${tableName} NOCHECK CONSTRAINT ALL;\n\n`;

    // 배치 INSERT
    q += "  " + this._buildBatchInsert(def).replace(/\n/g, "\n  ") + "\n\n";

    // FK 체크 활성화
    q += `  ALTER TABLE ${tableName} WITH CHECK CHECK CONSTRAINT ALL;\n\n`;

    q += "END;\n";
    q += `EXEC ${procName};\nDROP PROCEDURE ${procName};`;

    return q.trim();
  }

  private _buildBatchInsert(def: InsertQueryDef): string {
    const tableName = this._tn(def.from);
    const firstRecord = def.records[0];
    const columns = Object.keys(firstRecord); // unwrapped column names
    const hasOutput = def.output && def.output.length > 0;

    let q = `INSERT INTO ${tableName} (${columns.map((c) => this._wrapNames(c)).join(", ")})\n`;
    if (hasOutput) {
      q += `OUTPUT ${def.output!.map((o) => "INSERTED." + this._wrapNames(o)).join(", ")}\n`;
    }
    q += "VALUES\n";
    q += def.records
      .map((record) => `  (${columns.map((col) => this._renderExpr(record[col])).join(", ")})`)
      .join(",\n");
    return q + ";";
  }

  insertInto(def: InsertIntoQueryDef): string {
    const needsProc = def.stopAutoIdentity;
    const targetName = this._tn(def.target);
    const selectCols = Object.keys(def.select).join(", "); // already wrapped in select

    // 프로시저 불필요
    if (!needsProc) {
      return `INSERT INTO ${targetName} (${selectCols})\n${this.select(def as SelectQuery)};`;
    }

    // 프로시저 필요: IDENTITY_INSERT
    const procName = "[#SD" + Uuid.new().toString().replace(/-/g, "") + "]";

    let q = `CREATE PROCEDURE ${procName}\nAS\nBEGIN\n\n`;

    // IDENTITY_INSERT ON
    q += `  SET IDENTITY_INSERT ${targetName} ON;\n\n`;

    // INSERT INTO SELECT (SELECT 부분도 들여쓰기)
    const selectQuery = this.select(def as SelectQuery).replace(/\n/g, "\n  ");
    q += `  INSERT INTO ${targetName} (${selectCols})\n  ${selectQuery};\n\n`;

    // IDENTITY_INSERT OFF
    q += `  SET IDENTITY_INSERT ${targetName} OFF;\n\n`;

    q += "END;\n";
    q += `EXEC ${procName};\nDROP PROCEDURE ${procName};`;

    return q.trim();
  }

  // ============================================
  // UPDATE
  // ============================================

  update(def: UpdateQueryDef): string {
    const needsProc = def.disableFkCheck;
    const tableName = this._tn(def.from);

    // 프로시저 불필요
    if (!needsProc) {
      return this._buildSimpleUpdate(def);
    }

    // 프로시저 필요: FK 체크 비활성화
    const procName = "[#SD" + Uuid.new().toString().replace(/-/g, "") + "]";

    let q = `CREATE PROCEDURE ${procName}\nAS\nBEGIN\n\n`;
    q += `  ALTER TABLE ${tableName} NOCHECK CONSTRAINT ALL;\n\n`;
    q += "  " + this._buildSimpleUpdate(def).replace(/\n/g, "\n  ") + "\n\n";
    q += `  ALTER TABLE ${tableName} WITH CHECK CHECK CONSTRAINT ALL;\n\n`;
    q += "END;\n";
    q += `EXEC ${procName};\nDROP PROCEDURE ${procName};`;

    return q.trim();
  }

  private _buildSimpleUpdate(def: UpdateQueryDef): string {
    const tableName = this._tn(def.from);
    const alias = this._wrapNames(def.as);

    let q = "UPDATE";
    if (def.top !== undefined) q += ` TOP (${def.top})`;
    q += ` ${alias}\nSET\n`;
    q +=
      Object.entries(def.record)
        .map(([k, v]) => `  ${alias}.${this._wrapNames(k)} = ${this._renderExpr(v)}`)
        .join(",\n") + "\n";

    if (def.output != null)
      q += `OUTPUT ${def.output.map((o) => "INSERTED." + this._wrapNames(o)).join(", ")}\n`;

    q += `FROM ${tableName} as ${alias}\n`;
    if (def.join != null && def.join.length > 0) {
      for (const j of def.join) q += this._renderJoin(j) + "\n";
    }
    if (def.where != null && def.where.length > 0)
      q += `WHERE ${def.where.map((w) => this._renderWhereExpr(w)).join(" AND ")}\n`;

    return q.trim() + ";";
  }

  // ============================================
  // DELETE
  // ============================================

  delete(def: DeleteQueryDef): string {
    if (!def.as) throw new Error("DELETE에는 as가 필요합니다.");

    const needsProc = def.disableFkCheck;
    const tableName = this._tn(def.from);

    // 프로시저 불필요
    if (!needsProc) {
      return this._buildSimpleDelete(def);
    }

    // 프로시저 필요: FK 체크 비활성화
    const procName = "[#SD" + Uuid.new().toString().replace(/-/g, "") + "]";

    let q = `CREATE PROCEDURE ${procName}\nAS\nBEGIN\n\n`;
    q += `ALTER TABLE ${tableName} NOCHECK CONSTRAINT ALL;\n\n`;
    q += this._buildSimpleDelete(def) + "\n\n";
    q += `ALTER TABLE ${tableName} WITH CHECK CHECK CONSTRAINT ALL;\n\n`;
    q += "END;\n";
    q += `EXEC ${procName};\nDROP PROCEDURE ${procName};`;

    return q.trim();
  }

  private _buildSimpleDelete(def: DeleteQueryDef): string {
    const tableName = this._tn(def.from);
    const alias = this._wrapNames(def.as);

    let q = "DELETE";
    // alias가 WHERE에서 사용되므로 항상 alias 명시
    q += ` ${alias}`;
    if (def.top !== undefined) q += ` TOP (${def.top})`;
    q += "\n";

    if (def.output != null)
      q += `OUTPUT ${def.output.map((o) => "DELETED." + this._wrapNames(o)).join(", ")}\n`;

    // MSSQL: FROM table alias (AS 키워드 없이)
    q += `FROM ${tableName} ${alias}\n`;
    if (def.join != null && def.join.length > 0) {
      for (const j of def.join) q += this._renderJoin(j) + "\n";
    }
    if (def.where != null && def.where.length > 0)
      q += `WHERE ${def.where.map((w) => this._renderWhereExpr(w)).join(" AND ")}\n`;

    return q.trim() + ";";
  }

  // ============================================
  // UPSERT (MERGE)
  // ============================================

  upsert(def: UpsertQueryDef): string {
    const tableName = this._tn(def.from);
    const alias = this._wrapNames(def.as);

    let q = `MERGE ${tableName} as ${alias}\n`;
    q += "USING (SELECT 0 as _using) as _using\n";
    q += `ON ${def.where.map((w) => this._renderWhereExpr(w)).join(" AND ")}\n`;

    if (Object.keys(def.updateRecord).length > 0) {
      q += "WHEN MATCHED THEN\n  UPDATE SET\n";
      q +=
        Object.entries(def.updateRecord)
          .map(([k, v]) => `    ${this._wrapNames(k)} = ${this._renderExpr(v)}`)
          .join(",\n") + "\n";
    }

    q += "WHEN NOT MATCHED THEN\n";
    q += `  INSERT (${Object.keys(def.insertRecord).map((k) => this._wrapNames(k)).join(", ")})\n`;
    q += `  VALUES (${Object.values(def.insertRecord)
      .map((v) => this._renderExpr(v))
      .join(", ")})\n`;

    if (def.output != null)
      q += `OUTPUT ${def.output.map((o) => "INSERTED." + this._wrapNames(o)).join(", ")}\n`;

    return q.trim() + ";";
  }

  // ============================================
  // INSERT IF NOT EXISTS (MERGE)
  // ============================================

  insertIfNotExists(def: InsertIfNotExistsQueryDef): string {
    const tableName = this._tn(def.from);
    const alias = this._wrapNames(def.as);

    let q = `MERGE ${tableName} as ${alias}\n`;
    q += "USING (SELECT 0 as _using) as _using\n";
    q += `ON ${def.where.map((w) => this._renderWhereExpr(w)).join(" AND ")}\n`;
    q += "WHEN NOT MATCHED THEN\n";
    q += `  INSERT (${Object.keys(def.insertRecord).map((k) => this._wrapNames(k)).join(", ")})\n`;
    q += `  VALUES (${Object.values(def.insertRecord)
      .map((v) => this._renderExpr(v))
      .join(", ")})\n`;
    if (def.output != null)
      q += `OUTPUT ${def.output.map((o) => "INSERTED." + this._wrapNames(o)).join(", ")}\n`;
    return q.trim() + ";";
  }

  // ============================================
  // DDL - Database
  // ============================================

  createDatabase(def: CreateDatabaseQueryDef): string {
    return `CREATE DATABASE ${this._wrapNames(def.database)} COLLATE Korean_Wansung_CS_AS`;
  }

  clearDatabase(def: ClearDatabaseQueryDef): string {
    const db = this._wrapNames(def.database);
    return `
DECLARE @sql NVARCHAR(MAX);
SET @sql = N'';

-- 프로시저 초기화
SELECT @sql = @sql + 'DROP PROCEDURE ' + QUOTENAME(sch.name) + '.' + QUOTENAME(o.name) +';' + CHAR(13) + CHAR(10)
FROM ${db}.sys.sql_modules m
INNER JOIN ${db}.sys.objects o ON m.object_id=o.object_id
INNER JOIN ${db}.sys.schemas sch ON sch.schema_id = [o].schema_id
WHERE type_desc like '%PROCEDURE%'

-- 함수 초기화
SELECT @sql = @sql + 'DROP FUNCTION ${db}.' + QUOTENAME(sch.name) + '.' + QUOTENAME(o.name) + N';' + CHAR(13) + CHAR(10)
FROM ${db}.sys.sql_modules m
INNER JOIN ${db}.sys.objects o ON m.object_id=o.object_id
INNER JOIN ${db}.sys.schemas sch ON sch.schema_id = [o].schema_id
WHERE type_desc like '%function%' AND sch.name <> 'sys'

-- 뷰 초기화
SELECT @sql = @sql + 'DROP VIEW ' + QUOTENAME(sch.name) + '.' + QUOTENAME(v.name) + N';' + CHAR(13) + CHAR(10)
FROM ${db}.sys.views v
INNER JOIN ${db}.sys.schemas sch ON sch.schema_id = [v].schema_id
WHERE sch.name <> 'sys'

-- 테이블 FK 끊기 초기화
SELECT @sql = @sql + N'ALTER TABLE ${db}.' + QUOTENAME(sch.name) + '.' + QUOTENAME([tbl].[name]) + N' DROP CONSTRAINT ' + QUOTENAME([obj].[name]) + N';' + CHAR(13) + CHAR(10)
FROM ${db}.sys.tables [tbl]
INNER JOIN ${db}.sys.objects AS [obj] ON [obj].[parent_object_id] = [tbl].[object_id] AND [obj].[type] = 'F'
INNER JOIN ${db}.sys.schemas sch ON sch.schema_id = [tbl].schema_id

-- 테이블 삭제
SELECT @sql = @sql + N'DROP TABLE ${db}.' + QUOTENAME(sch.name) + '.' + QUOTENAME([tbl].[name]) + N';' + CHAR(13) + CHAR(10)
FROM ${db}.sys.tables [tbl]
INNER JOIN ${db}.sys.schemas sch ON sch.schema_id = [tbl].schema_id
WHERE [type]= 'U'

EXEC(@sql);`.trim();
  }

  // ============================================
  // DDL - Table
  // ============================================

  truncate(def: TruncateTableQueryDef): string {
    return `TRUNCATE TABLE ${this._tn(def.table)};`;
  }

  createTable(def: CreateTableQueryDef): string {
    const tableName = this._tn(def.table);

    let q = `CREATE TABLE ${tableName} (\n`;

    // 컬럼 정의
    const colDefs: string[] = [];
    for (const col of def.columns) {
      let colDef = `  ${this._wrapNames(col.name)} ${col.dataType}`;
      if (col.autoIncrement) colDef += " IDENTITY(1,1)";
      colDef += col.nullable ? " NULL" : " NOT NULL";
      if (col.defaultValue != null) colDef += ` DEFAULT ${this._renderExpr(col.defaultValue)}`;
      colDefs.push(colDef);
    }

    // PK 제약조건
    if (def.primaryKeys.length > 0) {
      const pkCols = def.primaryKeys.map((pk) => `${this._wrapNames(pk.columnName)} ${pk.orderBy}`).join(", ");
      colDefs.push(`  CONSTRAINT [PK_${def.table.name}] PRIMARY KEY (${pkCols})`);
    }

    q += colDefs.join(",\n") + "\n);";
    return q;
  }

  // ============================================
  // DDL - Constraints
  // ============================================

  addForeignKey(def: AddForeignKeyQueryDef): string {
    const fk = def.foreignKey;
    return `ALTER TABLE ${this._tn(def.table)} ADD CONSTRAINT ${this._wrapNames(fk.name)} FOREIGN KEY (${fk.fkColumns.join(", ")}) REFERENCES ${this._tn(fk.targetTable)}(${fk.targetPkColumns.join(", ")});`;
  }

  // ============================================
  // DDL - Index
  // ============================================

  createIndex(def: CreateIndexQueryDef): string {
    const idx = def.index;
    const unique = idx.columns[0]?.unique ? "UNIQUE " : "";
    const cols = idx.columns.map((c) => `${this._wrapNames(c.name)} ${c.orderBy}`).join(", ");
    return `CREATE ${unique}INDEX ${this._wrapNames(idx.name)} ON ${this._tn(def.table)}(${cols});`;
  }

  // ============================================
  // DDL - View/Procedure
  // ============================================

  createView(def: CreateViewQueryDef): string {
    return `CREATE OR ALTER VIEW ${this._tn(def.view)} AS ${def.query};`;
  }

  createProcedure(def: CreateProcedureQueryDef): string {
    return `CREATE OR ALTER PROCEDURE ${this._tn(def.procedure)} AS ${def.query};`;
  }

  executeProcedure(def: ExecuteProcedureQueryDef): string {
    return `EXEC ${this._tn(def.procedure)};`;
  }

  // ============================================
  // Meta Queries
  // ============================================

  getDatabaseInfo(def: GetDatabaseInfoDef): string {
    return `SELECT * FROM sys.databases WHERE name = '${def.database}'`;
  }

  getTableInfos(def: GetTableInfosDef): string {
    if (def.database == null)
      return `SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'`;
    let q = `SELECT TABLE_SCHEMA, TABLE_NAME FROM ${this._wrapNames(def.database)}.INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'`;
    if (def.schema != null) q += ` AND TABLE_SCHEMA = '${def.schema}'`;
    return q;
  }

  getTableInfo(def: GetTableInfoDef): string {
    let q = `SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${def.table.name}'`;
    if (def.table.database != null)
      q = `SELECT * FROM ${this._wrapNames(def.table.database)}.INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${def.table.name}'`;
    if (def.table.schema != null) q += ` AND TABLE_SCHEMA = '${def.table.schema}'`;
    return q;
  }

  getTableColumnInfos(def: GetTableColumnInfosDef): string {
    let q = `SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${def.table.name}'`;
    if (def.table.database != null)
      q = `SELECT * FROM ${this._wrapNames(def.table.database)}.INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${def.table.name}'`;
    if (def.table.schema != null) q += ` AND TABLE_SCHEMA = '${def.table.schema}'`;
    return q;
  }

  getTablePrimaryKeys(def: GetTablePrimaryKeysDef): string {
    let q = `SELECT c.COLUMN_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE c ON tc.CONSTRAINT_NAME = c.CONSTRAINT_NAME WHERE tc.TABLE_NAME = '${def.table.name}' AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'`;
    if (def.table.schema != null) q += ` AND tc.TABLE_SCHEMA = '${def.table.schema}'`;
    return q;
  }

  getTableForeignKeys(def: GetTableForeignKeysDef): string {
    return `SELECT fk.name as FK_NAME, tp.name as TARGET_TABLE, cp.name as FK_COLUMN, cr.name as TARGET_COLUMN FROM sys.foreign_keys fk JOIN sys.tables t ON fk.parent_object_id = t.object_id JOIN sys.tables tp ON fk.referenced_object_id = tp.object_id JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id WHERE t.name = '${def.table.name}'`;
  }

  getTableIndexes(def: GetTableIndexesDef): string {
    return `SELECT i.name as INDEX_NAME, c.name as COLUMN_NAME, i.is_unique as IS_UNIQUE FROM sys.indexes i JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id JOIN sys.tables t ON i.object_id = t.object_id WHERE t.name = '${def.table.name}' AND i.is_primary_key = 0`;
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
        return "FLOAT";
      case "decimal":
        return dataType.scale != null
          ? `DECIMAL(${dataType.precision}, ${dataType.scale})`
          : `DECIMAL(${dataType.precision})`;
      case "varchar":
        return `NVARCHAR(${dataType.length})`;
      case "char":
        return `NCHAR(${dataType.length})`;
      case "text":
        return "NVARCHAR(MAX)";
      case "binary":
        return dataType.length != null ? `VARBINARY(${dataType.length})` : "VARBINARY(MAX)";
      case "boolean":
        return "BIT";
      case "datetime":
        return "DATETIME2";
      case "date":
        return "DATE";
      case "time":
        return "TIME";
      case "uuid":
        return "UNIQUEIDENTIFIER";
      default:
        throw new Error(`Unknown data type: ${(dataType as TDataType).type}`);
    }
  }
}
