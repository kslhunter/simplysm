import {ITableDef, QueryBuilderAdv, QueryType, QueryUnit, tableDefMetadataKey} from "@simplism/orm-query";
import {Type} from "@simplism/core";
import {DbContext} from "./DbContext";

export class Queryable<T extends object> {
  private readonly _db: DbContext;
  private _qba: QueryBuilderAdv<T>;

  public readonly tableType?: Type<T>;
  public readonly subQueryable?: Queryable<T>;
  public readonly subQueryables?: Queryable<T>[];

  public constructor(db: DbContext, tableType: Type<T>);
  public constructor(db: DbContext, subQueryable: Queryable<T>, tableType?: Type<T>);
  public constructor(db: DbContext, subQueryables: Queryable<T>[], tableType?: Type<T>);
  public constructor(db: DbContext, arg: Type<T> | Queryable<T> | (Queryable<T>[]), tableType?: Type<T>);
  public constructor(db: DbContext, arg: Type<T> | Queryable<T> | (Queryable<T>[]), tableType?: Type<T>) {
    this._db = db;

    if (arg instanceof Function) {
      this._qba = new QueryBuilderAdv(arg, this._db.config.database);
      this.tableType = arg;
    }
    else if (arg instanceof Queryable) {
      this._qba = new QueryBuilderAdv(arg._qba, this._db.config.database, undefined, tableType);
      this.subQueryable = arg;
      this.tableType = tableType;
    }
    else {
      this._qba = new QueryBuilderAdv(arg.map(item => item._qba), this._db.config.database, undefined, tableType);
      this.subQueryables = arg;
      this.tableType = tableType;
    }
  }

  public select<R extends object>(fwd: (entity: T) => R): Queryable<R> {
    const result = this._clone() as Queryable<any>;
    result._qba = this._qba.select(fwd);
    return result;
  }

  public where(predicate: (entity: T) => boolean[]): Queryable<T> {
    const result = this._clone();
    result._qba = this._qba.where(predicate);
    return result;
  }

  public distinct(): Queryable<T> {
    const result = this._clone();
    result._qba = this._qba.distinct();
    return result;
  }

  public top(cnt: number): Queryable<T> {
    const result = this._clone();
    result._qba = this._qba.top(cnt);
    return result;
  }

  public orderBy(fwd: (entity: T) => QueryType, desc?: boolean): Queryable<T> {
    const result = this._clone();
    result._qba = this._qba.orderBy(fwd, desc);
    return result;
  }

  public limit(skip: number, take: number): Queryable<T> {
    const result = this._clone();
    result._qba = this._qba.limit(skip, take);
    return result;
  }

  public groupBy(fwd: (entity: T) => QueryType[]): Queryable<T> {
    const result = this._clone();
    result._qba = this._qba.groupBy(fwd);
    return result;
  }

  public having(predicate: (entity: T) => boolean[]): Queryable<T> {
    const result = this._clone();
    result._qba = this._qba.having(predicate);
    return result;
  }

  public join<A extends string, J, R, S extends boolean>(joinType: Type<J>, as: A, fwd: (qb: QueryBuilderAdv<J>, entity: T) => QueryBuilderAdv<R>, isSingle?: S): Queryable<T & { [K in A]?: (S extends true ? R : R[]) }> {
    const result = this._clone() as Queryable<any>;
    result._qba = this._qba.join(joinType, as, fwd, isSingle);
    return result;
  }

  public include<A extends string, J>(targetFwd: (entity: NonNullable<T>) => (J | J[] | undefined)): Queryable<T>;
  public include<A extends string, J, S extends boolean>(targetFwd: (entity: NonNullable<T>) => (J | J[] | undefined), as?: A, fwd?: (qr: QueryBuilderAdv<J>, entity: T) => QueryBuilderAdv<J>, isSingle?: S): Queryable<T & { [K in A]?: (S extends true ? J : J[]) }>;
  public include<A extends string, J, S extends boolean>(targetFwd: (entity: NonNullable<T>) => (J | J[] | undefined), as?: A, fwd?: (qr: QueryBuilderAdv<J>, entity: T) => QueryBuilderAdv<J>, isSingle?: S): Queryable<T & { [K in A]?: (S extends true ? J : J[]) }> {
    const result = this._clone();
    result._qba = this._qba.include(targetFwd, as, fwd, isSingle);
    return result;
  }

