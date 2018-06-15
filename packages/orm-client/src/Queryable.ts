import {Database} from "./Database";
import {QueryUnit} from "./QueryUnit";
import {ITableDef, modelDefMetadataKey} from "./decorators";
import {helpers} from "./helpers";
import {DateOnly, DateTime, Time, Type, Uuid} from "@simplism/core";
import {sorm} from "./sorm";

export type TypeOfGeneric<T extends any> = T extends QueryUnit<Number> ? number
  : T extends QueryUnit<Number | undefined> ? number | undefined
  : T extends QueryUnit<String> ? string
  : T extends QueryUnit<String | undefined> ? string | undefined
  : T extends QueryUnit<Boolean> ? boolean
  : T extends QueryUnit<Boolean | undefined> ? boolean | undefined
  : T extends QueryUnit<QueriedBoolean> ? boolean
  : T extends QueryUnit<QueriedBoolean | undefined> ? boolean | undefined
  : T extends QueryUnit<any> ? T["_generic"]
  : T;

export type TypeOfGenericForObject<C extends { [key: string]: any }> = {
  [K in keyof C]: TypeOfGeneric<C[K]>
};

export class QueriedBoolean extends Boolean {
}

export interface IQueryObj {
  top: number | undefined;
  select: { [key: string]: any };
  join: {
    isMulti: boolean;
    as: string;
    queryable: Queryable<any>;
  }[];
  where: string[];
  having: string[];
  limit: [number, number] | undefined;
  orderBy: [string, "ASC" | "DEC"][];
  groupBy: string[];
  distinct: boolean;
  from: Queryable<any> | undefined;
}

export class Queryable<TTable> {
  private _queryObj: IQueryObj = {
    top: undefined,
    select: {},
    join: [],
    where: [],
    having: [],
    limit: undefined,
    orderBy: [],
    groupBy: [],
    distinct: false,
    from: undefined
  };

  public get query(): string {
    const tableDef: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, this.tableType);

    let q = "SELECT ";

    if (this._queryObj.distinct) {
      q += "DISTINCT ";
    }

    if (this._queryObj.top !== undefined) {
      q += `TOP ${this._queryObj.top} `;
    }
    q = q.slice(0, -1) + "\r\n";

    q += Object.keys(this._queryObj.select).map(key => `  ${helpers.query(this._queryObj.select[key])} as [${key}]`).join(",\r\n") + "\r\n";

    if (this._queryObj.from) {
      q += `FROM (\r\n`;
      q += "  " + this._queryObj.from.query.replace(/\r\n/g, "  \r\n").trim() + "\r\n";
      q += `) as ${helpers.key("TBL")}\r\n`;
    }
    else {
      q += `FROM ${helpers.tableKey(tableDef)} as ${helpers.key("TBL")}\r\n`;
    }

    for (const join of this._queryObj.join) {
      const targetTableDef = core.Reflect.getMetadata(modelDefMetadataKey, join.queryable.tableType);
      q += `LEFT OUTER JOIN ${helpers.tableKey(targetTableDef)} as [${join.as}] ON ` + join.queryable._queryObj.where.map(item => `(${item})`).join(" AND ") + "\r\n";
    }

    if (this._queryObj.where.length > 0) {
      q += `WHERE ${this._queryObj.where.map(item => `(${item})`).join(" AND ")}\r\n`;
    }

    if (this._queryObj.groupBy.length > 0) {
      q += `GROUP BY ${this._queryObj.groupBy.join(", ")}\r\n`;
    }

    if (this._queryObj.having.length > 0) {
      q += `HAVING ${this._queryObj.having.map(item => `(${item})`).join(" AND ")}\r\n`;
    }

    if (this._queryObj.limit) {
      if (this._queryObj.orderBy.length < 1) {
        if (!tableDef.columns) {
          throw new Error(tableDef.name + "의 컬럼 설정이 잘못되었습니다.");
        }

        q += "ORDER BY " + tableDef.columns.filter(item => item.primaryKey).orderBy(item => item.primaryKey).map(item => helpers.key("TBL." + item.name) + " ASC").join(", ") + "\r\n";
      }
      q += `OFFSET ${this._queryObj.limit[0]} ROWS FETCH NEXT ${this._queryObj.limit[1]} ROWS ONLY\r\n`;
    }

