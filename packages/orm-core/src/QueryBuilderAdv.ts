import "core-js/es7/reflect";
import {Type} from "@simplism/core";
import {QueryBuilder} from "./QueryBuilder";
import {tableDefMetadataKey} from "./decorators";
import {QueryUnit} from "./QueryUnit";
import {QueryType} from "./types";
import {queryHelpers} from "./queryHelpers";

export class QueryBuilderAdv<T> {
  private _unionQueryables?: QueryBuilderAdv<T>[];
  private _subQueryable?: QueryBuilderAdv<T>;
  private _tableType?: Type<T>;
  private _queryBuilder: QueryBuilder;
  private _select: { [key: string]: QueryUnit<QueryType> | QueryType } = {};
  private _useCustomSelect: boolean = false;
  private _singleJoinAsNames: string[] = [];

  public constructor(tableType: Type<T>, as?: string);
  public constructor(subQueryable: QueryBuilderAdv<T>, as?: string);
  public constructor(unionQueryables: QueryBuilderAdv<T>[], as?: string);
  public constructor(arg: Type<T> | QueryBuilderAdv<T> | QueryBuilderAdv<T>[], as: string = "TBL") {
    if (arg instanceof Array) {
      this._unionQueryables = arg;

      for (const selectAs of Object.keys(this._unionQueryables[0]._select)) {
        const selectOrg = this._unionQueryables[0]._select![selectAs]!;
        const selectType = selectOrg instanceof QueryUnit ? selectOrg.type : selectOrg.constructor;
        this._select[selectAs] = new QueryUnit(selectType as any, `[${as}].[${selectAs}]`);
      }

      const unionQueryBuilders: QueryBuilder[] = [];
      for (let i = 0; i < this._unionQueryables.length; i++) {
        unionQueryBuilders[i] = this._unionQueryables[i]._queryBuilder;
        const subSelect = {};
        for (const selectAs of Object.keys(this._unionQueryables[i]._select)) {
          const selectOrg = this._unionQueryables[i]._select![selectAs]!;
          subSelect[`[${selectAs}]`] = queryHelpers.getFieldQuery(selectOrg);
        }
        unionQueryBuilders[i] = unionQueryBuilders[i].select(subSelect);
      }

      this._queryBuilder = new QueryBuilder()
        .from(unionQueryBuilders, `[${as}]`);
    }
    else if (arg instanceof QueryBuilderAdv) {
      this._subQueryable = arg;

      for (const selectAs of Object.keys(this._subQueryable._select)) {
        const selectOrg = this._subQueryable._select![selectAs]!;
        const selectType = selectOrg instanceof QueryUnit ? selectOrg.type : selectOrg.constructor;
        this._select[selectAs] = new QueryUnit(selectType as any, `[${as}].[${selectAs}]`);
      }

      let subQueryBuilder = this._subQueryable._queryBuilder;
      const subSelect = {};
      for (const selectAs of Object.keys(this._subQueryable._select)) {
        const selectOrg = this._subQueryable._select![selectAs]!;
        subSelect[`[${selectAs}]`] = queryHelpers.getFieldQuery(selectOrg);
      }
      subQueryBuilder = subQueryBuilder.select(subSelect);

      this._queryBuilder = new QueryBuilder()
        .from(subQueryBuilder, `[${as}]`);
    }
    else {
      this._tableType = arg;
      const tableDef = core.Reflect.getMetadata(tableDefMetadataKey, this._tableType);

      if (!tableDef) {
        throw new Error(`'${this._tableType.name}'에 '@Table()'이 지정되지 않았습니다.`);
      }
      if (!tableDef.columns) {
        throw new Error(`'${tableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
      }

      for (const colDef of tableDef.columns) {
        this._select[colDef.name] = new QueryUnit(colDef.typeFwd(), `[${as}].[${colDef.name}]`)
      }
      this._queryBuilder = new QueryBuilder()
        .from(`[${tableDef.database}].[${tableDef.scheme}].[${tableDef.name}]`, `[${as}]`);
    }
  }

  public get query(): string {
    let queryBuilder = this._queryBuilder;

    const select = {};
    for (const selectAs of Object.keys(this._select)) {
      select[`[${selectAs}]`] = queryHelpers.getFieldQuery(this._select[selectAs]);
    }
    queryBuilder = queryBuilder.select(select);

    return queryBuilder.query;
  }

  public select<R>(fwd: (entity: T) => R): QueryBuilderAdv<R> {
    const result = this._clone();
    result._select = fwd(result.entity) as any;
    result._useCustomSelect = true;
    return result as any;
  }

  public where(predicate: (entity: T) => boolean[]): QueryBuilderAdv<T> {
    const result = this._clone();

    const wheres = predicate(result.entity);
    for (const where of wheres) {
      result._queryBuilder = result._queryBuilder.where(queryHelpers.getWhereQuery(where));
    }
    return result;
  }

  public distinct(): QueryBuilderAdv<T> {
    const result = this._clone();
    result._queryBuilder = result._queryBuilder.distinct();
    return result;
  }

  public top(cnt: number): QueryBuilderAdv<T> {
    const result = this._clone();
    result._queryBuilder = result._queryBuilder.top(cnt);
    return result;
  }

  public orderBy(fwd: (entity: T) => QueryType, desc?: boolean): QueryBuilderAdv<T> {
    const result = this._clone();

    const colQuery = queryHelpers.getFieldQuery(fwd(result.entity));

    result._queryBuilder = result._queryBuilder.orderBy(colQuery, desc ? "DESC" : "ASC");
    return result;
  }

  public limit(skip: number, take: number): QueryBuilderAdv<T> {
    const result = this._clone();
    result._queryBuilder = result._queryBuilder.limit(skip, take);
    return result;
  }

  public groupBy(fwd: (entity: T) => QueryType[]): QueryBuilderAdv<T> {
    const result = this._clone();

    const colQueries = fwd(result.entity).map(item => queryHelpers.getFieldQuery(item));

    result._queryBuilder = result._queryBuilder.groupBy(colQueries);
    return result;
  }

  public join<A extends string, J, R, S extends boolean>(joinType: Type<J>, as: A, fwd: (qr: QueryBuilderAdv<J>, entity: T) => QueryBuilderAdv<R>, isSingle?: S): QueryBuilderAdv<T & {[K in A]: (S extends true ? R : R[])}> {
    const result = this._clone();

    const joinQueryable = fwd(new QueryBuilderAdv(joinType, as), result.entity);

    if (joinQueryable._useCustomSelect) {
      const joinSelect = {};
      for (const selectAs of Object.keys(joinQueryable._select)) {
        joinSelect[`[${selectAs}]`] = queryHelpers.getFieldQuery(joinQueryable._select[selectAs]);
      }
      joinQueryable._queryBuilder = joinQueryable._queryBuilder.select(joinSelect);
    }

    result._queryBuilder = result._queryBuilder.join(joinQueryable._queryBuilder);

    for (const selectAs of Object.keys(joinQueryable._select)) {
      const selectOrg = joinQueryable._select[selectAs]!;
      const selectType = selectOrg instanceof QueryUnit ? selectOrg.type : selectOrg.constructor;
      result._select[`${as}.${selectAs}`] = new QueryUnit(selectType as any, `[${as}].[${selectAs}]`);
    }

    if (isSingle) {
      result._singleJoinAsNames.push(as);
    }

    result._singleJoinAsNames = result._singleJoinAsNames.concat(joinQueryable._singleJoinAsNames.map(subAs => as + "." + subAs));

    return result as any;
  }

  public update(fwd: (entity: T) => Partial<T>): QueryBuilderAdv<T> {
    const result = this._clone();
    const obj = fwd(result.entity);

    const update = {};
    for (const updateKey of Object.keys(obj)) {
      update[`[${updateKey}]`] = queryHelpers.getFieldQuery(obj[updateKey]);
    }

    result._queryBuilder = result._queryBuilder
      .update(update)
      .output(["INSERTED.*"]);
    return result;
  }

  public delete(): QueryBuilderAdv<T> {
    const result = this._clone();
    result._queryBuilder = result._queryBuilder
      .delete()
      .output(["DELETED.*"]);
    return result;
  }

  public insert(obj: T): QueryBuilderAdv<T> {
    const result = this._clone();

    const insert = {};
    for (const insertKey of Object.keys(obj)) {
      insert[`[${insertKey}]`] = queryHelpers.getFieldQuery(obj[insertKey]);
    }

    result._queryBuilder = result._queryBuilder
      .insert(insert)
      .output(["INSERTED.*"]);

    return result;
  }

  public upsert(obj: T): QueryBuilderAdv<T> {
    const result = this._clone();

    const upsert = {};
    for (const upsertKey of Object.keys(obj)) {
      upsert[`[${upsertKey}]`] = queryHelpers.getFieldQuery(obj[upsertKey]);
    }

    result._queryBuilder = result._queryBuilder
      .upsert(upsert)
      .output(["INSERTED.*"]);

    return result;
  }

  public get entity(): T {
    const entity = {};
    for (const selectAs of Object.keys(this._select)) {
      const selectQueryUnit = this._select![selectAs];

      if (selectAs.includes(".")) {
        const tblAsSplit = selectAs.split(".").slice(0, -1);
        const colAs = selectAs.split(".").slice(-1)[0];

        let cursorFullAsSplit: string[] = [];
        let cursorEntity = entity;
        for (const tblAsSplitItem of tblAsSplit) {
          cursorFullAsSplit.push(tblAsSplitItem);
          const isCursorSingle = this._singleJoinAsNames.includes(cursorFullAsSplit.join("."));

          if (isCursorSingle) {
            cursorEntity[tblAsSplitItem] = cursorEntity[tblAsSplitItem] || {};
            cursorEntity = cursorEntity[tblAsSplitItem];
          }
          else {
            cursorEntity[tblAsSplitItem] = cursorEntity[tblAsSplitItem] || [{}];
            cursorEntity = cursorEntity[tblAsSplitItem][0];
          }
        }

        cursorEntity[colAs] = selectQueryUnit;
      }
      else {
        entity[selectAs] = selectQueryUnit;
      }
    }

    return entity as T;
  }

  private _clone(): QueryBuilderAdv<T> {
    const cloned = new QueryBuilderAdv((this._tableType || this._subQueryable || this._unionQueryables) as any);
    cloned._queryBuilder = this._queryBuilder.clone();
    cloned._select = {...this._select};
    cloned._useCustomSelect = this._useCustomSelect;
    cloned._singleJoinAsNames = [...this._singleJoinAsNames];
    return cloned as any;
  }
}