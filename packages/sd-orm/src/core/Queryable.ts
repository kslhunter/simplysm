import {BigInt, Decimal, NChar, Numeric, Table} from "mssql";
import {DateOnly, Exception, LambdaParser, NotImplementedException, Safe, Type, Uuid} from "../../../sd-core/src";
import {IForeignKeyDefinition, IForeignKeyTargetDefinition, ITableDefinition} from "../common/Definitions";
import {DataType, OrderByRule} from "../common/Enums";
import {QueryHelper} from "../common/QueryHelper";
import {tableMetadataSymbol} from "../common/TableDecorators";
import {Database} from "./Database";
import {QueryMaker} from "./QueryMaker";

export class QueriedBoolean extends Boolean {
}

export interface IJoinDefinition {
  inner: boolean;
  queryable: Queryable<any>;
  isMulti: boolean;
}

export class QueryUnit<T> {
  public constructor(public type: Type<T> | undefined, public query: string) {
  }
}

export class Queryable<T> {
  private _distinct?: boolean;
  private readonly _from: string | Queryable<any> | Queryable<any>[];
  private readonly _as: string;
  private _top?: number;
  private _hasCustomSelect = false;
  private _select: { [key: string]: any } = {};
  private _join: IJoinDefinition[] = [];
  private _where: QueryUnit<QueriedBoolean>[] = [];
  private _groupBy: QueryUnit<any>[] = [];
  private _having: QueryUnit<QueriedBoolean>[] = [];
  private _orderBy: { queryUnit: QueryUnit<any>; orderBy: OrderByRule }[] = [];

  public get query(): string {
    let query = "\nSELECT";
    if (this._distinct) {
      query += ` DISTINCT`;
    }

    if (this._top) {
      query += ` TOP ${this._top}`;
    }

    query += "\n";
    for (const as of Object.keys(this._select)) {
      query += "\t";
      if (this._select[as] instanceof QueryUnit) {
        if (this._select[as].type === QueriedBoolean) {
          query += `CASE WHEN ${this._select[as].query} THEN 1 ELSE 0 END`;
        }
        else {
          query += this._select[as].query;
        }
      }
      else {
        query += this._value(this._select[as]);
      }
      query += ` as ${this._key(as)},\n`;
    }
    query = query.slice(0, -2);

    query += "\n";
    query += `FROM `;
    if (typeof this._from === "string") {
      query += this._key(this._from);
    }
    else if (this._from instanceof Queryable) {
      query += "(\n";
      query += `\t${this._from.query.replace(/\n/g, "\n\t").trim()}\n`;
      query += ")";
    }
    else if (this._from instanceof Array) {
      query += "(\n";
      for (const fromItem of this._from) {
        query += `\t${fromItem.query.replace(/\n/g, "\n\t").trim()}\n`;
        query += "\n\tUNION ALL\n\n";
      }
      query = query.slice(0, -13);
      query += ")";
    }
    else {
      throw new NotImplementedException();
    }
    query += ` ${this._key(this._as)}\n`;

    for (const join of this._join) {
      const isCrossApply = join.queryable._top
        || join.queryable._distinct
        || join.queryable._groupBy.length > 0
        || join.queryable._having.length > 0
        || join.queryable._orderBy.length > 0
        || join.queryable._join.length > 0
        || (typeof join.queryable._from !== "string")
        || join.queryable._hasCustomSelect;

      if (!isCrossApply) {
        query += !join.inner ? "LEFT OUTER JOIN" : "INNER JOIN";

        query += ` ${this._key(join.queryable._from as string)}`;
        query += ` as ${this._key(join.queryable._as)}`;
        query += ` ON (${join.queryable._where.map((item) => item.query).join(") AND (")})\n`;
      }
      else {
        query += !join.inner ? "OUTER APPLY" : "CROSS APPLY";
        query += "(\n";
        query += `\t${join.queryable.query.replace(/\n/g, "\n\t").trim()}\n`;
        query += `) ${this._key(join.queryable._as)}\n`;
      }
    }

    if (this._where.length > 0) {
      query += "WHERE ";
      query += `(${this._where.map((item) => item.query).join(")\nAND (")})\n`;
    }

    if (this._groupBy.length > 0) {
      query += "GROUP BY ";
      query += `${this._groupBy.map((item) => item.query).join(", ")}\n`;
    }

    if (this._having.length > 0) {
      query += "HAVING ";
      query += `${this._having.map((item) => item.query).join("\nAND ")}\n`;
    }

    if (this._orderBy.length > 0) {
      query += `ORDER BY ${this._orderBy.map((item) => `${item.queryUnit.query} ${item.orderBy}`).join(", ")}\n`;
    }

    return query;
  }

  private get _entity(): T {
    const result: T = {} as any;
    for (const columnName of Object.keys(this._select)) {
      if (columnName.includes(".")) {
        //a.b.c
        const columnNameChain = columnName.split("."); //['a', 'b', 'c']
        let curr: { [key: string]: any } | { [key: string]: any }[] = result;
        for (let i = 0; i < columnNameChain.length - 1; i++) {
          const currColumnChain = columnNameChain.slice(0, i + 1); // ['a'] => ['a', 'b']

          if (this._isMultiJoin(currColumnChain.join("."))) {
            curr[currColumnChain.last()!] = curr[currColumnChain.last()!] || [{}];
            curr = curr[currColumnChain.last()!][0];
          }
          else {
            curr[currColumnChain.last()!] = curr[currColumnChain.last()!] || {};
            curr = curr[currColumnChain.last()!];
          }
        }

        curr[columnNameChain.last()!] = this._select[columnName];
      }
      else {
        result[columnName] = this._select[columnName];
      }
    }
    return result;
  }

