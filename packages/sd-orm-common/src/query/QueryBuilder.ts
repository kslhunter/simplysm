import {
  IAddColumnQueryDef,
  IAddForeignKeyQueryDef,
  IAddPrimaryKeyQueryDef,
  IClearDatabaseIfExistsQueryDef,
  IConfigIdentityInsertQueryDef,
  ICreateDatabaseIfNotExistsQueryDef,
  ICreateIndexQueryDef,
  ICreateTableQueryDef,
  IDeleteQueryDef,
  IDropTableQueryDef,
  IInsertQueryDef,
  IJoinQueryDef,
  IModifyColumnQueryDef,
  IRemoveColumnQueryDef,
  IRemoveForeignKeyQueryDef,
  IRenameColumnQueryDef,
  ISelectQueryDef,
  IUpdateQueryDef,
  IUpsertQueryDef,
  TQueryDef
} from "../query-definition";
import {TQueryValue, TQueryValueArray, TQueryValueOrSelect, TQueryValueOrSelectArray} from "../common";
import {DateOnly, DateTime, JsonConvert, Time, Uuid} from "@simplysm/sd-core-common";
import {QueryUtil} from "../util/QueryUtil";

export class QueryBuilder {
  public static select(def: ISelectQueryDef): string {
    // SELECT

    let q = "";
    q += "SELECT";

    if (def.top) {
      q += ` TOP ${def.top}`;
    }

    if (def.distinct) {
      q += " DISTINCT";
    }

    q += "\n";

    // SELECT FIELDS

    const selectFieldQueryStrings: string[] = [];
    for (const selectKey of Object.keys(def.select)) {
      const selectValue = def.select[selectKey];

      if (selectValue && selectValue["from"]) {
        const selectQueryDef = selectValue as ISelectQueryDef;
        let subQuery = `  (\n`;
        subQuery += "    " + QueryBuilder.select(selectQueryDef).replace(/\n/g, "\n    ") + "\n";
        subQuery += `  ) as ${selectKey}`;
        selectFieldQueryStrings.push(subQuery);
      }
      else {
        selectFieldQueryStrings.push(`  ${QueryBuilder.getQueryOfQueryValue(def.select[selectKey] as TQueryValue)} as ${selectKey}`);
      }
    }
    q += selectFieldQueryStrings.join(",\n");
    q += "\n";

    // FROM

    if (def.from instanceof Array) {
      q += `FROM (\n`;
      for (const from of def.from) {
        const fromQueryDef = from as ISelectQueryDef;
        q += "  " + QueryBuilder.select(fromQueryDef).replace(/\n/g, "\n  ");
        q += "\n\n  UNION ALL\n\n";
      }
      q = q.slice(0, -14);
      q += `)`;
    }
    else if (def.from["from"]) {
      const fromQueryDef = def.from as ISelectQueryDef;
      q += `FROM (\n`;
      q += "  " + QueryBuilder.select(fromQueryDef).replace(/\n/g, "\n  ") + "\n";
      q += `)`;
    }
    else {
      q += `FROM ${def.from}`;
    }
    q += def.as ? ` as ${def.as}` : "";
    q += "\n";

    // JOIN

    if (def.join && def.join.length > 0) {
      for (const joinDef of def.join) {
        q += QueryBuilder._getQueryOfJoinDef(joinDef);
        q += "\n";
      }
    }

    // WHERE

    if (def.where) {
      q += `WHERE ${def.where.map((item) => QueryBuilder.getQueryOfQueryValue(item)).join("")}`;
      q += "\n";
    }

    // GROUP BY

    if (def.groupBy && def.groupBy.length > 0) {
      q += `GROUP BY ${def.groupBy.map((item) => QueryBuilder.getQueryOfQueryValue(item)).join(", ")}`;
      q += "\n";
    }

    // HAVING

    if (def.having) {
      if (!(def.groupBy && def.groupBy.length > 0)) {
        throw new Error("'HAVING'을 사용하려면, 'GROUP BY'를 반드시 설정해야 합니다.");
      }

      q += `HAVING ${def.having.map((item) => QueryBuilder.getQueryOfQueryValue(item)).join("")}`;
      q += "\n";
    }

    // ORDER BY

    if (def.orderBy && def.orderBy.length > 0) {
      q += `ORDER BY ${def.orderBy.map((item) => QueryBuilder.getQueryOfQueryValue(item[0]) + " " + item[1]).join(", ")}`;
      q += "\n";
    }

    // LIMIT

    if (def.limit) {
      if (!(def.orderBy && def.orderBy.length > 0)) {
        throw new Error("'LIMIT'을 사용하려면, 'ORDER BY'를 반드시 설정해야 합니다.");
      }

      q += `OFFSET ${def.limit[0]} ROWS FETCH NEXT ${def.limit[1]} ROWS ONLY`;
      q += "\n";
    }

    return q.trim();
  }

