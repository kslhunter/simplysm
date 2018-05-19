import {Type} from "@angular/core";
import {DbConnection} from "./DbConnection";
import {DbQueryUnit} from "./DbQueryUnit";
import {ITableDef, modelDefMetadataKey} from "./decorators";
import {Sorm} from "./Sorm";

export class DbQueryable<TTable> {
  private _queryObj: {
    top: number | undefined;
    select: object;
    join: {
      isMulti: boolean;
      as: string;
      queryable: DbQueryable<any>;
    }[];
    where: string[];
    limit: [number, number] | undefined;
    orderBy: [string, "ASC" | "DEC"][];
  } = {
    top: undefined,
    select: {},
    join: [],
    where: [],
    limit: undefined,
    orderBy: []
  };

  public get query(): string {
    const tableDef: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, this.tableType);

    let q = "SELECT ";

    if (this._queryObj.top !== undefined) {
      q += `TOP ${this._queryObj.top} `;
    }
    q = q.slice(0, -1) + "\r\n";

    q += Object.keys(this._queryObj.select).map(key => `  ${Sorm.query(this._queryObj.select[key])} as [${key}]`).join(",\r\n") + "\r\n";

    q += `FROM ${Sorm.tableKey(tableDef)} as ${Sorm.key("TBL")}\r\n`;

    for (const join of this._queryObj.join) {
      const targetTableDef = core.Reflect.getMetadata(modelDefMetadataKey, join.queryable.tableType);
      q += `LEFT OUTER JOIN ${Sorm.tableKey(targetTableDef)} as [${join.as}] ON ` + join.queryable._queryObj.where.map(item => `(${item})`).join(" AND ") + "\r\n";
    }

    if (this._queryObj.where.length > 0) {
      q += `WHERE ${this._queryObj.where.map(item => `(${item})`).join(" AND ")}\r\n`;
    }

    if (this._queryObj.limit) {
      if (this._queryObj.orderBy.length < 1) {
        if (!tableDef.columns) {
          throw new Error(tableDef.name + "의 컬럼 설정이 잘못되었습니다.");
        }

        q += "ORDER BY " + tableDef.columns.filter(item => item.primaryKey).orderBy(item => item.primaryKey).map(item => Sorm.key("TBL." + item.name) + " ASC").join(", ") + "\r\n";
      }
      q += `OFFSET ${this._queryObj.limit[0]} ROWS FETCH NEXT ${this._queryObj.limit[1]} ROWS ONLY\r\n`;
    }