  public constructor(public db: Database, public tableType: Type<T> | undefined, from?: string | Queryable<T> | Queryable<any>[], as?: string) {
    if (!this.tableType && !from) {
      throw new Exception("UNION을 제외한 모든 경우에, 루트 테이블타입이 꼭 설정되어야 합니다.");
    }

    this._from = from || tableType!.name;
    this._as = as || "TBL";

    if (this._from instanceof Queryable) {
      for (const key of Object.keys(this._from._select)) {
        let type = this._from._select[key] ? (this._from._select[key] instanceof QueryUnit ? this._from._select[key].type : this._from._select[key].constructor) : undefined;
        if (type === QueriedBoolean) {
          type = Boolean;
        }
        this._select[key] = new QueryUnit(type, this._key(this._as, key));
      }
    }
    else if (this._from instanceof Array) {
      for (const key of Object.keys(this._from[0]._select)) {
        let type = this._from[0]._select[key] ? (this._from[0]._select[key] instanceof QueryUnit ? this._from[0]._select[key].type : this._from[0]._select.constructor) : undefined;
        if (type === QueriedBoolean) {
          type = Boolean;
        }
        this._select[key] = new QueryUnit(type, this._key(this._as, key));
      }
    }
    else if (this.tableType) {
      const tableDef: ITableDefinition = Reflect.getMetadata(tableMetadataSymbol, this.tableType);
      if (!tableDef) {
        throw new Exception(`테이블 정의를 찾을 수 없습니다. (${this.tableType.name})`);
      }

      for (const colDef of tableDef.columns) {
        const selectColumnName = /*(as ? as + "." : "") +*/ colDef.name;
        this._select[selectColumnName] = new QueryUnit(
          QueryHelper.convertFromDataType(colDef.dataType),
          this._key(this._as, colDef.name)
        );
      }
    }
  }

  public async insertAsync(record: T): Promise<any> {
    if (!this.tableType) {
      throw new Exception("UNION시에는 사용할 수 없는 기능입니다.");
    }

    const query = this._getInsertQuery(record);

    const result = await this.db.execute<T>(query);
    return result.recordset
      ? Object.values(this._parseResult(result.recordset)[0])[0]
      : undefined;
  }

  public insertPrepare(record: T): void {
    if (!this.tableType) {
      throw new Exception("UNION시에는 사용할 수 없는 기능입니다.");
    }

    const query = this._getInsertQuery(record);
    this.db.prepare(query);
  }

  public async insertRangeAsync(records: T[]): Promise<any[]> {
    if (!this.tableType) {
      throw new Exception("UNION시에는 사용할 수 없는 기능입니다.");
    }

    let query = "";
    for (const record of records) {
      query += this._getInsertQuery(record);
      query += "\n";
    }

    const result = await this.db.execute<T>(query);
    return result.recordsets
      ? result.recordsets.map((item) => item ? Object.values(this._parseResult(item)[0])[0] : undefined)
      : [];
  }

  public insertRangePrepare(records: T[]): void {
    if (!this.tableType) {
      throw new Exception("UNION시에는 사용할 수 없는 기능입니다.");
    }

    let query = "";
    for (const record of records) {
      query += this._getInsertQuery(record);
      query += "\n";
    }
    this.db.prepare(query);
  }

  private _getInsertQuery(record: any): string {
    if (!this.tableType) {
      throw new Exception("UNION시에는 사용할 수 없는 기능입니다.");
    }

    const tableDef: ITableDefinition = Reflect.getMetadata(tableMetadataSymbol, this.tableType);
    const tableName = this._key(tableDef.name);
    const obj = Object.assign(new this.tableType(), record);
    const columns = Object.keys(obj).map((key) => this._key(key));
    const values = Object.values(obj).map((val) => this._value(val));

    let query = `INSERT INTO ${tableName} (${columns.join(", ")})`;
    if (tableDef.primaryKeyColumns.length === 1) {
      const pkName = this._key(tableDef.primaryKeyColumns[0].name);
      query += ` OUTPUT INSERTED.${pkName}`;
    }
    query += "\n";
    query += `VALUES (${values.join(", ")});`;

    const pkNames = tableDef.primaryKeyColumns.map((item) => item.name);
    if (pkNames.some((pkName) => Object.keys(obj).includes(pkName))) {
      query = `
IF EXISTS (SELECT ${this._key("NAME")} FROM SYS.IDENTITY_COLUMNS WHERE OBJECT_NAME(OBJECT_ID) = ${this._value(tableDef.name)})
BEGIN
    SET IDENTITY_INSERT ${this._key(tableDef.name)} ON;
END

${query}

IF EXISTS (SELECT ${this._key("NAME")} FROM SYS.IDENTITY_COLUMNS WHERE OBJECT_NAME(OBJECT_ID) = ${this._value(tableDef.name)})
BEGIN
    SET IDENTITY_INSERT ${this._key(tableDef.name)} OFF;
END`;
    }

    return query;
  }