  public static insert(def: IInsertQueryDef): string {
    let q = "";
    q += `INSERT INTO ${def.from} (${Object.keys(def.record).join(", ")})`;
    q += "\n";

    if (def.output) {
      q += `OUTPUT ${def.output.join(", ")}`;
      q += "\n";
    }

    q += `VALUES (${Object.values(def.record).map((val) => QueryBuilder.getQueryOfQueryValue(val)).join(", ")})`;
    q += "\n";

    return q.trim();
  }

  public static update(def: IUpdateQueryDef): string {
    let q = "";

    // LINE 1
    q += `UPDATE`;
    if (def.top) {
      q += ` TOP (${def.top})`;
    }
    q += ` ${def.as ?? def.from} SET`;
    q += "\n";

    // FIELD = VALUE
    q += Object.keys(def.record).map((key) => `  ${key} = ${QueryBuilder.getQueryOfQueryValue(def.record[key])}`).join(",\n");
    q += "\n";

    // OUTPUT
    if (def.output) {
      q += `OUTPUT ${def.output.join(", ")}`;
      q += "\n";
    }

    // FROM, AS
    if (def.as || (def.join && def.join.length > 0)) {
      q += `FROM ${def.from}`;
      if (def.as) {
        q += ` as ${def.as}`;
      }
      q += "\n";
    }

    // JOIN
    if (def.join && def.join.length > 0) {
      for (const joinDef of def.join) {
        q += QueryBuilder._getQueryOfJoinDef(joinDef);
        q += "\n";
      }
    }

    // WHERE
    if (def.where) {
      q += `WHERE ${def.where.map((item) => QueryBuilder.getQueryOfQueryValue(item)).join("")}`;
      q += "\n";
    }

    return q.trim();
  }

  public static upsert(def: IUpsertQueryDef): string {
    let q = "";

    // LINE 1
    q += `MERGE ${def.from}`;
    if (def.as) {
      q += ` as ${def.as}`;
    }
    q += "\n";

    // USING
    q += "USING (SELECT 0 as _using) as _using";
    q += "\n";

    // WHERE
    q += `ON ${def.where.map((item) => QueryBuilder.getQueryOfQueryValue(item)).join("")}`;
    q += "\n";

    // UPDATE
    if (def.updateRecord && Object.keys(def.updateRecord).length > 0) {
      q += "WHEN MATCHED THEN\n";
      q += "  UPDATE SET\n";
      q += Object.keys(def.updateRecord).map((key) => `    ${key} = ${QueryBuilder.getQueryOfQueryValue(def.updateRecord![key])}`).join(",\n");
      q += "\n";
    }

    // INSERT
    q += "WHEN NOT MATCHED THEN\n";
    q += `  INSERT (${Object.keys(def.insertRecord).join(", ")})\n`;
    q += `  VALUES (${Object.values(def.insertRecord).map((val) => QueryBuilder.getQueryOfQueryValue(val)).join(", ")})`;
    q += "\n";

    if (def.output) {
      q += `OUTPUT ${def.output.join(", ")}`;
      q += "\n";
    }

    return q.trim() + ";";
  }