    return q;
  }

  private get _entity(): TTable {
    const result = {};

    for (const selectKey of Object.keys(this._queryObj.select)) {
      let cursor = result;
      for (const chain  of selectKey.split(".").slice(0, -1)) {
        cursor[chain] = cursor[chain] || {};
        cursor = cursor[chain];
      }

      cursor[selectKey.split(".").last()!] = this._queryObj.select[selectKey];
    }

    return result as TTable;
  }

  public constructor(private readonly _dbConnection: DbConnection,
                     public readonly tableType: Type<TTable>) {
    const tableDef: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, this.tableType);
    if (!tableDef.columns) {
      throw new Error(tableDef.name + "의 컬럼 설정이 잘못되었습니다.");
    }

    for (const colDef of tableDef.columns) {
      this._queryObj.select[colDef.name] = new DbQueryUnit(colDef.typeFwd(), Sorm.key("TBL." + colDef.name));
    }
  }

  public join<A extends string, M, P extends (object | undefined)>(as: A, queryable: DbQueryable<M>): DbQueryable<TTable & { [K in A]: M }> {
    const result = this._clone();
    if (Object.keys(queryable._queryObj).every(key => key === "where" || key === "select" || !queryable._queryObj[key] || Object.keys(queryable._queryObj[key]).length === 0)) {
      result._queryObj.join.push({isMulti: false, as, queryable});

      for (const joinSelectKey of Object.keys(queryable._queryObj.select)) {
        const joinSelect = queryable._queryObj.select[joinSelectKey];
        const joinSelectType = joinSelect instanceof DbQueryUnit ? joinSelect.type : joinSelect.constructor;

        result._queryObj.select[as + "." + joinSelectKey] = new DbQueryUnit<any>(joinSelectType, Sorm.key(Sorm.query(joinSelect).replace(/\[?TBL]?/, as)));
      }

      return result as DbQueryable<TTable & { [K in A]: M }>;
    }
    else {
      throw new Error("미구현");
    }
  }

  public include(fn: (item: TTable) => any): DbQueryable<TTable> {
    const parsed = this._parseLambda(fn);
    const chains = parsed.returnContent.split(".").slice(1);

    const prevTableType = this._getTableTypeByChains(chains.slice(0, -1));
    const targetTableType = this._getTableTypeByChains(chains);

    const prevTableDef: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, prevTableType);
    const targetTableDef: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, targetTableType);

    if (!prevTableDef.foreignKeys) {
      throw new Error(prevTableDef.name + "의 FK 설정이 잘못되었습니다.");
    }

    if (!targetTableDef.columns) {
      throw new Error(targetTableDef.name + "의 컬럼 설정이 잘못되었습니다.");
    }

    const prevTableForeignKeyDef = prevTableDef.foreignKeys.single(item => item.name === chains.last());
    if (!prevTableForeignKeyDef) {
      throw new Error(prevTableDef.name + "의 FK 설정이 잘못되었습니다.");
    }

    const targetTablePrimaryKeyColumnDefs = targetTableDef.columns
      .filter(item => typeof item.primaryKey === "number")
      .orderBy(item => item.primaryKey);

    const wheres: DbQueryUnit<Boolean>[] = [];

    for (let i = 0; i < prevTableForeignKeyDef.columnNames.length; i++) {
      const prevTableFkColumnName = prevTableForeignKeyDef.columnNames[i];
      const targetTablePrimaryKeyColumnName = targetTablePrimaryKeyColumnDefs[i].name;

      wheres.push(new DbQueryUnit(
        Boolean,
        `${Sorm.key([chains.length > 1 ? prevTableDef.name : ""].filter(item => item).concat(chains).concat(targetTablePrimaryKeyColumnName).join("."))} = ${Sorm.key([chains.length > 1 ? prevTableDef.name : "TBL"].concat(chains.slice(0, -1)).concat([prevTableFkColumnName]).join("."))}`
      ));
    }

    return this.join(chains.join("."), new DbQueryable(this._dbConnection, targetTableType).where(() => wheres));
  }

  public where(predicate: (item: TTable) => DbQueryUnit<Boolean>[]): DbQueryable<TTable> {
    const result = this._clone();
    result._queryObj.where = result._queryObj.where.concat(predicate(this._entity).map(item => item.query));
    return result;
  }

  public equal<T>(columnPredicate: (item: TTable) => T, target: T): DbQueryable<TTable> {
    return this.where(item => [Sorm.equal(columnPredicate(item), target)]);
  }

  public search(columnsPredicate: (item: TTable) => string[], searchText: string): DbQueryable<TTable> {
    if (!searchText) {
      return this;
    }
    const searchWords = searchText.split(" ").filter(item => item);
    if (searchWords.length < 1) {
      return this;
    }

    return this.where(item => {
      const columns = columnsPredicate(item);
      const orArr: DbQueryUnit<Boolean>[] = [];
      for (const column of columns) {
        const andArr: DbQueryUnit<Boolean>[] = [];
        for (const searchWord of searchWords) {
          andArr.push(Sorm.includes(column, searchWord));
        }
        orArr.push(Sorm.and(andArr));
      }
      return [Sorm.or(orArr)];
    });
  }

  public top(cnt: number): DbQueryable<TTable> {
    const result = this._clone();
    result._queryObj.top = cnt;
    return result;
  }

  public limit(offset: number, length: number): DbQueryable<TTable> {
    const result = this._clone();
    result._queryObj.limit = [offset, length];
    return result;
  }

  public select<C extends { [key: string]: any }>(cols: (item: TTable) => C): DbQueryable<{[K in keyof C]: C[K] extends DbQueryUnit<any> ? C[K]["_generic"] : C[K]}> {
    const result = this._clone();
    result._queryObj.select = cols(this._entity);
    return result as DbQueryable<any>;
  }

  public async existsAsync(): Promise<boolean> {
    return !!(await this
      .select(() => ({cnt: new DbQueryUnit(Number, "COUNT(*)")}))
      .singleAsync())!.cnt;
  }

  public async countAsync(): Promise<number> {
    return (await this
      .select(() => ({cnt: new DbQueryUnit(Number, "COUNT(*)")}))
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
    return results[0];
  }

  public async insertAsync(item: TTable): Promise<TTable> {
    const tableDef: ITableDef = core.Reflect.getMetadata(modelDefMetadataKey, this.tableType);
    if (!tableDef.columns) {
      throw new Error(tableDef.name + "의 컬럼 설정이 잘못되었습니다.");
    }

    let query = `INSERT INTO ${Sorm.tableKey(tableDef)} (${tableDef.columns.map(colDef => `[${colDef.name}]`).join(", ")})\r\n`;
    query += "OUTPUT INSERTED.*\r\n";
    query += `VALUES (${tableDef.columns.map(colDef => Sorm.query(item[colDef.name])).join(", ")});\r\n`;

    const aiColNames = tableDef.columns.filter(colDef => colDef.autoIncrement).map(colDef => colDef.name);
    if (aiColNames.every(key => Object.keys(item).includes(key))) {
      query = `SET IDENTITY_INSERT ${Sorm.tableKey(tableDef)} ON;\r\n${query}SET IDENTITY_INSERT ${Sorm.tableKey(tableDef)} OFF;\r\n`;
    }

    const results = await this._dbConnection.executeAsync(query);
    return results[0][0];
  }

  public upsertPrepare(itemFwd: (entity: TTable) => TTable, keys: (keyof TTable)[]): void {
    const query = this._getUpsertQuery(itemFwd(this._entity), keys);
    this._dbConnection.prepare(query);
  }

  public async bulkInsertAsync(items: TTable[]): Promise<void> {
    await this._dbConnection.bulkInsertAsync(this.tableType, items);
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
    const itemInsertKeys = itemKeys.filter(key => !(item[key] instanceof DbQueryUnit));

    let query = `MERGE ${Sorm.tableKey(tableDef)}\r\n`;
    query += `USING (SELECT ${keys.map(key => `${Sorm.query(item[key])} as [${key}]`).join(", ")}) as [match]\r\n`;
    query += `ON ${keys.map(key => `${Sorm.tableKey(tableDef)}.[${key}] = [match].${key}`).join(" AND ")}\r\n`;
    query += "WHEN MATCHED THEN\r\n";
    query += `  UPDATE SET\r\n`;
    query += itemUpdateKeys.map(key => `    [${key}] = ${Sorm.query(item[key]).replace(/\[?TBL]?\./, "")}`).join(",\r\n") + "\r\n";
    query += "WHEN NOT MATCHED THEN\r\n";
    query += `  INSERT (${itemInsertKeys.map(key => `[${key}]`).join(", ")})\r\n`;
    query += `  VALUES (${itemInsertKeys.map(key => Sorm.query(item[key]))})\r\n`;
    query += "OUTPUT INSERTED.*;\r\n";

    const aiColNames = tableDef.columns.filter(colDef => colDef.autoIncrement).map(colDef => colDef.name);
    if (aiColNames.every(key => itemInsertKeys.includes(key))) {
      query = `SET IDENTITY_INSERT ${Sorm.tableKey(tableDef)} ON;\r\n${query}SET IDENTITY_INSERT ${Sorm.tableKey(tableDef)} OFF;\r\n`;
    }

    return query;
  }

  private _clone(): DbQueryable<TTable> {
    const result = new DbQueryable<TTable>(this._dbConnection, this.tableType);
    result._queryObj = Object.clone(this._queryObj, ["join"]);
    result._queryObj.join = [...this._queryObj.join];
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

      if (!tableDef.foreignKeys) {
        throw new Error(tableDef.name + "의 FK 설정이 잘못되었습니다.");
      }

      const foreignKeyDef = tableDef.foreignKeys.single(item => item.name === chain);
      if (!foreignKeyDef) {
        throw new Error(tableDef.name + "의 FK 설정이 잘못되었습니다.");
      }

      cursorTableType = foreignKeyDef.targetTypeFwd();
    }

    return cursorTableType;
  }
}