  public async bulkInsertAsync(objs: T[]): Promise<void> {
    if (!this.tableType) {
      throw new Exception("UNION시에는 사용할 수 없는 기능입니다.");
    }

    const tableDef: ITableDefinition = Reflect.getMetadata(tableMetadataSymbol, this.tableType);
    const table = new Table(tableDef.name);

    for (const colDef of tableDef.columns) {
      const length = colDef.length || (
        colDef.dataType === DataType.NVARCHAR ? "4000"
          : colDef.dataType === DataType.VARBINARY ? "4000"
          : undefined
      );

      let colType: any;
      try {
        colType = QueryHelper.convertToSqlType(colDef.dataType as DataType) as any;
        if (length) {
          colType = colType(length);
        }
      }
      catch (e) {
        if (e instanceof TypeError) {
          if (colDef.dataType.startsWith("DECIMAL")) {
            const match = colDef.dataType.match(/DECIMAL\(([0-9]*),\s?([0-9]*)\)/);
            const length1 = Number(match![1]);
            const length2 = Number(match![2]);
            colType = Decimal(length1, length2);
          }
          else if (colDef.dataType.startsWith("NUMERIC")) {
            const match = colDef.dataType.match(/NUMERIC\(([0-9]*),\s?([0-9]*)\)/);
            const length1 = Number(match![1]);
            const length2 = Number(match![2]);
            colType = Numeric(length1, length2);
          }
          else if (colDef.dataType.startsWith("NCHAR")) {
            const match = colDef.dataType.match(/NCHAR\(([0-9]*)\)/);
            const length1 = Number(match![1]);
            colType = NChar(length1);
          }
          else if (colDef.dataType === "BIGINT") {
            colType = BigInt;
          }
          else {
            throw e;
          }
        }
        else {
          throw e;
        }
      }

      table.columns.add(colDef.name, colType, {
        nullable: colDef.nullable,
        primary: tableDef.primaryKeyColumns.some((pk) => pk.name === colDef.name)
      });
    }
    for (const obj of objs) {
      table.rows.add.apply(table.rows, tableDef.columns.map((col) => {
        if (obj[col.name] instanceof DateOnly) {
          return new Date(obj[col.name].getTime());
        }
        return obj[col.name];
      }));
    }
    await this.db.executeBulkInsert(table);
  }

  public async upsertAsync(record: T, keys?: (keyof T)[]): Promise<any> {
    if (!this.tableType) {
      throw new Exception("UNION시에는 사용할 수 없는 기능입니다.");
    }

    const query = this._getUpsertQuery(record, keys);
    const result = await this.db.execute(query);
    return result.recordset
      ? Object.values(this._parseResult(result.recordset)[0])[0]
      : undefined;
  }

  public upsertPrepare(record: T, keys?: (keyof T)[]): void {
    if (!this.tableType) {
      throw new Exception("UNION시에는 사용할 수 없는 기능입니다.");
    }

    const query = this._getUpsertQuery(record, keys);
    this.db.prepare(query);
  }

  public async upsertRangeAsync(records: T[], keys?: (keyof T)[]): Promise<T[]> {
    if (!this.tableType) {
      throw new Exception("UNION시에는 사용할 수 없는 기능입니다.");
    }

    const query = records
      .map((obj) => {
        const initObj: T = new this.tableType!();
        Object.assign(initObj, obj);
        return this._getUpsertQuery(initObj, keys);
      })
      .join("\n");

    const result = await this.db.execute(query);
    return records.map((record: any, index) => {
      return {
        ...record,
        ...result.recordsets[index][0]
      };
    });
  }

  public upsertRangePrepare(records: T[], keys?: (keyof T)[]): void {
    if (!this.tableType) {
      throw new Exception("UNION시에는 사용할 수 없는 기능입니다.");
    }

    const query = records
      .map((obj) => {
        const initObj: T = new this.tableType!();
        Object.assign(initObj, obj);
        return this._getUpsertQuery(initObj, keys);
      })
      .join("\n");

    this.db.prepare(query);
  }

  private _getUpsertQuery(record: any, keys?: string[]): string {
    if (!this.tableType) {
      throw new Exception("UNION시에는 사용할 수 없는 기능입니다.");
    }

    const r = Object.assign(new this.tableType(), record);

    const tableDef: ITableDefinition = Reflect.getMetadata(tableMetadataSymbol, this.tableType);
    const primaryKeys = tableDef.primaryKeyColumns.map((item) => item.name);
    keys = keys || primaryKeys;

    let query = `
MERGE ${this._key(tableDef.name)}
USING (SELECT ${keys.map((key) => `${this._value(r[key])} as ${this._key(key)}`).join(", ")}) as ${this._key("match")}
ON ${keys.map((key1) => `${this._key(tableDef.name, key1)} = ${this._key("match", key1)}`).join(" AND ")}
WHEN MATCHED THEN
    UPDATE SET ${Object.keys(r).map((key) => keys!.includes(key) ? "" : `${this._key(tableDef.name, key)} = ${this._value(r[key])}`).filter((item) => item).join(", ")}
WHEN NOT MATCHED THEN
	INSERT (${Object.keys(r).map((key) => this._key(key)).join(", ")})
	VALUES (${Object.keys(r).map((key) => this._value(r[key])).join(", ")})
	OUTPUT INSERTED.${this._key(keys[0])};
`.trim();

    if (primaryKeys.some((pkName) => Object.keys(record).includes(pkName)) && keys!.orderBy().join("_") === primaryKeys.orderBy().join("_")) {
      query = `
IF EXISTS (SELECT ${this._key("NAME")} FROM SYS.IDENTITY_COLUMNS WHERE OBJECT_NAME(OBJECT_ID) = ${this._value(tableDef.name)})
BEGIN
    SET IDENTITY_INSERT ${this._key(tableDef.name)} ON;
END

${query}

IF EXISTS (SELECT ${this._key("NAME")} FROM SYS.IDENTITY_COLUMNS WHERE OBJECT_NAME(OBJECT_ID) = ${this._value(tableDef.name)})
BEGIN
    SET IDENTITY_INSERT ${this._key(tableDef.name)} OFF;
END`;
    }

    return query;
  }

