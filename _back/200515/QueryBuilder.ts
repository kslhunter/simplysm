import {
  IAddColumnQueryDef,
  IAddForeignKeyQueryDef,
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
import {DateOnly, DateTime, JsonConvert, NeverEntryError, Time, Type, Uuid} from "@simplysm/sd-core-common";
import {ITableNameDef} from "../definition";

export class QueryBuilder {
  public constructor(private readonly _dialect: "mysql" | "mssql" | "postgresql" = "mssql") {
  }

  public select(def: ISelectQueryDef): string {
    // SELECT

    let q = "";
    q += "SELECT";

    if (this._dialect !== "mysql") {
      if (def.top !== undefined) {
        q += ` TOP ${def.top}`;
      }
    }

    if (def.distinct) {
      q += " DISTINCT";
    }

    q += "\n";

    // SELECT FIELDS

    if (def.select) {
      const selectFieldQueryStrings: string[] = [];
      for (const selectKey of Object.keys(def.select)) {
        const selectValue = def.select[selectKey];

        if (selectValue?.["from"] !== undefined) {
          const selectQueryDef = selectValue as ISelectQueryDef;
          let subQuery = `  (\n`;
          subQuery += "    " + this.select(selectQueryDef).replace(/\n/g, "\n    ") + "\n";
          subQuery += `  ) as ${selectKey}`;
          selectFieldQueryStrings.push(subQuery);
        }
        else {
          selectFieldQueryStrings.push(`  ${this.getQueryOfQueryValue(def.select[selectKey] as TQueryValue)} as ${selectKey}`);
        }
      }
      q += selectFieldQueryStrings.join(",\n");
      q += "\n";
    }
    else {
      q += "  *\n";
    }

    // FROM

    if (def.from instanceof Array) {
      q += `FROM (\n`;
      for (const from of def.from) {
        q += "  " + this.select(from).replace(/\n/g, "\n  ");
        q += "\n\n  UNION ALL\n\n";
      }
      q = q.slice(0, -14);
      q += `)`;
    }
    else if (def.from?.["from"] !== undefined) {
      const fromQueryDef = def.from as ISelectQueryDef;
      q += `FROM (\n`;
      q += "  " + this.select(fromQueryDef).replace(/\n/g, "\n  ") + "\n";
      q += `)`;
    }
    else if (def.from !== undefined) {
      q += `FROM ${def.from as string}`;
    }

    if (def.from !== undefined) {
      q += def.as !== undefined ? ` as ${def.as}` : "";
    }
    q += "\n";

    // JOIN

    if (def.join && def.join.length > 0) {
      for (const joinDef of def.join) {
        q += this._getQueryOfJoinDef(joinDef);
        q += "\n";
      }
    }

    // WHERE

    if (def.where) {
      q += `WHERE ${def.where.map(item => this.getQueryOfQueryValue(item)).join("")}`;
      q += "\n";
    }

    // GROUP BY

    if (def.groupBy && def.groupBy.length > 0) {
      q += `GROUP BY ${def.groupBy.map(item => this.getQueryOfQueryValue(item)).join(", ")}`;
      q += "\n";
    }

    // HAVING

    if (def.having) {
      if (!(def.groupBy && def.groupBy.length > 0)) {
        throw new Error("'HAVING'을 사용하려면, 'GROUP BY'를 반드시 설정해야 합니다.");
      }

      q += `HAVING ${def.having.map(item => this.getQueryOfQueryValue(item)).join("")}`;
      q += "\n";
    }

    // ORDER BY

    if (def.orderBy && def.orderBy.length > 0) {
      q += `ORDER BY ${def.orderBy.map(item => this.getQueryOfQueryValue(item[0]) + " " + item[1]).join(", ")}`;
      q += "\n";
    }

    // LIMIT

    if (def.limit) {
      if (!(def.orderBy && def.orderBy.length > 0)) {
        throw new Error("'LIMIT'을 사용하려면, 'ORDER BY'를 반드시 설정해야 합니다.");
      }

      if (this._dialect === "mysql") {
        q += `LIMIT ${def.limit[0]}, ${def.limit[1]}`;
        q += "\n";
      }
      else {
        q += `OFFSET ${def.limit[0]} ROWS FETCH NEXT ${def.limit[1]} ROWS ONLY`;
        q += "\n";

      }
    }

    if (this._dialect === "mysql") {
      if (def.top !== undefined) {
        q += `LIMIT ${def.top}`;
        q += "\n";
      }
    }

    return q.trim();
  }

  public insert(def: IInsertQueryDef): string {
    let q = "";
    q += `INSERT INTO ${def.from} (${Object.keys(def.record).join(", ")})`;
    q += "\n";

    if (this._dialect !== "mysql" && this._dialect !== "postgresql") {
      if (def.output) {
        q += `OUTPUT ${def.output.map(item => "INSERTED." + item).join(", ")}`;
        q += "\n";
      }
    }

    q += `VALUES (${Object.values(def.record).map(val => this.getQueryOfQueryValue(val)).join(", ")})`;
    q += "\n";

    if (this._dialect === "postgresql") {
      if (def.output) {
        q += `RETURNING ${def.output.join(", ")}`;
        q += "\n";
      }
    }

    return q.trim() + ";";
  }

  public update(def: IUpdateQueryDef): string {
    /*TODO : POSTGRESQL 다시 작업
    UPDATE "TestDb"."TestTable" as "_" SET
      "name" = (CONCAT("TBL"."name", N'1'))
    FROM (
      SELECT * ...
    ) as "TBL"
    WHERE ("_"."id" = "TBL"."id")
     */

    let q = "";

    // LINE 1
    q += `UPDATE`;
    if (this._dialect !== "mysql" && this._dialect !== "postgresql") {
      if (def.top !== undefined) {
        q += ` TOP (${def.top})`;
      }
    }

    if (this._dialect === "mysql") {
      q += ` ${def.from}`;
      if (def.as !== undefined) {
        q += ` as ${def.as}`;
        q += `\n`;
      }

      // JOIN
      if (def.join && def.join.length > 0) {
        for (const joinDef of def.join) {
          q += this._getQueryOfJoinDef(joinDef);
          q += "\n";
        }
      }
      q += `SET`;
      q += "\n";
    }
    else if (this._dialect === "postgresql") {
      q += ` ${def.from} as "_" SET`;
      q += "\n";
    }
    else {
      q += ` ${def.as ?? def.from} SET`;
      q += "\n";
    }

    if (this._dialect === "postgresql") {
      // FIELD = VALUE
      q += Object.keys(def.record).map(key => `  ${key} = ${this.getQueryOfQueryValue(def.record[key])}`).join(",\n");
      q += "\n";
    }
    else {
      // FIELD = VALUE
      q += Object.keys(def.record).map(key => `  ${def.as !== undefined ? def.as + "." : ""}${key} = ${this.getQueryOfQueryValue(def.record[key])}`).join(",\n");
      q += "\n";
    }

    // OUTPUT
    if (this._dialect !== "mysql" && this._dialect !== "postgresql") {
      if (def.output) {
        q += `OUTPUT ${def.output.map(item => "INSERTED." + item).join(", ")}`;
        q += "\n";
      }
    }

    if (this._dialect !== "mysql") {
      // FROM, AS
      if (def.as !== undefined || (def.join && def.join.length > 0)) {
        q += `FROM ${def.from}`;
        if (def.as !== undefined) {
          q += ` as ${def.as}`;
        }
        q += "\n";
      }

      // JOIN
      if (def.join && def.join.length > 0) {
        for (const joinDef of def.join) {
          q += this._getQueryOfJoinDef(joinDef);
          q += "\n";
        }
      }
    }

    // WHERE
    if (def.where) {
      q += `WHERE ${def.where.map(item => this.getQueryOfQueryValue(item)).join("")}`;
      q += "\n";
    }

    // MYSQL/POSTGRES : LIMIT
    if (this._dialect === "mysql" || this._dialect === "postgresql") {
      if (def.top !== undefined) {
        q += `LIMIT ${def.top}`;
        q += "\n";
      }
    }

    if (this._dialect === "postgresql") {
      if (def.output) {
        q += `RETURNING ${def.output.map(item => "\"_\"." + item).join(", ")}`;
        q += "\n";
      }
    }

    return q.trim() + ";";
  }

  public upsert(def: IUpsertQueryDef): string {
    if (this._dialect === "mysql") {
      throw new NeverEntryError();
    }
    else {
      let q = "";

      // LINE 1
      q += `MERGE ${def.from}`;
      if (def.as !== undefined) {
        q += ` as ${def.as}`;
      }
      q += "\n";

      // USING
      q += "USING (SELECT 0 as _using) as _using";
      q += "\n";

      // WHERE
      q += `ON ${def.where.map(item => this.getQueryOfQueryValue(item)).join("")}`;
      q += "\n";

      // UPDATE
      if (def.updateRecord && Object.keys(def.updateRecord).length > 0) {
        q += "WHEN MATCHED THEN\n";
        q += "  UPDATE SET\n";
        q += Object.keys(def.updateRecord).map(key => `    ${key} = ${this.getQueryOfQueryValue(def.updateRecord[key])}`).join(",\n");
        q += "\n";
      }

      // INSERT
      q += "WHEN NOT MATCHED THEN\n";
      q += `  INSERT (${Object.keys(def.insertRecord).join(", ")})\n`;
      q += `  VALUES (${Object.values(def.insertRecord).map(val => this.getQueryOfQueryValue(val)).join(", ")})`;
      q += "\n";

      if (this._dialect === "mysql") {
      }
      else if (this._dialect === "postgresql") {
        if (def.output) {
          q += `RETURNING ${def.output.join(", ")}`;
          q += "\n";
        }
      }
      else {
        if (def.output) {
          q += `OUTPUT ${def.output.map(item => "INSERTED." + item).join(", ")}`;
          q += "\n";
        }
      }

      return q.trim() + ";";
    }
  }

  public delete(def: IDeleteQueryDef): string {
    if (this._dialect === "mysql") {
      return `
USE ${def.from.split(".")[0]};
      
SET @cols = NULL;

SELECT GROUP_CONCAT('${"`_" + def.as!.slice(1)}.\`', COLUMN_NAME, '\`', ' = ', '${def.as}.\`', COLUMN_NAME, '\`' separator ' AND ') INTO @cols
FROM INFORMATION_SCHEMA.COLUMNS
WHERE CONCAT('\`', TABLE_SCHEMA, '\`.\`', TABLE_NAME, '\`') = '${def.from}' AND COLUMN_KEY='PRI';

SET @sql = CONCAT('DELETE ${def.as} FROM ${def.from} as ${def.as} JOIN (
  ${this.select(def).replace(/\n/g, "\n  ").replace("*", def.as + ".*")}
) ${"`_" + def.as!.slice(1)} ON 1 = 1 WHERE ', @cols, ';');
SELECT @sql;

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;`.trim();
    }
    else {
      let q = "";

      // LINE 1
      q += `DELETE`;
      if (def.top !== undefined) {
        q += ` TOP (${def.top})`;
      }

      q += ` ${def.as ?? def.from}`;
      q += "\n";

      // OUTPUT
      if (this._dialect === "mysql") {
      }
      else if (this._dialect === "postgresql") {
        if (def.output) {
          q += `RETURNING ${def.output.join(", ")}`;
          q += "\n";
        }
      }
      else {
        if (def.output) {
          q += `OUTPUT ${def.output.map(item => "DELETED." + item).join(", ")}`;
          q += "\n";
        }
      }

      // FROM, AS
      if (def.as !== undefined || (def.join && def.join.length > 0)) {
        q += `FROM ${def.from}`;
        if (def.as !== undefined) {
          q += ` as ${def.as}`;
        }
        q += "\n";
      }


      // JOIN
      if (def.join && def.join.length > 0) {
        for (const joinDef of def.join) {
          q += this._getQueryOfJoinDef(joinDef);
          q += "\n";
        }
      }

      // WHERE
      if (def.where) {
        q += `WHERE ${def.where.map(item => this.getQueryOfQueryValue(item)).join("")}`;
        q += "\n";
      }

      return q.trim();
    }
  }

  public createDatabaseIfNotExists(def: ICreateDatabaseIfNotExistsQueryDef): string {
    if (this._dialect === "mysql") {
      return `
CREATE DATABASE IF NOT EXISTS ${this.wrap(def.database)};
ALTER DATABASE ${this.wrap(def.database)} CHARACTER SET utf8 COLLATE utf8_bin;`.trim();
    }
    if (this._dialect === "postgresql") {
      return `CREATE SCHEMA IF NOT EXISTS ${this.wrap(def.database)};`.trim();
    }
    else {
      return `IF NOT EXISTS(select * from sys.databases WHERE name='${def.database}') CREATE DATABASE ${this.wrap(def.database)}`.trim();
    }
  }

  public clearDatabaseIfExists(def: IClearDatabaseIfExistsQueryDef): string {
    if (this._dialect === "mysql") {
      // throw new NotImplementError();
      return `
IF EXISTS (SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '${def.database}') THEN
    DELETE FROM mysql.proc WHERE db = '${def.database}';

    SET @views = NULL;
    SELECT GROUP_CONCAT(table_schema, '.', table_name) INTO @views
    FROM information_schema.views
    WHERE table_schema = '${def.database}';

    SET @views = IFNULL(CONCAT('DROP VIEW ', @views), 'SELECT "No Views"');
    PREPARE stmt FROM @views;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;

    SET @tables = NULL;
    SELECT GROUP_CONCAT(table_schema, '.', table_name) INTO @tables
    FROM information_schema.tables
    WHERE table_schema = '${def.database}';

    SET @tables = IFNULL(CONCAT('DROP TABLE ', @tables), 'SELECT "No Tables"');
    PREPARE stmt FROM @tables;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END IF;`.trim();
    }
    else if (this._dialect === "postgresql") {
      return `DROP SCHEMA IF EXISTS ${this.wrap(def.database)} CASCADE;`.trim();
    }
    else {
      return `
IF EXISTS(select * from sys.databases WHERE name='${def.database}')
BEGIN
  DECLARE @sql NVARCHAR(MAX);
  SET @sql = N'';
    
  -- 프록시저 초기화
  SELECT @sql = @sql + 'DROP PROCEDURE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(o.name) +';' + CHAR(13) + CHAR(10)
  FROM ${this.wrap(def.database)}.sys.sql_modules m
  INNER JOIN ${this.wrap(def.database)}.sys.objects o ON m.object_id=o.object_id
  WHERE type_desc like '%PROCEDURE%'
    
  -- 함수 초기화
  SELECT @sql = @sql + 'DROP FUNCTION ${this.wrap(def.database)}.' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(o.name) + N';' + CHAR(13) + CHAR(10)
  FROM ${this.wrap(def.database)}.sys.sql_modules m
  INNER JOIN ${this.wrap(def.database)}.sys.objects o ON m.object_id=o.object_id
  WHERE type_desc like '%function%'
    
  -- 뷰 초기화
  SELECT @sql = @sql + 'DROP VIEW ${this.wrap(def.database)}.' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(v.name) + N';' + CHAR(13) + CHAR(10)
  FROM ${this.wrap(def.database)}.sys.views v
    
  -- 테이블 FK 끊기 초기화
  SELECT @sql = @sql + N'ALTER TABLE ${this.wrap(def.database)}.' + QUOTENAME(SCHEMA_NAME([tbl].schema_id)) + '.' + QUOTENAME([tbl].[name]) + N' DROP CONSTRAINT ' + QUOTENAME([obj].[name]) + N';' + CHAR(13) + CHAR(10)
  FROM ${this.wrap(def.database)}.sys.tables [tbl]
  INNER JOIN ${this.wrap(def.database)}.sys.objects AS [obj] ON [obj].[parent_object_id] = [tbl].[object_id] AND [obj].[type] = 'F'

  -- 테이블 삭제
  SELECT @sql = @sql + N'DROP TABLE ${this.wrap(def.database)}.' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME([tbl].[name]) + N';' + CHAR(13) + CHAR(10)
  FROM ${this.wrap(def.database)}.sys.tables [tbl]
  WHERE [type]= 'U'

  EXEC(@sql);
END`.trim();
    }
  }

  public createTable(def: ICreateTableQueryDef): string {
    const tableName = this.getTableName(def.table);

    let query = "";
    query += `CREATE TABLE ${tableName} (\n`;
    query += def.columns.map(colDef => "  " + this._getQueryOfColDef(colDef)).join(",\n");
    if (def.primaryKeys.length > 0) {
      query += ",\n";
      if (this._dialect === "mysql") {
        query += `  PRIMARY KEY (${def.primaryKeys.map(item => `${this.wrap(item.column)} ${item.orderBy}`).join(", ")})\n`;
      }
      else {
        query += `  CONSTRAINT ${this.wrap(`PK_${def.table.name}`)} PRIMARY KEY (${def.primaryKeys.map(item => (this.wrap(item.column) + (item.orderBy === "ASC" ? "" : ` ${item.orderBy}`))).join(", ")})\n`;
      }
    }
    else {
      query += "\n";
    }
    query += ");";
    return query.trim();
  }

  public dropTable(def: IDropTableQueryDef): string {
    const tableName = this.getTableName(def.table);
    return `DROP TABLE ${tableName}`;
  }

  public addColumn(def: IAddColumnQueryDef): string[] {
    const tableName = this.getTableName(def.table);

    const queries: string[] = [];
    if (!def.column.nullable && def.column.defaultValue !== undefined) {
      queries.push(`ALTER TABLE ${tableName} ADD ${this._getQueryOfColDef({
        ...def.column,
        nullable: true
      })}`);
      queries.push("GO");
      queries.push(`UPDATE ${tableName} SET ${this.wrap(def.column.name)} = ${this.getQueryOfQueryValue(def.column.defaultValue)}`);
      queries.push("GO");
      queries.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this._getQueryOfColDef(def.column)}`);
    }
    else {
      queries.push(`ALTER TABLE ${tableName} ADD ${this._getQueryOfColDef(def.column)}`);
    }

    return queries;
  }

  public removeColumn(def: IRemoveColumnQueryDef): string {
    const tableName = this.getTableName(def.table);
    return `ALTER TABLE ${tableName} DROP COLUMN ${this.wrap(def.column)}`;
  }

  public modifyColumn(def: IModifyColumnQueryDef): string[] {
    const tableName = this.getTableName(def.table);

    const queries: string[] = [];
    if (!def.column.nullable && def.column.defaultValue !== undefined) {
      queries.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this._getQueryOfColDef({
        ...def.column,
        nullable: true
      })}`);
      queries.push(`UPDATE ${tableName} SET ${this.wrap(def.column.name)} = ${this.getQueryOfQueryValue(def.column.defaultValue)} WHERE ${this.wrap(def.column.name)} IS NULL`);
    }
    queries.push(`ALTER TABLE ${tableName} ALTER COLUMN ${this._getQueryOfColDef(def.column)}`);
    return queries;
  }

  public renameColumn(def: IRenameColumnQueryDef): string {
    return `EXECUTE ${def.table.database}..sp_rename N'${def.table.schema}.${def.table.name}.${this.wrap(def.prevName)}', N'${def.nextName}', 'COLUMN'`;
  }

  // public addPrimaryKey(def: IAddPrimaryKeyQueryDef): string {
  //   if (def.primaryKeys.length <= 0) {
  //     throw new Error("설정할 PK가 입력되지 않았습니다.");
  //   }
  //
  //   const tableName = this.getTableName(def.table);
  //   return `ALTER TABLE ${tableName} ADD PRIMARY KEY (${def.primaryKeys.map(item => `${this._w(item.column)} ${item.orderBy}`).join(", ")})`;
  // }

  public addForeignKey(def: IAddForeignKeyQueryDef): string {
    const tableName = this.getTableName(def.table);
    const tableNameChain = this.getTableNameChain(def.table);
    const fkName = this.wrap(`FK_${tableNameChain.join("_")}_${def.foreignKey.name}`);
    const targetTableName = this.getTableName(def.foreignKey.targetTable);

    let query = "";
    query += `ALTER TABLE ${tableName} ADD CONSTRAINT ${fkName} FOREIGN KEY (${def.foreignKey.fkColumns.map(columnName => `${this.wrap(columnName)}`).join(", ")})\n`;
    query += `  REFERENCES ${targetTableName} (${def.foreignKey.targetPkColumns.map(columnName => `${this.wrap(columnName)}`).join(", ")})\n`;
    query += "  ON DELETE NO ACTION\n";
    query += "  ON UPDATE NO ACTION";
    return query.trim();
  }

  public removeForeignKey(def: IRemoveForeignKeyQueryDef): string {
    const tableName = this.getTableName(def.table);
    const tableNameChain = this.getTableNameChain(def.table);
    const fkName = this.wrap(`FK_${tableNameChain.join("_")}_${def.foreignKey}`);

    return `ALTER TABLE ${tableName} DROP CONSTRAINT ${fkName}`;
  }

  public createIndex(def: ICreateIndexQueryDef): string {
    const tableName = this.getTableName(def.table);
    const tableNameChain = this.getTableNameChain(def.table);
    const idxName = this.wrap(`IDX_${tableNameChain.join("_")}_${def.index.name}`);

    return `CREATE INDEX ${idxName} ON ${tableName} (${def.index.columns.map(item => `${this.wrap(item.name)} ${item.orderBy}`).join(", ")})`;
  }

  public configIdentityInsert(def: IConfigIdentityInsertQueryDef): string {
    if (this._dialect === "mysql") {
      return "";
    }
    else {
      const tableName = this.getTableName(def.table);
      return `SET IDENTITY_INSERT ${tableName} ${def.state.toUpperCase()}`;
    }
  }

  public query(def: TQueryDef): string {
    return this[def.type](def as any) as string;
  }

  public getQueryOfQueryValue(queryValue: TQueryValueOrSelect | TQueryValueOrSelectArray): string {
    if (queryValue === undefined) {
      return "NULL";
    }
    else if (
      typeof queryValue === "string" || (queryValue as TQueryValue) instanceof String ||
      typeof queryValue === "number" || (queryValue as TQueryValue) instanceof Number
    ) {
      return (queryValue as string | number).toString();
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
      return "(" + (queryValue as TQueryValueArray).map(item => this.getQueryOfQueryValue(item)).join("") + ")";
    }
    else if (queryValue["from"] !== undefined) {
      let subQuery = `(\n`;
      subQuery += "  " + this.select(queryValue as ISelectQueryDef).replace(/\n/g, "\n  ") + "\n";
      subQuery += `)`;
      return subQuery;
    }
    else {
      throw new TypeError(`${queryValue?.["constructor"]?.["name"] ?? typeof queryValue}: ${queryValue as string}: ${JsonConvert.stringify(queryValue)}`);
    }
  }

  public getTableNameChain(def: ITableNameDef): string[] {
    if (this._dialect === "mysql" || this._dialect === "postgresql") {
      if (def.database !== undefined) {
        return [def.database, def.name];
      }
      else {
        return [def.name];
      }
    }
    else {
      if (def.database !== undefined) {
        return [def.database, def.schema ?? "dbo", def.name];
      }
      else if (def.schema !== undefined) {
        return [def.schema, def.name];
      }
      else {
        return [def.name];
      }
    }
  }

  public getTableName(def: ITableNameDef): string {
    return this.getTableNameChain(def).map(item => this.wrap(item)).join(".");
  }

  public wrap(name: string): string {
    return this._dialect === "mysql" ? "`" + name + "`" :
      this._dialect === "postgresql" ? "\"" + name + "\"" :
        "[" + name + "]";
  }

  public unwrap(wrappedName: string): string {
    return this._dialect === "mysql" ? wrappedName.replace(/^`/, "").replace(/`$/, "") :
      this._dialect === "postgresql" ? wrappedName.replace(/^"/, "").replace(/"$/, "") :
        wrappedName.replace(/^\[/, "").replace(/]$/, "");
  }

  public type(type: Type<TQueryValue>): string {
    switch (type) {
      case String:
        if (this._dialect === "postgresql") {
          return "TEXT";
        }
        return "NVARCHAR(255)";
      case Number:
        return "BIGINT";
      case Boolean:
        return "BIT";
      case DateTime:
        return "DATETIME2";
      case DateOnly:
        return "DATE";
      case Time:
        return "TIME";
      case Uuid:
        return "UNIQUEIDENTIFIER";
      case Buffer:
        return "VARBINARY(MAX)";
      default:
        throw new TypeError(type ? type.name : "undefined");
    }
  }

  private _getQueryOfJoinDef(def: IJoinQueryDef): string {
    let q = "";

    if (Object.keys(def).every(key => def[key] === undefined || (["where", "from", "as", "select", "isSingle"].includes(key)))) {
      if (def.from instanceof Array) {
        q += `LEFT OUTER JOIN (\n`;
        for (const from of def.from) {
          q += "  " + this.select(from).replace(/\n/g, "\n  ");
          q += "\n\n  UNION ALL\n\n";
        }
        q = q.slice(0, -14);
        q += `) as ${def.as}`;
      }
      else if (def.from["from"] !== undefined) {
        const joinFromQueryDef = def.from as ISelectQueryDef;
        q += `LEFT OUTER JOIN (\n`;
        q += "  " + this.select(joinFromQueryDef).replace(/\n/g, "\n  ") + "\n";
        q += `) as ${def.as}`;
      }
      else {
        q += `LEFT OUTER JOIN ${def.from as string} as ${def.as}`;
      }

      if (def.where) {
        q += ` ON ${def.where.map(item => this.getQueryOfQueryValue(item)).join("")}`;
      }
      else {
        q += ` ON 1 = 1`;
      }
    }
    else {
      if (!def.select) {
        throw new Error("OUTER APPLY 쿼리를 사용하려면, SELECT 가 지정되어야 합니다. (JOIN 에 \"where\", \"from\", \"as\"외의 값 설정시, 자동으로 OUTER APPLY 를 사용합니다.)");
      }
      const joinFullDef = def as ISelectQueryDef;

      q += "OUTER APPLY (\n";
      q += "  " + this.select(joinFullDef).replace(/\n/g, "\n  ") + "\n";
      q += ") as " + joinFullDef.as;
    }

    return q.trim();
  }

  private _getQueryOfColDef(colDef: {
    name: string;
    dataType: string;
    autoIncrement?: boolean;
    nullable?: boolean;
  }): string {
    let q = "";

    if (this._dialect === "mysql") {
      q += this.wrap(colDef.name) + " ";
      q += colDef.dataType + " ";
      q += colDef.nullable ? "NULL " : "NOT NULL ";
      q += colDef.autoIncrement ? "AUTO_INCREMENT" : "";
    }
    if (this._dialect === "postgresql") {
      q += this.wrap(colDef.name) + " ";
      q += colDef.dataType + " ";
      q += colDef.nullable ? "NULL " : "NOT NULL ";
      q += colDef.autoIncrement ? "GENERATED BY DEFAULT AS IDENTITY" : "";
    }
    else {
      q += this.wrap(colDef.name) + " ";
      q += colDef.dataType + " ";
      q += colDef.autoIncrement ? "IDENTITY(1,1) " : "";
      q += colDef.nullable ? "NULL" : "NOT NULL";
    }

    return q;
  }
}