  public async insertAsync(obj: T): Promise<T> {
    if (this._hasAutoIncrementValue(obj)) {
      const query = `${this._getIdentityInsertQuery(true)}\n${this._qba.insert(obj).query}\n${this._getIdentityInsertQuery(false)}`;
      const result = await this._db.executeAsync(query);
      return result[1][0];
    }
    else {
      const query = this._qba.insert(obj).query;
      const result = await this._db.executeAsync(query);
      return result[0][0];
    }
  }

  public async insertRangeAsync(arr: T[]): Promise<T[]> {
    const preparedQuery = this._db.preparedQuery;
    this._db.preparedQuery = "";
    for (const obj of arr) {
      if (this._hasAutoIncrementValue(obj)) {
        const query = `${this._getIdentityInsertQuery(true)}\n${this._qba.insert(obj).query}\n${this._getIdentityInsertQuery(false)}`;
        this._db.prepare(query, [false, true, false]);
      }
      else {
        const query = this._qba.insert(obj).query;
        this._db.prepare(query, [true]);
      }
    }

    const result = await this._db.executePreparedAsync();

    this._db.preparedQuery = preparedQuery;

    return result.map(item => item[0]);
  }

  public insertPrepare(obj: T): void {
    if (this._hasAutoIncrementValue(obj)) {
      const query = `${this._getIdentityInsertQuery(true)}\n${this._qba.insert(obj).query}\n${this._getIdentityInsertQuery(false)}`;
      this._db.prepare(query, [false, true, false]);
    }
    else {
      const query = this._qba.insert(obj).query;
      this._db.prepare(query, [true]);
    }
  }

  public insertRangePrepare(arr: T[]): void {
    for (const obj of arr) {
      this.insertPrepare(obj);
    }
  }

  public async updateAsync(fwd: (entity: T) => Partial<T>): Promise<T> {
    const query = this._qba.update(fwd).query;
    const result = await this._db.executeAsync(query);
    return result[0][0];
  }

  public updatePrepare(fwd: (entity: T) => Partial<T>): void {
    const query = this._qba.update(fwd).query;
    this._db.prepare(query, [true]);
  }

  public async upsertAsync(fwd: (item: T) => Partial<T>, additionalInsertObj: Partial<T>): Promise<T>;
  public async upsertAsync(obj: Partial<T>, additionalInsertObj: Partial<T>): Promise<T>;
  public async upsertAsync(fwd: (item: T) => T): Promise<T>;
  public async upsertAsync(obj: T): Promise<T>;
  public async upsertAsync(arg: (T | Partial<T>) | ((item: T) => (T | Partial<T>)), additionalInsertObj?: Partial<T>): Promise<T>;
  public async upsertAsync(arg: (T | Partial<T>) | ((item: T) => (T | Partial<T>)), additionalInsertObj?: Partial<T>): Promise<T> {
    const obj: object = typeof arg === "function" ? (arg as any)(this._qba.entity) : arg;

    if (this._hasAutoIncrementValue({...obj, ...(additionalInsertObj as object)})) {
      const query = `${this._getIdentityInsertQuery(true)}\n${this._qba.upsert(arg, additionalInsertObj).query}\n${this._getIdentityInsertQuery(false)}`;
      const result = await this._db.executeAsync(query);
      return result[1][0];
    }
    else {
      const query = this._qba.upsert(arg, additionalInsertObj).query;
      const result = await this._db.executeAsync(query);
      return result[0][0];
    }
  }