  public async insertToAsync<G extends { [key: string]: any }>(to: Queryable<G>, predicate: (q: QueryMaker<T>) => G): Promise<number[]> {
    const originQueryable = this.select((q) => predicate(q) as any);
    const targetTableDef: ITableDefinition = Reflect.getMetadata(tableMetadataSymbol, to.tableType!);
    const targetName = targetTableDef.name;

    let query = `INSERT INTO ${this._key(targetName)}(\n`;
    query += `\t${Object.keys(originQueryable._select).map((item) => this._key(item)).join(",\n    ").trim()}\n`;
    query += ")\n";
    if (targetTableDef.primaryKeyColumns.length === 1) {
      const pkName = this._key(targetTableDef.primaryKeyColumns[0].name);
      query += `OUTPUT INSERTED.${pkName}`;
    }
    query += "\n";
    query += originQueryable.query.trim();

    const results = (await this.db.execute(query)).recordsets;
    return results.map((item) => item && item.length > 0
      ? Object.values(this._parseResult(item)[0])[0]
      : undefined);
  }

  public async updateAsync(predicate: (q: QueryMaker<T>) => Partial<T> | void): Promise<number> {
    const selectQuery = this.query.replace(/\n/g, "\n\t");
    const entity = this._wrap()._entity;
    const obj = predicate(new QueryMaker(entity)) || entity;

    const getUpdateFieldQuery = (obj1: any, parentNameChain?: string[]): string => {
      let fieldQuery1 = "";
      const realObj = obj1 instanceof Array ? obj1[0] : obj1;
      for (const columnName of Object.keys(realObj)) {
        const queryValue = realObj[columnName];
        const entityValue = parentNameChain
          ? this._getEntryByChain(parentNameChain.concat([columnName]))
          : this._entity[columnName];
        if (JSON.stringify(queryValue) === JSON.stringify(entityValue)) {
          continue;
        }

        if (this._join.some((item) => item.queryable._as === (parentNameChain ? parentNameChain.concat(columnName).join(".") : columnName))) {
          fieldQuery1 += getUpdateFieldQuery(realObj[columnName], (parentNameChain ? parentNameChain.concat([columnName]) : [columnName]));
        }
        else {
          fieldQuery1 += `\t${parentNameChain ? this._key(parentNameChain.concat(columnName).join(".")) : this._key(columnName)} = `;

          if (queryValue instanceof QueryUnit) {
            if (queryValue.type === QueriedBoolean) {
              fieldQuery1 += `CASE WHEN ${queryValue.query} THEN 1 ELSE 0 END`;
            }
            else {
              fieldQuery1 += queryValue.query;
            }
          }
          else {
            fieldQuery1 += this._value(queryValue);
          }
          fieldQuery1 += `,\n`;
        }
      }
      return fieldQuery1;
    };

    let fieldQuery = getUpdateFieldQuery(obj);
    fieldQuery = `${fieldQuery.slice(0, -2)}\n`;

    let query = `UPDATE ${this._key("TBL")} SET\n`;
    query += fieldQuery;
    query += `FROM (\n`;
    query += `\t${selectQuery.trim()}\n`;
    query += ") [TBL]";
    return (await this.db.execute(query)).rowsAffected[0];
  }

  public updatePrepare(predicate: (q: QueryMaker<T>) => Partial<T> | void): void {
    const selectQuery = this.query.replace(/\n/g, "\n\t");
    const entity = this._entity;
    const obj = predicate(new QueryMaker(entity)) || entity;

    const getUpdateFieldQuery = (obj1: any, parentNameChain?: string[]): string => {
      let fieldQuery1 = "";
      const realObj = obj1 instanceof Array ? obj1[0] : obj1;
      for (const columnName of Object.keys(realObj)) {
        const queryValue = realObj[columnName];
        const entityValue = parentNameChain
          ? this._getEntryByChain(parentNameChain.concat([columnName]))
          : this._entity[columnName];
        if (JSON.stringify(queryValue) === JSON.stringify(entityValue)) {
          continue;
        }

        if (this._join.some((item) => item.queryable._as === (parentNameChain ? parentNameChain.concat(columnName).join(".") : columnName))) {
          fieldQuery1 += getUpdateFieldQuery(realObj[columnName], (parentNameChain ? parentNameChain.concat([columnName]) : [columnName]));
        }
        else {
          fieldQuery1 += `\t${parentNameChain ? this._key(parentNameChain.concat(columnName).join(".")) : this._key(columnName)} = `;

          if (queryValue instanceof QueryUnit) {
            if (queryValue.type && queryValue.type.name === "QueriedBoolean") {
              fieldQuery1 += `CASE WHEN ${queryValue.query} THEN 1 ELSE 0 END`;
            }
            else {
              fieldQuery1 += queryValue.query;
            }
          }
          else {
            fieldQuery1 += this._value(queryValue);
          }
          fieldQuery1 += `,\n`;
        }
      }
      return fieldQuery1;
    };

    let fieldQuery = getUpdateFieldQuery(obj);
    fieldQuery = `${fieldQuery.slice(0, -2)}\n`;

    let query = `UPDATE ${this._key("TBL")} SET\n`;
    query += fieldQuery;
    query += `FROM (\n`;
    query += `\t${selectQuery.trim()}\n`;
    query += ") [TBL]";
    this.db.prepare(query);
  }