  public static delete(def: IDeleteQueryDef): string {
    let q = "";

    // LINE 1
    q += `DELETE`;
    if (def.top) {
      q += ` TOP (${def.top})`;
    }

    q += ` ${def.as ?? def.from}`;
    q += "\n";

    // OUTPUT
    if (def.output) {
      q += `OUTPUT ${def.output.join(", ")}`;
      q += "\n";
    }

    // FROM, AS
    if (def.as || (def.join && def.join.length > 0)) {
      q += `FROM ${def.from}`;
      if (def.as) {
        q += ` as ${def.as}`;
      }
      q += "\n";
    }


    // JOIN
    if (def.join && def.join.length > 0) {
      for (const joinDef of def.join) {
        q += QueryBuilder._getQueryOfJoinDef(joinDef);
        q += "\n";
      }
    }

    // WHERE
    if (def.where) {
      q += `WHERE ${def.where.map((item) => QueryBuilder.getQueryOfQueryValue(item)).join("")}`;
      q += "\n";
    }

    return q.trim();
  }

  public static createDatabaseIfNotExists(def: ICreateDatabaseIfNotExistsQueryDef): string {
    return `IF NOT EXISTS(select * from sys.databases WHERE name='${def.database}') CREATE DATABASE [${def.database}]`.trim();
  }

  public static clearDatabaseIfExists(def: IClearDatabaseIfExistsQueryDef): string {
    return `
IF EXISTS(select * from sys.databases WHERE name='${def.database}')
BEGIN
  DECLARE @sql NVARCHAR(MAX);
  SET @sql = N'';
    
  -- 프록시저 초기화
  SELECT @sql = @sql + 'DROP PROCEDURE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(o.name) +';' + CHAR(13) + CHAR(10)
  FROM [${def.database}].sys.sql_modules m
  INNER JOIN [${def.database}].sys.objects o ON m.object_id=o.object_id
  WHERE type_desc like '%PROCEDURE%'
    
  -- 함수 초기화
  SELECT @sql = @sql + 'DROP FUNCTION [${def.database}].' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(o.name) + N';' + CHAR(13) + CHAR(10)
  FROM [${def.database}].sys.sql_modules m
  INNER JOIN [${def.database}].sys.objects o ON m.object_id=o.object_id
  WHERE type_desc like '%function%'
    
  -- 뷰 초기화
  SELECT @sql = @sql + 'DROP VIEW [${def.database}].' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(v.name) + N';' + CHAR(13) + CHAR(10)
  FROM [${def.database}].sys.views v
    
  -- 테이블 FK 끊기 초기화
  SELECT @sql = @sql + N'ALTER TABLE [${def.database}].' + QUOTENAME(SCHEMA_NAME([tbl].schema_id)) + '.' + QUOTENAME([tbl].[name]) + N' DROP CONSTRAINT ' + QUOTENAME([obj].[name]) + N';' + CHAR(13) + CHAR(10)
  FROM [${def.database}].sys.tables [tbl]
  INNER JOIN [${def.database}].sys.objects AS [obj] ON [obj].[parent_object_id] = [tbl].[object_id] AND [obj].[type] = 'F'

  -- 테이블 삭제
  SELECT @sql = @sql + N'DROP TABLE [${def.database}].' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME([tbl].[name]) + N';' + CHAR(13) + CHAR(10)
  FROM [${def.database}].sys.tables [tbl]
  WHERE [type]= 'U'

  EXEC(@sql);
END`.trim();
  }

  public static createTable(def: ICreateTableQueryDef): string {
    const tableName = QueryUtil.getTableName(def.table);

    let query = "";
    query += `CREATE TABLE ${tableName} (\n`;
    query += def.columns.map((colDef) => "  " + QueryBuilder._getQueryOfColDef(colDef)).join(",\n") + "\n";
    query += ")";

    return query.trim();
  }

  public static dropTable(def: IDropTableQueryDef): string {
    const tableName = QueryUtil.getTableName(def.table);
    return `DROP TABLE ${tableName}`;
  }

  public static addColumn(def: IAddColumnQueryDef): string[] {
    const tableName = QueryUtil.getTableName(def.table);

    const queries: string[] = [];
    if (!def.column.nullable && def.column.defaultValue) {
      queries.push(`ALTER TABLE ${tableName} ADD ${QueryBuilder._getQueryOfColDef({
        ...def.column,
        nullable: true
      })}`);
      queries.push(`UPDATE ${tableName} SET [${def.column.name}] = ${QueryBuilder.getQueryOfQueryValue(def.column.defaultValue)}`);
      queries.push(`ALTER TABLE ${tableName} ALTER COLUMN ${QueryBuilder._getQueryOfColDef(def.column)}`);
    }
    else {
      queries.push(`ALTER TABLE ${tableName} ADD ${QueryBuilder._getQueryOfColDef(def.column)}`);
    }

    return queries;
  }