  public upsertPrepare(fwd: (item: T) => Partial<T>, additionalInsertObj?: Partial<T>): void;
  public upsertPrepare(obj: Partial<T>, additionalInsertObj?: Partial<T>): void;
  public upsertPrepare(fwd: (item: T) => T): void;
  public upsertPrepare(obj: T): void;
  public upsertPrepare(arg: (T | Partial<T>) | ((item: T) => (T | Partial<T>)), additionalInsertObj?: Partial<T>): void;
  public upsertPrepare(arg: (T | Partial<T>) | ((item: T) => (T | Partial<T>)), additionalInsertObj?: Partial<T>): void {
    const query = this._qba.upsert(arg, additionalInsertObj).query;
    this._db.prepare(query, [true]);
  }

  public async deleteAsync(): Promise<T> {
    const query = this._qba.delete().query;
    const result = await this._db.executeAsync(query);
    return result[0][0];
  }

  public async resultAsync(): Promise<T[]> {
    const query = this._qba.query;

    const colDefs = Object.keys(this._qba.selectObj)
      .map(key => {
        const colUnit = this._qba.selectObj[key];
        return {
          name: key,
          dataType: colUnit instanceof QueryUnit
            ? colUnit.type.name
            : colUnit === undefined
              ? undefined
              : colUnit.constructor.name
        };
      });

    const joinDefs = Object.keys(this._qba.selectObj)
      .orderBy(key => key.split(".").length, true)
      .map(key => key.split(".").slice(0, -1).join("."))
      .filterExists()
      .distinct()
      .map(key => {
        const joinDef = this._qba.getAllJoinDef()[key];
        const isSingle = joinDef ? joinDef.isSingle : this._qba.singleSelectAsNames.includes(key);
        return {
          as: key,
          isSingle
        };
      });

    return await this._db.executeAsync(query, colDefs, joinDefs);
  }

  public async singleAsync(): Promise<T | undefined> {
    const result = await this.resultAsync();
    if (result.length > 1) {
      throw new Error("복수의 쿼리결과가 있습니다:\n" + this._qba.query);
    }

    return result[0];
  }

  public async countAsync(): Promise<number> {
    const item = await this
      .select(() => ({cnt: new QueryUnit(Number, "COUNT(*)")}))
      .singleAsync();

    return ((item && item.cnt) || 0) as any;
  }

  public wrap(): Queryable<T>;
  public wrap<W extends object>(tableType: Type<W>): Queryable<W>;
  public wrap(tableType?: Type<any>): Queryable<any> {
    return new Queryable(this._db, this, tableType);
  }

  private _clone(): Queryable<T> {
    return new Queryable(this._db, (this.tableType || this.subQueryable || this.subQueryables)!);
  }

  private _hasAutoIncrementValue(obj: object): boolean {
    if (!this.tableType) {
      throw new Error(`'INSERT/UPDATE/DELETE'할 수 없는 상태입니다.`);
    }

    const tableDef = core.Reflect.getMetadata(tableDefMetadataKey, this.tableType) as ITableDef | undefined;
    if (!tableDef) {
      throw new Error(`'${this.tableType.name}'에 '@Table()'이 지정되지 않았습니다.`);
    }
    if (!tableDef.columns) {
      throw new Error(`'${tableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
    }

    const pkColNames = tableDef.columns.filter(item => item.autoIncrement).map(item => item.name);

    return Object.keys(obj).some(item => pkColNames.includes(item));
  }

  private _getIdentityInsertQuery(on: boolean): string {
    if (!this.tableType) {
      throw new Error(`'INSERT/UPDATE/DELETE'할 수 없는 상태입니다.`);
    }

    const tableDef = core.Reflect.getMetadata(tableDefMetadataKey, this.tableType) as ITableDef | undefined;
    if (!tableDef) {
      throw new Error(`'${this.tableType.name}'에 '@Table()'이 지정되지 않았습니다.`);
    }

    return `SET IDENTITY_INSERT [${tableDef.database || this._db.config.database}].[${tableDef.scheme}].[${tableDef.name}] ${on ? "ON" : "OFF"}`;
  }
}