  public async deleteAsync(): Promise<number> {
    if (!this.tableType) {
      throw new Exception("UNION시에는 사용할 수 없는 기능입니다.");
    }

    const tableDef: ITableDefinition = Reflect.getMetadata(tableMetadataSymbol, this.tableType);
    const pkColumns = tableDef.primaryKeyColumns.map((item) => item.name);

    const pkConcatString = pkColumns.length > 1
      ? pkColumns.map((pkCol) => this._key("TBL", pkCol)).join(" + ")
      : this._key("TBL", pkColumns[0]);

    const tableName = this._key(tableDef.name);
    const pkConcatString2 = pkColumns.length > 1
      ? pkColumns.map((pkCol) => this._key(pkCol)).join(" + ")
      : this._key(pkColumns[0]);

    const selectQuery = this
      .select((entity) => ({
        PKS: new QueryUnit(String, pkConcatString)
      }))
      .query
      .replace(/\n/g, "\n\t");

    const query = `DELETE FROM ${tableName} WHERE ${pkConcatString2} IN (${selectQuery}\n)`;
    return (await this.db.execute(query)).rowsAffected[0];
  }

  public deletePrepare(): void {
    if (!this.tableType) {
      throw new Exception("UNION시에는 사용할 수 없는 기능입니다.");
    }

    const tableDef: ITableDefinition = Reflect.getMetadata(tableMetadataSymbol, this.tableType);
    const pkColumns = tableDef.primaryKeyColumns.map((item) => item.name);

    const pkConcatString = pkColumns.length > 1
      ? pkColumns.map((pkCol) => this._key("TBL", pkCol)).join(" + ")
      : this._key("TBL", pkColumns[0]);

    const tableName = this._key(tableDef.name);
    const pkConcatString2 = pkColumns.length > 1
      ? pkColumns.map((pkCol) => this._key(pkCol)).join(" + ")
      : this._key(pkColumns[0]);

    const selectQuery = this
      .select((entity) => ({
        PKS: new QueryUnit(String, pkConcatString)
      }))
      .query
      .replace(/\n/g, "\n\t");

    const query = `DELETE FROM ${tableName} WHERE ${pkConcatString2} IN (${selectQuery}\n)`;
    this.db.prepare(query);
  }

  public select<S extends { [key: string]: any }>(selectorFn: (queryHelper: QueryMaker<T>) => S): Queryable<S> {
    const result = this._hasCustomSelect ? this._wrap() : this._clone();
    result._select = selectorFn(new QueryMaker(result._entity));
    result._hasCustomSelect = true;
    return result as any;
  }

  public where(queriesFn: (queryHelper: QueryMaker<T>) => (boolean | QueryUnit<QueriedBoolean>)[]): Queryable<T> {
    const result = this._clone();
    const where = queriesFn(new QueryMaker(result._entity)) as any;

    if (this._groupBy.length > 0) {
      result._having.pushRange(where);
    }
    else {
      result._where.pushRange(where);
    }
    return result;
  }

  public between<P>(targetFwd: ((q: QueryMaker<T>) => QueryUnit<P> | P) | QueryUnit<P> | P,
                    rangeFwd: ((q: QueryMaker<T>) => (QueryUnit<P> | P)[] | undefined) | (QueryUnit<P> | P)[] | undefined): Queryable<T> {
    return this.where((q) => [
      q.between(
        typeof targetFwd === "function" ? targetFwd(q) : targetFwd,
        typeof rangeFwd === "function" ? rangeFwd(q) : rangeFwd
      )
    ]);
  }

  public equal<P>(srcFwd: ((q: QueryMaker<T>) => QueryUnit<P> | P) | QueryUnit<P> | P, targetFwd: ((q: QueryMaker<T>) => QueryUnit<P> | P) | QueryUnit<P> | P): Queryable<T> {
    return this.where((q) => [
      q.equal(
        typeof srcFwd === "function" ? srcFwd(q) : srcFwd,
        typeof targetFwd === "function" ? targetFwd(q) : targetFwd
      )
    ]);
  }

  public find(filter: { [P in keyof T]?: (QueryUnit<T[P]> | T[P]) }, nonStrict: boolean = false): Queryable<T> {
    return this.where((q) => {
      const queries: QueryUnit<QueriedBoolean>[] = [];
      for (const key of Object.keys(filter)) {
        if (!nonStrict) {
          queries.push(
            filter[key] === undefined ?
              q.null(new QueryUnit(undefined, this._key2(key))) :
              q.equal(
                new QueryUnit(undefined, this._key2(key)),
                filter[key]
              ) as any
          );
        }
        else {
          queries.push(
            q.or(
              q.null(filter[key]),
              q.equal(
                new QueryUnit(undefined, this._key2(key)),
                filter[key]
              )
            ) as any
          );
        }
      }
      return queries;
    });
  }

  public search(searchText: (string | undefined), fieldsPredicate: (entity: T) => any[]): Queryable<T> {
    if (!searchText) {
      return this;
    }
    const searchWords = searchText.split(" ").filter((item) => item);
    if (searchWords.length < 1) {
      return this;
    }

    return this.where((q) => {
      const fields = fieldsPredicate(q.entity) as QueryUnit<any>[];
      const or: boolean[] = [];
      for (const field of fields) {
        const and: boolean[] = [];
        for (const searchWord of searchWords) {
          and.push(q.includes(field, searchWord));
        }
        or.push(q.and.apply(q, and));
      }
      return [q.or.apply(q, or)];
    });
  }

  public orderBy(...fns: ((entity: T) => [any, OrderByRule])[]): Queryable<T> {
    const result = this._hasCustomSelect ? this._wrap() : this._clone();
    result._orderBy.pushRange(fns
      .map((fn) => {
        const ob = fn(result._entity);
        return {
          queryUnit: ob[0],
          orderBy: ob[1]
        };
      })
    );
    return result;
  }