  public static removeColumn(def: IRemoveColumnQueryDef): string {
    const tableName = QueryUtil.getTableName(def.table);
    return `ALTER TABLE ${tableName} DROP COLUMN [${def.column}]`;
  }

  public static modifyColumn(def: IModifyColumnQueryDef): string[] {
    const tableName = QueryUtil.getTableName(def.table);

    const queries: string[] = [];
    if (!def.column.nullable && def.column.defaultValue) {
      queries.push(`ALTER TABLE ${tableName} ALTER COLUMN ${QueryBuilder._getQueryOfColDef({
        ...def.column,
        nullable: true
      })}`);
      queries.push(`UPDATE ${tableName} SET [${def.column.name}] = ${QueryBuilder.getQueryOfQueryValue(def.column.defaultValue)} WHERE [${def.column.name}] IS NULL`);
    }
    queries.push(`ALTER TABLE ${tableName} ALTER COLUMN ${QueryBuilder._getQueryOfColDef(def.column)}`);
    return queries;
  }

  public static renameColumn(def: IRenameColumnQueryDef): string {
    return `EXECUTE ${def.table.database}..sp_rename N'${def.table.schema}.${def.table.name}.[${def.prevName}]', N'${def.nextName}', 'COLUMN'`;
  }

  public static addPrimaryKey(def: IAddPrimaryKeyQueryDef): string {
    if (def.primaryKeys.length <= 0) {
      throw new Error("설정할 PK가 입력되지 않았습니다.");
    }

    const tableName = QueryUtil.getTableName(def.table);
    return `ALTER TABLE ${tableName} ADD PRIMARY KEY (${def.primaryKeys.map((item) => `[${item.column}] ${item.orderBy}`).join(", ")})`;
  }

  public static addForeignKey(def: IAddForeignKeyQueryDef): string {
    const tableName = QueryUtil.getTableName(def.table);
    const tableNameChain = QueryUtil.getTableNameChain(def.table);
    const fkName = `[FK_${tableNameChain.join("_")}_${def.foreignKey.name}]`;
    const targetTableName = QueryUtil.getTableName(def.foreignKey.targetTable);

    let query = "";
    query += `ALTER TABLE ${tableName} ADD CONSTRAINT ${fkName} FOREIGN KEY (${def.foreignKey.fkColumns.map((columnName) => `[${columnName}]`).join(", ")})\n`;
    query += `  REFERENCES ${targetTableName} (${def.foreignKey.targetPkColumns.map((columnName) => `[${columnName}]`).join(", ")})\n`;
    query += "  ON DELETE NO ACTION\n";
    query += "  ON UPDATE NO ACTION";
    return query.trim();
  }

  public static removeForeignKey(def: IRemoveForeignKeyQueryDef): string {
    const tableName = QueryUtil.getTableName(def.table);
    const tableNameChain = QueryUtil.getTableNameChain(def.table);
    const fkName = `[FK_${tableNameChain.join("_")}_${def.foreignKey}]`;

    return `ALTER TABLE ${tableName} DROP CONSTRAINT ${fkName}`;
  }

  public static createIndex(def: ICreateIndexQueryDef): string {
    const tableName = QueryUtil.getTableName(def.table);
    const tableNameChain = QueryUtil.getTableNameChain(def.table);
    const idxName = `[IDX_${tableNameChain.join("_")}_${def.index.name}]`;

    return `CREATE INDEX ${idxName} ON ${tableName} (${def.index.columns.map((item) => `[${item.name}] ${item.orderBy}`).join(", ")})`;
  }

  public static configIdentityInsert(def: IConfigIdentityInsertQueryDef): string {
    const tableName = QueryUtil.getTableName(def.table);
    return `SET IDENTITY_INSERT ${tableName} ${def.state.toUpperCase()}`;
  }

  public static query(def: TQueryDef): string {
    return QueryBuilder[def.type](def as any) as string;
  }