    return q;
  }

  private get _entity(): TTable {
    const result = {};

    for (const selectKey of Object.keys(this._queryObj.select)) {
      const cumulatedChain: string[] = [];
      let cursor = result;
      for (const chain  of selectKey.split(".").slice(0, -1)) {
        cumulatedChain.push(chain);
        const joinDef = this._queryObj.join.single(item => item.as === cumulatedChain.join("."))!;
        if (!joinDef) {
          throw new Error("'" + cumulatedChain.join(".") + "'에 대한 'JOIN'이 지정되어있지 않습니다.");
        }

        if (joinDef.isMulti) {
          cursor[chain] = cursor[chain] || [{}];
          cursor = cursor[chain][0];
        }
        else {
          cursor[chain] = cursor[chain] || {};
          cursor = cursor[chain];
        }
      }

      cursor[selectKey.split(".").last()!] = this._queryObj.select[selectKey];
    }

    return result as TTable;
  }

  public constructor(private readonly _dbConnection: Database,
                     public readonly tableType: Type<TTable>) {
    const tableDef: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, this.tableType);
    if (!tableDef.columns) {
      throw new Error(tableDef.name + "의 컬럼 설정이 잘못되었습니다.");
    }

    for (const colDef of tableDef.columns) {
      this._queryObj.select[colDef.name] = new QueryUnit(colDef.typeFwd(), helpers.key("TBL." + colDef.name));
    }
  }

  public join<A extends string, M, P extends (object | undefined)>(as: A, queryable: Queryable<M>, isMulti: boolean): Queryable<TTable & { [K in A]: (M | M[]) }> {
    const result = this._clone();
    if (Object.keys(queryable._queryObj).every(key => key === "where" || key === "select" || !queryable._queryObj[key] || Object.keys(queryable._queryObj[key]).length === 0)) {
      result._queryObj.join.push({isMulti, as, queryable});

      for (const joinSelectKey of Object.keys(queryable._queryObj.select)) {
        const joinSelect = queryable._queryObj.select[joinSelectKey];
        const joinSelectType = joinSelect instanceof QueryUnit ? joinSelect.type : joinSelect.constructor;

        result._queryObj.select[as + "." + joinSelectKey] = new QueryUnit<any>(joinSelectType, helpers.key(helpers.query(joinSelect).replace(/\[?TBL]?/, as)));
      }

      return result as any;
    }
    else {
      throw new Error("미구현");
    }
  }

  public include(fn: (item: TTable) => any): Queryable<TTable> {
    const parsed = this._parseLambda(fn);
    const chains = parsed.returnContent.replace(/\[0]/g, "").split(".").slice(1);

    const prevTableType = this._getTableTypeByChains(chains.slice(0, -1));
    let targetTableType;
    try {
      targetTableType = this._getTableTypeByChains(chains);
    }
    catch (err) {
      throw new Error(`"include"값이 잘못되었습니다: ${this.tableType.name}.${chains.join(".")}`);
    }

    const prevTableDef: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, prevTableType);
    const targetTableDef: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, targetTableType);

    if (!prevTableDef.foreignKeys && !prevTableDef.foreignKeyTargets) {
      throw new Error(prevTableDef.name + "의 FK/FKT 설정이 잘못되었습니다.");
    }

    const prevTableForeignKeyDef = prevTableDef.foreignKeys && prevTableDef.foreignKeys.single(item => item.name === chains.last());
    if (prevTableForeignKeyDef) {
      if (!targetTableDef.columns) {
        throw new Error(targetTableDef.name + "의 컬럼 설정이 잘못되었습니다.");
      }

      const targetTablePrimaryKeyColumnDefs = targetTableDef.columns
        .filter(item => typeof item.primaryKey === "number")
        .orderBy(item => item.primaryKey);

      const wheres: QueryUnit<Boolean | QueriedBoolean>[] = [];

      for (let i = 0; i < prevTableForeignKeyDef.columnNames.length; i++) {
        const prevTableFkColumnName = prevTableForeignKeyDef.columnNames[i];
        const targetTablePrimaryKeyColumnName = targetTablePrimaryKeyColumnDefs[i].name;

        wheres.push(new QueryUnit(
          QueriedBoolean,
          `${helpers.key(chains.concat(targetTablePrimaryKeyColumnName).join("."))} = ${helpers.key([chains.length > 1 ? "" : "TBL"].filter(item => item).concat(chains.slice(0, -1)).concat([prevTableFkColumnName]).join("."))}`
        ));
      }

      return this.join(chains.join("."), new Queryable(this._dbConnection, targetTableType).where(() => wheres), false);
    }

    const prevTableForeignKeyTargetDef = prevTableDef.foreignKeyTargets && prevTableDef.foreignKeyTargets.single(item => item.name === chains.last());
    if (prevTableForeignKeyTargetDef) {
      if (!prevTableDef.columns) {
        throw new Error(prevTableDef.name + "의 컬럼 설정이 잘못되었습니다.");
      }

      const targetTablePrimaryKeyColumnDefs = prevTableDef.columns
        .filter(item => typeof item.primaryKey === "number")
        .orderBy(item => item.primaryKey);

      const sourceTableForeignKeyDefs = targetTableDef.foreignKeys && targetTableDef.foreignKeys.single(item => item.name === prevTableForeignKeyTargetDef.foreignKeyName);
      if (!sourceTableForeignKeyDefs) {
        throw new Error(`${prevTableDef.name}의 ${prevTableForeignKeyTargetDef.name} FKT 설정이 잘못되었습니다.`);
      }

      const wheres: QueryUnit<Boolean | QueriedBoolean>[] = [];

      for (let i = 0; i < sourceTableForeignKeyDefs.columnNames.length; i++) {
        const sourceTableFkColumnName = sourceTableForeignKeyDefs.columnNames[i];
        const targetTablePrimaryKeyColumnName = targetTablePrimaryKeyColumnDefs[i].name;

        wheres.push(new QueryUnit(
          QueriedBoolean,
          `${helpers.key(chains.concat(sourceTableFkColumnName).join("."))} = ${helpers.key([chains.length > 1 ? "" : "TBL"].filter(item => item).concat(chains.slice(0, -1)).concat([targetTablePrimaryKeyColumnName]).join("."))}`
        ));
      }

      return this.join(chains.join("."), new Queryable(this._dbConnection, targetTableType).where(() => wheres), true);
    }

    throw new Error(prevTableDef.name + "의 FK/FKT 설정이 잘못되었습니다.");
  }

  public groupBy(keys: ((item: TTable) => any[]) | (string[])): Queryable<TTable> {
    const result = this._clone();
    if (typeof keys === "function") {
      result._queryObj.groupBy = keys(this._entity).map(item => helpers.query(item));
    }
    else {
      result._queryObj.groupBy = keys;
    }
    return result;
  }

  public where(predicate: (item: TTable) => QueryUnit<Boolean | QueriedBoolean>[]): Queryable<TTable> {
    const result = this._clone();
    result._queryObj.where = result._queryObj.where.concat(predicate(this._entity).map(item => item.query));
    return result;
  }

  public having(predicate: (item: TTable) => QueryUnit<Boolean | QueriedBoolean>[]): Queryable<TTable> {
    const result = this._clone();
    result._queryObj.having = result._queryObj.having.concat(predicate(this._entity).map(item => item.query));
    return result;
  }

  public equal<T>(columnPredicate: (item: TTable) => T, target: T): Queryable<TTable> {
    return this.where(item => [sorm.equal(columnPredicate(item), target)]);
  }

  public search(columnsPredicate: (item: TTable) => (string | QueryUnit<String>)[], searchText: string): Queryable<TTable> {
    if (!searchText) {
      return this;
    }
    const searchWords = searchText.split(" ").filter(item => item);
    if (searchWords.length < 1) {
      return this;
    }

    return this.where(item => {
      const columns = columnsPredicate(item);
      const orArr: QueryUnit<Boolean | QueriedBoolean>[] = [];
      for (const column of columns) {
        const orArr1: QueryUnit<Boolean | QueriedBoolean>[] = [];
        for (const searchWord of searchWords) {
          orArr1.push(sorm.includes(column, searchWord));
        }
        orArr.push(sorm.or(orArr1));
      }
      return [sorm.or(orArr)];
    });
  }

  public top(cnt: number): Queryable<TTable> {
    const result = this._clone();
    result._queryObj.top = cnt;
    return result;
  }

  public limit(offset: number, length: number): Queryable<TTable> {
    const result = this._clone();
    result._queryObj.limit = [offset, length];
    return result;
  }

  public distinct(): Queryable<TTable> {
    const result = this._clone();
    result._queryObj.distinct = true;
    return result;
  }

  public select<C extends { [key: string]: any }>(cols: (item: TTable) => C): Queryable<TypeOfGenericForObject<C>> {
    let result = this._clone();

    result._queryObj.select = {};
    const makeSelect = (prevKeys: string[], obj: any) => {
      for (const key of Object.keys(obj)) {
        if (obj[key] instanceof QueryUnit && obj[key].type === QueriedBoolean) {
          result._queryObj.select[prevKeys.concat([key]).join(".")] = sorm.cast(sorm.case(obj[key], true).else(false), Boolean);
        }
        else if (
          obj[key] instanceof QueryUnit ||
          obj[key] instanceof DateTime ||
          obj[key] instanceof DateOnly ||
          obj[key] instanceof Time ||
          obj[key] instanceof Uuid ||
          obj[key] instanceof Date ||
          typeof obj[key] === "number" ||
          typeof obj[key] === "string" ||
          typeof obj[key] === "boolean" ||
          obj[key] == undefined
        ) {
          result._queryObj.select[prevKeys.concat([key]).join(".")] = obj[key];
        }
        else if (obj[key] instanceof Array) {
          makeSelect(prevKeys.concat([key]), obj[key][0]);
        }
        else {
          makeSelect(prevKeys.concat([key]), obj[key]);
        }
      }
    };

    makeSelect([], cols(this._entity));

    if (this._queryObj.groupBy.length < 1) {
      const groupedKeys: string[] = [];
      Object.keys(result._queryObj.select).filter(key => {
        const item = result._queryObj.select[key];
        if (item instanceof QueryUnit && (item.query.includes("SUM") || item.query.includes("MAX") || item.query.includes("MIN") || item.query.includes("COUNT"))) {
          groupedKeys.push(key);
        }
      });

      if (groupedKeys.length > 0) {
        const nonGroupedKeys = Object.keys(result._queryObj.select).filter(key => !groupedKeys.includes(key));
        result = result.groupBy(nonGroupedKeys.map(key => result._queryObj.select[key] && helpers.query(result._queryObj.select[key])).filterExists());
      }
    }

    return result as Queryable<any>;
  }

  public async existsAsync(): Promise<boolean> {
    return !!(await this
      .select(() => ({cnt: new QueryUnit(Number, "COUNT(*)")}))
      .singleAsync())!.cnt;
  }

  public async countAsync(): Promise<number> {
    return (await this
      .select(() => ({cnt: new QueryUnit<number>(Number as any, "COUNT(*)")}))
      .wrap()
      .select(item => ({cnt: sorm.ifNull(sorm.sum(item.cnt), 0)}))
      .singleAsync())!.cnt as number;
  }

  public async singleAsync(): Promise<TTable | undefined> {
    const result = await this.top(2).resultAsync();
    if (result.length > 1) {
      throw new Error("복수의 결과가 있습니다.");
    }
    return result[0];
  }

  public async resultAsync(): Promise<TTable[]> {
    const results = await this._dbConnection.executeAsync(this.query);
    return this._generateResult(results[0]);
  }

  public async insertAsync(item: TTable): Promise<TTable> {
    const query = this._getInsertQuery(item);
    const results = await this._dbConnection.executeAsync(query);
    return this._generateResult(results[0])[0];
  }

  public insertPrepare(item: TTable): void {
    const query = this._getInsertQuery(item);
    this._dbConnection.prepare(query, query.includes("SET IDENTITY_INSERT") ? [false, true, false] : [true]);
  }

  public async insertRangeAsync(items: TTable[]): Promise<TTable[]> {
    const query = items.map(item => this._getInsertQuery(item)).join("\r\n\r\n");
    const results = await this._dbConnection.executeAsync(query);
    return results.mapMany(item => item[0]).filterExists() as any[];
  }

  public insertRangePrepare(items: TTable[]): void {
    const queries = items.map(item => this._getInsertQuery(item));
    const query = queries.join("\r\n\r\n");
    const resultIndexes = queries.mapMany(item => item.includes("SET IDENTITY_INSERT") ? [false, true, false] : [true]);
    this._dbConnection.prepare(query, resultIndexes);
  }

  public async updateAsync(itemFwd: (entity: TTable) => Partial<TTable>): Promise<TTable> {
    const query = this._getUpdateQuery(itemFwd(this._entity));
    const result = await this._dbConnection.executeAsync(query);
    return result[0][0];
  }

  public async upsertAsync(itemFwd: (entity: TTable) => TTable, keys: (keyof TTable)[]): Promise<TTable> {
    const query = this._getUpsertQuery(itemFwd(this._entity), keys);
    const result = await this._dbConnection.executeAsync(query);
    return result[query.includes("SET IDENTITY_INSERT") ? 1 : 0][0];
  }

  public upsertPrepare(itemOrFwd: (entity: TTable) => TTable, keys: (keyof TTable)[]): void {
    const query = this._getUpsertQuery(itemOrFwd(this._entity), keys);
    this._dbConnection.prepare(query, query.includes("SET IDENTITY_INSERT") ? [false, true, false] : [true]);
  }

  public deletePrepare(): void {
    const query = this._getDeleteQuery();
    this._dbConnection.prepare(query, [true]);
  }

  public async deleteAsync(): Promise<void> {
    const query = this._getDeleteQuery();
    await this._dbConnection.executeAsync(query);
  }

  public async bulkInsertAsync(items: TTable[]): Promise<void> {
    await this._dbConnection.bulkInsertAsync(this.tableType, items);
  }

  private _getInsertQuery(item: TTable): string {
    const tableDef: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, this.tableType);
    if (!tableDef.columns) {
      throw new Error(tableDef.name + "의 컬럼 설정이 잘못되었습니다.");
    }

    const itemColNames = tableDef.columns
      .map(colDef => colDef.name)
      .filter(key => item[key] !== undefined);

    let query = `INSERT INTO ${helpers.tableKey(tableDef)} (${itemColNames.map(colName => `[${colName}]`).join(", ")})\r\n`;
    query += "OUTPUT INSERTED.*\r\n";
    query += `VALUES (${itemColNames.map(colName => helpers.query(item[colName])).join(", ")});\r\n`;

    const aiColNames = tableDef.columns.filter(colDef => colDef.autoIncrement).map(colDef => colDef.name);
    if (aiColNames.every(key => itemColNames.includes(key))) {
      query = `SET IDENTITY_INSERT ${helpers.tableKey(tableDef)} ON;\r\n${query}SET IDENTITY_INSERT ${helpers.tableKey(tableDef)} OFF;\r\n`;
    }
    return query;
  }

  private _getUpdateQuery(item: Partial<TTable>): string {
    const tableDef: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, this.tableType);
    if (!tableDef.columns) {
      throw new Error(tableDef.name + "의 컬럼 설정이 잘못되었습니다.");
    }

    let query = `  UPDATE [TBL] SET\r\n`;
    query += Object.keys(item).map(key => `    [${key}] = ${helpers.query(item[key])}`).join(",\r\n") + "\r\n";
    query += `FROM (\r\n`;
    query += `\t${this.query.replace(/\r\n/g, "\r\n\t")}\r\n`;
    query += ") [TBL]";
    return query;
  }

  private _getUpsertQuery(item: TTable, keys: (keyof TTable)[]): string {
    const tableDef: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, this.tableType);
    if (!tableDef.columns) {
      throw new Error(tableDef.name + "의 컬럼 설정이 잘못되었습니다.");
    }

    const itemKeys = tableDef.columns
      .map(colDef => colDef.name)
      .filter(key => item[key] !== undefined);

    const pkColNames = tableDef.columns.filter(colDef => colDef.primaryKey).map(colDef => colDef.name);
    const itemUpdateKeys = itemKeys.filter(key => !pkColNames.includes(key));
    const itemInsertKeys = itemKeys.filter(key => !(item[key] instanceof QueryUnit));

    let query = `MERGE ${helpers.tableKey(tableDef)}\r\n`;
    query += `USING (SELECT ${keys.map(key => `${helpers.query(item[key])} as [${key}]`).join(", ")}) as [match]\r\n`;
    query += `ON ${keys.map(key => `${helpers.tableKey(tableDef)}.[${key}] = [match].${key}`).join(" AND ")}\r\n`;
    query += "WHEN MATCHED THEN\r\n";
    query += `  UPDATE SET\r\n`;
    query += itemUpdateKeys.map(key => `    [${key}] = ${helpers.query(item[key]).replace(/\[?TBL]?\./, "")}`).join(",\r\n") + "\r\n";
    query += "WHEN NOT MATCHED THEN\r\n";
    query += `  INSERT (${itemInsertKeys.map(key => `[${key}]`).join(", ")})\r\n`;
    query += `  VALUES (${itemInsertKeys.map(key => helpers.query(item[key]))})\r\n`;
    query += "OUTPUT INSERTED.*;\r\n";

    const aiColNames = tableDef.columns.filter(colDef => colDef.autoIncrement).map(colDef => colDef.name);
    if (aiColNames.every(key => itemInsertKeys.includes(key))) {
      query = `SET IDENTITY_INSERT ${helpers.tableKey(tableDef)} ON;\r\n${query}SET IDENTITY_INSERT ${helpers.tableKey(tableDef)} OFF;\r\n`;
    }

    return query;
  }

  private _getDeleteQuery(): string {
    const tableDef: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, this.tableType);
    if (!tableDef.columns) {
      throw new Error(tableDef.name + "의 컬럼 설정이 잘못되었습니다.");
    }

    const pkNames = tableDef.columns.filter(item => item.primaryKey !== undefined).map(item => item.name);
    const pksQueryUnit = sorm.concat(pkNames.map(pkName => new QueryUnit(String, `[${pkName}]`)));

    const selectQuery = this
      .select(() => ({
        pks: pksQueryUnit
      }))
      .query;

    let query = `DELETE FROM ${helpers.tableKey(tableDef)} WHERE ${helpers.query(pksQueryUnit)} IN (\r\n`;
    query += `\t${selectQuery.replace(/\r\n/g, "\r\n\t")}\r\n`;
    query += ")";
    return query;
  }

  private _generateResult(arr: any[] | undefined): any[] {
    if (!arr) return [];

    const joinDefs = Object.keys(this._queryObj.select)
      .orderBy(key => key.split(".").length, true)
      .map(key => key.split(".").slice(0, -1).join("."))
      .filter(key => key)
      .distinct()
      .filterExists()
      .map(key => {
        const joinDef = this._queryObj.join.single(item => item.as === key);
        return {
          as: joinDef!.as,
          isMulti: joinDef!.isMulti
        };
      });

    let result: any[] = arr;

    for (const item of result) {
      for (const key of Object.keys(item)) {
        const dataType = this._queryObj.select[key] instanceof QueryUnit ? this._queryObj.select[key].type : undefined;
        if (dataType === DateTime) {
          item[key] = DateTime.parse(item[key]);
        }
        else if (dataType === DateOnly) {
          item[key] = DateOnly.parse(item[key]);
        }
        else if (dataType === Time) {
          item[key] = Time.parse(item[key]);
        }
      }
    }

    for (const joinDef of joinDefs) {
      const grouped: { key: any; values: any[] }[] = [];
      for (const item of result) {
        const keys = Object.keys(item)
          .filter(key => !key.startsWith(joinDef.as + "."));

        const valueKeys = Object.keys(item)
          .filter(valueKey => valueKey.startsWith(joinDef.as + "."))
          .distinct();

        const keyObj = {};
        for (const key of keys) {
          keyObj[key] = item[key];
        }

        const valueObj = {};
        for (const valueKey of valueKeys) {
          valueObj[valueKey.slice(joinDef.as.length + 1)] = item[valueKey];
        }

        const exists = grouped.single(g => Object.equal(g.key, keyObj));
        if (exists) {
          exists.values.push(valueObj);
        }
        else {
          grouped.push({
            key: keyObj,
            values: [valueObj]
          });
        }
      }

      result = grouped.map(item => ({
        ...item.key,
        [joinDef.as]: item.values
      }));

      if (!joinDef.isMulti) {
        result = result.map(item => ({
          ...item,
          [joinDef.as]: item[joinDef.as][0]
        }));
      }
    }

    const clearEmpty = (item: any) => {
      if (item instanceof DateTime || item instanceof DateOnly || item instanceof Time) {
        return item;
      }
      if (item instanceof Array) {
        for (let i = 0; i < item.length; i++) {
          item[i] = clearEmpty(item[i]);
        }

        if (item.every(itemItem => itemItem === undefined)) {
          return undefined;
        }
      }
      else if (item instanceof Object) {
        for (const key of Object.keys(item)) {
          item[key] = clearEmpty(item[key]);
        }

        if (Object.keys(item).every(key => item[key] === undefined)) {
          return undefined;
        }
      }

      return item;
    };

    return clearEmpty(result) || [];
  }

  private _clone(): Queryable<TTable> {
    const result = new Queryable<TTable>(this._dbConnection, this.tableType);
    result._queryObj = Object.clone(this._queryObj, {excludeProps: ["join", "from"]});
    result._queryObj.join = [...this._queryObj.join];
    result._queryObj.from = this._queryObj.from;
    return result;
  }

  private wrap(): Queryable<TTable> {
    const result = new Queryable<TTable>(this._dbConnection, this.tableType);
    result._queryObj.from = this._clone();

    const newSelect = {};
    for (const key of Object.keys(this._queryObj.select)) {
      newSelect[key] = new QueryUnit(this._queryObj.select[key].type || this._queryObj.select[key].constructor, `[TBL].[${key}]`);
      result._queryObj.select = newSelect;
    }
    return result;
  }

  private _parseLambda(predicate: (...args: any[]) => any): { params: string[]; returnContent: string } {
    const matches = predicate.toString().match(/function\s?\(([^)]*)\)[^{]*{((?!return)(.|\r|\n))*return\s?((.|\r|\n)*);?\s?}$/);
    if (!matches) {
      throw new Error("Lambda 파싱 실패: " + predicate.toString() + "\n");
    }

    const params = matches[1].split(",").map(item => item.trim());
    let returnContent = matches[4].trim();
    if (returnContent.endsWith(";")) {
      returnContent = returnContent.slice(0, -1);
    }

    return {
      params,
      returnContent
    };
  }

  private _getTableTypeByChains(chains: string[]): Type<any> {
    let cursorTableType = this.tableType;

    for (const chain of chains) {
      const tableDef: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, cursorTableType);

      if (!tableDef.foreignKeys && !tableDef.foreignKeyTargets) {
        throw new Error(tableDef.name + "의 FK 설정이 잘못되었습니다.");
      }

      const foreignKeyDef = tableDef.foreignKeys && tableDef.foreignKeys.single(item => item.name === chain);
      if (foreignKeyDef) {
        cursorTableType = foreignKeyDef.targetTypeFwd();
        continue;
      }

      const foreignKeyTargetDef = tableDef.foreignKeyTargets && tableDef.foreignKeyTargets.single(item => item.name === chain);
      if (foreignKeyTargetDef) {
        cursorTableType = foreignKeyTargetDef.sourceTypeFwd();
        continue;
      }

      throw new Error(tableDef.name + "의 FK 설정이 잘못되었습니다.");
    }

    return cursorTableType;
  }
}