  public groupBy(fn: (entity: T) => any[]): Queryable<T> {
    const result = this._hasCustomSelect ? this._wrap() : this._clone();
    result._groupBy.pushRange(fn(result._entity));
    return result;
  }

  public groupBySelect<G, S>(groupByFn: (q: QueryMaker<T>) => G, selectorFn: (q: QueryMaker<T>) => S): Queryable<G & S> {
    const result = this._hasCustomSelect ? this._wrap() : this._clone();
    const queryMaker = new QueryMaker(result._entity);
    const groupByObj: any = groupByFn(queryMaker);
    const selectObj: any = selectorFn(queryMaker);

    result._groupBy.pushRange(Object.values(groupByObj));
    result._select = {...groupByObj, ...selectObj};
    result._hasCustomSelect = true;
    return result as any;
  }

  public top(val: number): Queryable<T> {
    const result = this._clone();
    result._top = val;
    return result;
  }

  public distinct(): Queryable<T> {
    const result = this._clone();
    result._distinct = true;
    return result;
  }

  public limit(skip: number, take: number, orderBy: (entity: T) => [any, OrderByRule], ...thenBys: ((entity: T) => [any, OrderByRule])[]): Queryable<T> {
    let result: Queryable<T> = this._hasCustomSelect ? this._wrap() : this._clone();

    const top = take + skip;
    const orderByQueries = [orderBy].concat(thenBys)
      .map((fn) => {
        const item = fn(result._entity);
        const column = item[0] as QueryUnit<any>;
        const rule = item[1];

        return `${column.query} ${rule}`;
      });
    const rowNumberQuery = new QueryUnit(Number, `ROW_NUMBER() OVER (ORDER BY ${orderByQueries.join(", ")})`);

    /*let result = this._clone();*/
    result._top = top;
    result._select["__rownum__"] = rowNumberQuery;
    result = result._wrap();
    delete result._select["__rownum__"];
    result = result.where((q) => [
      q.greaterThen(
        new QueryUnit(
          Number,
          this._key(
            this._as || "TBL",
            "__rownum__"
          )
        ) as any,
        skip)
    ]);
    return result;
  }

  private _joinFn<J, A extends string, R>(queryableOrTableType: Queryable<J> | Type<J>,
                                          as: A,
                                          joinQueryFn: (q: Queryable<J>, entity: T) => Queryable<R>,
                                          inner: boolean,
                                          isMulti: boolean): Queryable<T & { [P in A]: (R[] | R | undefined) }> {
    if (this._hasCustomSelect) {
      return this._wrap()._joinFn(queryableOrTableType, as, joinQueryFn, inner, isMulti);
    }

    const prevItem = this._join.single((item) => item.queryable._as === as);
    const result = prevItem ? this._wrap() : this._clone();

    const newQueryable = queryableOrTableType instanceof Queryable
      ? new Queryable(this.db, queryableOrTableType.tableType, queryableOrTableType, as)
      : new Queryable(this.db, queryableOrTableType, undefined, as);
    const newJoinQueryable = joinQueryFn(newQueryable, result._entity);

    if (prevItem && prevItem.inner === inner && prevItem.queryable.query === newJoinQueryable.query) {
      return result as any;
    }

    result._join.push({
      inner,
      queryable: newJoinQueryable,
      isMulti
    });

    const newSelect = {};
    for (const key of Object.keys(newJoinQueryable._select)) {
      newSelect[`${as}.${key}`] = new QueryUnit(
        newJoinQueryable._select[key].type === QueriedBoolean
          ? Boolean
          : newJoinQueryable._select[key].type,
        this._key(as, key)
      );
    }
    result._select = {
      ...result._select,
      ...newSelect
    };
    return result as any;
  }

  public join<J, A extends string, R>(queryableOrTableType: Queryable<J> | Type<J>,
                                      as: A,
                                      joinQueryFn: (q: Queryable<J>, entity: T) => Queryable<R>,
                                      inner: boolean = false): Queryable<T & { [P in A]: (R | undefined) }> {
    return this._joinFn(queryableOrTableType, as, joinQueryFn, inner, false) as any;
  }

  public joinMulti<J, A extends string, R>(queryableOrTableType: Queryable<J> | Type<J>,
                                           as: A,
                                           joinQueryFn: (q: Queryable<J>, entity: T) => Queryable<R>,
                                           inner: boolean = false): Queryable<T & { [P in A]: R[] | undefined }> {
    return this._joinFn(queryableOrTableType, as, joinQueryFn, inner, true) as any;
  }