  public static getQueryOfQueryValue(queryValue: TQueryValueOrSelect | TQueryValueOrSelectArray): string {
    if (queryValue === undefined) {
      return "NULL";
    }
    else if (
      typeof queryValue === "string" || (queryValue as TQueryValue) instanceof String ||
      typeof queryValue === "number" || (queryValue as TQueryValue) instanceof Number
    ) {
      return queryValue.toString();
    }
    else if (typeof queryValue === "boolean" || (queryValue as TQueryValue) instanceof Boolean) {
      return queryValue ? "1" : "0";
    }
    else if (queryValue instanceof DateTime) {
      return "'" + queryValue.toFormatString("yyyy-MM-dd HH:mm:ss") + "'";
      /*
      NOTE:
        "select"할때 어차피 "fff"를 못가져오는 관계로, 아래 코드 주석
        (차후에 "tedious"가 업데이트 되면, 다시 "fff 를 넣어야 할 수도 있음)
        return "'" + arg.toFormatString("yyyy-MM-dd HH:mm:ss.fff") + "'";
      */
    }
    else if (queryValue instanceof DateOnly) {
      return "'" + queryValue.toFormatString("yyyy-MM-dd") + "'";
    }
    else if (queryValue instanceof Time) {
      return "'" + queryValue.toFormatString("HH:mm:ss") + "'";
    }
    else if (queryValue instanceof Uuid) {
      return "'" + queryValue.toString() + "'";
    }
    else if (queryValue instanceof Buffer) {
      return `0x${queryValue.toString("hex")}`;
    }
    else if (queryValue instanceof Array) {
      return "(" + (queryValue as TQueryValueArray).map((item) => QueryBuilder.getQueryOfQueryValue(item)).join("") + ")";
    }
    else if (queryValue["from"]) {
      let subQuery = `(\n`;
      subQuery += "  " + QueryBuilder.select(queryValue as ISelectQueryDef).replace(/\n/g, "\n  ") + "\n";
      subQuery += `)`;
      return subQuery;
    }
    else {
      throw new TypeError(`${queryValue?.["constructor"]?.["name"] ?? typeof queryValue}: ${queryValue}: ${JsonConvert.stringify(queryValue)}`);
    }
  }

  private static _getQueryOfJoinDef(def: IJoinQueryDef): string {
    let q = "";

    if (Object.keys(def).every((key) => !def[key] || ["where", "from", "as"].includes(key))) {

      if (def.from instanceof Array) {
        q += `LEFT OUTER JOIN (\n`;
        for (const from of def.from) {
          const fromQueryDef = from as ISelectQueryDef;
          q += "  " + QueryBuilder.select(fromQueryDef).replace(/\n/g, "\n  ");
          q += "\n\n  UNION ALL\n\n";
        }
        q = q.slice(0, -14);
        q += `) as ${def.as}`;
      }
      else if (def.from["from"]) {
        const joinFromQueryDef = def.from as ISelectQueryDef;
        q += `LEFT OUTER JOIN (\n`;
        q += "  " + QueryBuilder.select(joinFromQueryDef).replace(/\n/g, "\n  ") + "\n";
        q += `) as ${def.as}`;
      }
      else {
        q += `LEFT OUTER JOIN ${def.from} as ${def.as}`;
      }

      if (def.where) {
        q += ` ON ${def.where.map((item) => QueryBuilder.getQueryOfQueryValue(item)).join("")}`;
      }
    }
    else {
      if (!def.select) {
        throw new Error("OUTER APPLY 쿼리를 사용하려면, SELECT 가 지정되어야 합니다. (JOIN 에 \"where\", \"from\", \"as\"외의 값 설정시, 자동으로 OUTER APPLY 를 사용합니다.)");
      }
      const joinFullDef = def as ISelectQueryDef;

      q += "OUTER APPLY (\n";
      q += "  " + QueryBuilder.select(joinFullDef).replace(/\n/g, "\n  ") + "\n";
      q += ") as " + joinFullDef.as;
    }

    return q.trim();
  }

  private static _getQueryOfColDef(colDef: {
    name: string;
    dataType: string;
    autoIncrement?: boolean;
    nullable?: boolean;
  }): string {
    let q = "";
    q += "[" + colDef.name + "] ";
    q += colDef.dataType + " ";
    q += colDef.autoIncrement ? "IDENTITY(1,1) " : "";
    q += colDef.nullable ? "NULL" : "NOT NULL";
    return q;
  }
}