  public include<J>(targetFn: ((entity: T) => (J | J[] | undefined)) | string,
                    additionalQueryFn?: (qr: Queryable<J>, en: T) => Queryable<J>,
                    inner: boolean = false): Queryable<T> {
    let targetTableChainedName: string;
    if (typeof targetFn === "function") {
      const parsed = LambdaParser.parse(targetFn);
      const itemParamName = parsed.params[0];
      targetTableChainedName = parsed.returnContent
        .replace(new RegExp(`${itemParamName}\\.`), "")
        .replace(/\[0]/g, "")
        .trim();
    }
    else {
      targetTableChainedName = targetFn;
    }

    const fkOrFktDef = this._getChainedForeignKeyDef(targetTableChainedName);

    const filter: any = {};
    let joinTableType: Type<any>;
    let isMulti: boolean;

    //-- FK
    if (fkOrFktDef["columnNames"]) {
      const fkDef = fkOrFktDef as IForeignKeyDefinition;
      const targetTableType = fkDef.targetTableTypeForwarder();

      const targetTableDef: ITableDefinition = Reflect.getMetadata(tableMetadataSymbol, targetTableType);
      if (targetTableDef.primaryKeyColumns.length !== fkDef.columnNames.length) {
        throw new Exception(`기준테이블의 @ForeignKey 와 목표테이블의 @PrimaryKey 의 길이가 다릅니다.`);
      }

      for (let i = 0; i < targetTableDef.primaryKeyColumns.length; i++) {
        const srcColumnName = fkDef.columnNames[i];
        const targetPkColumnName = targetTableDef.primaryKeyColumns[i].name;
        filter[targetPkColumnName] = this._getEntryByChain(targetTableChainedName.split(".").slice(0, -1).concat([srcColumnName]));
      }

      joinTableType = targetTableType;
      isMulti = false;
    }

    //-- FKT
    else {
      const fktDef = fkOrFktDef as IForeignKeyTargetDefinition;
      const sourceTableType = fktDef.sourceTableTypeForwarder();
      const sourceTableDef: ITableDefinition = Reflect.getMetadata(tableMetadataSymbol, sourceTableType);
      const targetFkDef = sourceTableDef.foreignKeys.single((item) => item.name === fktDef.sourceForeignKeyName)!;
      const targetTableType = targetFkDef.targetTableTypeForwarder();

      const targetTableDef: ITableDefinition = Reflect.getMetadata(tableMetadataSymbol, targetTableType);
      for (let i = 0; i < targetTableDef.primaryKeyColumns.length; i++) {
        const srcColumnName = targetFkDef.columnNames[i];
        const targetPkColumnName = targetTableDef.primaryKeyColumns[i].name;
        filter[srcColumnName] = this._getEntryByChain(targetTableChainedName.split(".").slice(0, -1).concat([targetPkColumnName]));
      }

      joinTableType = sourceTableType;
      isMulti = true;
    }

    return this._joinFn(
      joinTableType,
      targetTableChainedName,
      (qr, en) => {
        let result = qr.find(filter);
        if (additionalQueryFn) {
          result = additionalQueryFn(result, en);
        }
        return result as any;
      },
      inner,
      isMulti);
  }

  public async resultAsync(): Promise<T[]> {
    const query = this.query;
    const result = await this.db.execute<T>(query);
    return this._parseResult(result.recordset);
  }

  public async singleAsync(): Promise<T> {
    const query = this.query;
    const result = await this.db.execute<T>(query);
    const parsedResult = this._parseResult(result.recordset);
    if (parsedResult.length > 1) {
      throw new Exception("여러개의 쿼리결과가 존재합니다.");
    }
    if (parsedResult.length < 1) {
      throw new Exception("쿼리결과가 없습니다.");
    }
    return parsedResult[0];
  }

  public async singleOrAsync<R>(replacement: R): Promise<T | R> {
    const query = this.query;
    const result = await this.db.execute<T>(query);
    const parsedResult = this._parseResult(result.recordset);
    if (parsedResult.length > 1) {
      throw new Exception("여러개의 쿼리결과가 존재합니다.");
    }
    if (parsedResult.length < 1) {
      return replacement;
    }
    return parsedResult[0];
  }

  public async countAsync(fieldSelector?: (en: T) => any): Promise<number> {
    const result = await this
      .select((q) => ({
        cnt: fieldSelector ? q.count(fieldSelector(q.entity)) : q.count()
      }))
      .resultAsync();
    return result.sum((item) => item.cnt)!;
  }

  public async existsAsync(): Promise<boolean> {
    const cnt = await this.countAsync();
    return cnt > 0;
  }

  private _key(...keys: string[]): string {
    return QueryHelper.escapeKey.apply(this, keys);
  }

  private _key2(...keys: string[]): string {
    if (this._select[keys.join(".")]) {
      return this._select[keys.join(".")].query;
    }
    else {
      return this._key.apply(this, [this._as].concat(keys));
    }
  }

  private _value(value: any): string {
    if (value instanceof QueryUnit) {
      return value.query;
    }
    else {
      return QueryHelper.escape(value);
    }
  }

  private _isMultiJoin(as: string): boolean {
    try {
      const def = this._getChainedForeignKeyDef(as);
      return !def["columnNames"];
    }
    catch (err) {
      return this._getJoinDef(as).isMulti;
      /*const join = this._join.singleOr(undefined, item => item.queryable._as === as);
      if (join) {
          return join.isMulti;
      }
      throw err;*/
    }
  }

  private _getChainedForeignKeyDef(as: string): IForeignKeyDefinition | IForeignKeyTargetDefinition {
    if (!this.tableType) {
      throw new Exception("UNION시에는 사용할 수 없는 기능입니다.");
    }

    let tableDef: ITableDefinition = Reflect.getMetadata(tableMetadataSymbol, this.tableType);
    const asSplit = as.split(".");
    for (let i = 0; i < asSplit.length - 1; i++) {
      const fk1 = tableDef.foreignKeys.single((item) => item.name === asSplit[i]);
      const fkt1 = tableDef.foreignKeyTargets.single((item) => item.name === asSplit[i]);
      const join = this._getJoinDef(asSplit.slice(0, i + 1).join("."));

      //-- FK 인 경우
      if (fk1) {
        const targetTableType = fk1.targetTableTypeForwarder();
        tableDef = Reflect.getMetadata(tableMetadataSymbol, targetTableType);
      }

      //-- FKT 인 경우
      else if (fkt1) {
        const targetTableType = fkt1.sourceTableTypeForwarder();
        tableDef = Reflect.getMetadata(tableMetadataSymbol, targetTableType);
      }

      else if (join) {
        const targetTableType = join.queryable.tableType || Safe.obj(join.queryable._from as Queryable<any>).tableType;
        if (targetTableType) {
          tableDef = Reflect.getMetadata(tableMetadataSymbol, targetTableType);
        }
        else {
          throw new Exception(`JOIN 테이블 정의를 찾을 수 없습니다. [${as}, ${i}]`);
        }
      }

      //-- FK 나 FKT 나 JOIN 없이
      else {
        throw new Exception(`FK, FKT, JOIN 정보를 찾을 수 없습니다. [${as}, ${i}]`);
      }
    }

    const fk = tableDef.foreignKeys.single((item) => item.name === asSplit.last());
    const fkt = tableDef.foreignKeyTargets.single((item) => item.name === asSplit.last());

    const result = fk || fkt;
    if (!result) {
      throw new Exception(`직접 JOIN 쿼리를 이용한 경우, 사용할 수 없는 기능입니다. [${as}]`);
    }
    return result;
  }

  private _getJoinDef(as: string): IJoinDefinition {
    let curr: Queryable<any> = this;
    const joinList: IJoinDefinition[] = [...curr._join];
    while (curr._from instanceof Queryable) {
      curr = curr._from;
      joinList.pushRange(curr._join);
    }

    let joinDef = joinList.last((item) => as === item.queryable._as || as.startsWith(`${item.queryable._as}.`));
    const asSplit = as.split(".");
    for (let i = (joinDef ? joinDef.queryable._as.split(".").length : 0); i < asSplit.length; i++) {
      let curr2: Queryable<any> = joinDef ? joinDef.queryable : this;
      const joinList2: IJoinDefinition[] = [...curr2._join];
      while (curr2._from instanceof Queryable) {
        curr2 = curr2._from;
        joinList2.pushRange(curr2._join);
      }

      joinDef = joinList2.last((item) => asSplit.slice(i).join(".").startsWith(item.queryable._as))!;
      i += joinDef.queryable._as.length - 1;
    }
    return joinDef!;
  }

  /*

      private _convertTypeOfString(value: any): any {
          if (typeof value === "string" && /^.{8}-.{4}-4.{3}-.{4}-.{12}$/.test(value)) {
              return new Uuid(value);
          }
          return value;
      }
  */

  private _parseResult(recordset: { [key: string]: any }[]): T[] {
    let joinNames: string[] = [];
    for (const record of recordset) {
      for (const key of Object.keys(record)) {
        if (typeof this._select[key] === "boolean" || (this._select[key] instanceof QueryUnit && (this._select[key].type === QueriedBoolean || this._select[key].type === Boolean))) {
          record[key] = (record[key] === undefined || record[key] === null) ? undefined : !!record[key];
        }
        else if (this._select[key] instanceof QueryUnit && this._select[key].type === DateOnly && record[key] instanceof Date) {
          record[key] = new DateOnly(record[key].getTime());
        }
        else if (typeof record[key] === "string" && /^.{8}-.{4}-4.{3}-.{4}-.{12}$/.test(record[key])) {
          record[key] = new Uuid(record[key]);
        }
        else if (record[key] === null) {
          record[key] = undefined;
        }
      }

      joinNames.pushRange(
        Object.keys(record)
          .filter((item) => item.includes("."))
          .map((item) => item.split(".").slice(0, -1).join("."))
      );
    }
    joinNames = joinNames.distinct().orderBy((item) => item.split(".").length, true);

    let result = recordset;
    for (const joinName of joinNames) {
      result = result
        .groupBy((item) => {
          const result1 = {...item};
          for (const key of Object.keys(item).filter((item1) => item1.startsWith(`${joinName}.`))) {
            delete result1[key];
          }
          return result1;
        })
        .map((g) => {
          const result1 = g.key;
          result1[joinName] = g.values.map((item) => {
            const mapResult = {};
            for (const key of Object.keys(item).filter((item1) => item1.startsWith(`${joinName}.`))) {
              if (item[key] === undefined) {
                continue;
              }
              mapResult[key.replace(`${joinName}.`, "")] = item[key];
            }
            if (Object.keys(mapResult).length < 1) {
              return undefined;
            }
            return mapResult;
          }).filter((item) => item);
          return result1;
        });

      if (!this._isMultiJoin(joinName)) {
        for (const resultItem of result) {
          resultItem[joinName] = resultItem[joinName][0];
        }
      }
      else {
        for (const resultItem of result) {
          if (resultItem[joinName].length === 0) {
            delete resultItem[joinName];

          }
        }
      }
    }

    return result as any[];
  }

  private _getEntryByChain(chain: string[]): any {
    let curr: any = this._entity;
    for (let i = 0; i < chain.filter((item) => item).length; i++) {
      const chainItem = chain.filter((item) => item)[i];

      curr = curr instanceof Array
        ? curr[0][chainItem]
        : curr[chainItem];

      if (!curr) {
        throw new Exception(`${chain.slice(0, i + 1).join(".")}이 JOIN 되어있지 않습니다.`);
      }
    }
    return curr;
  }

  private _clone(): Queryable<T> {
    const clone = new Queryable(this.db, this.tableType, this._from, this._as);
    clone._top = this._top;
    clone._distinct = this._distinct;
    clone._select = {...this._select};
    clone._hasCustomSelect = this._hasCustomSelect;
    clone._join = [...this._join];
    clone._where = [...this._where];
    clone._groupBy = [...this._groupBy];
    clone._having = [...this._having];
    clone._orderBy = [...this._orderBy];
    return clone;
  }

  private _wrap(): Queryable<T> {
    return new Queryable(this.db, this.tableType, this, this._as);
  }
}