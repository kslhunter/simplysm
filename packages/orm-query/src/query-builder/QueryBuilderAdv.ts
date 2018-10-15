import "core-js/es7/reflect";
import {DateOnly, DateTime, LambdaParser, Time, Type} from "@simplism/core";
import {QueryBuilder} from "./QueryBuilder";
import {IForeignKeyDef, IForeignKeyTargetDef, ITableDef, tableDefMetadataKey} from "../common/decorators";
import {QueryUnit} from "./QueryUnit";
import {QueryType} from "../common/QueryType";
import {ormHelpers} from "../common/ormHelpers";
import {sorm} from "../common/sorm";
import {QueriedBoolean} from "../common/QueriedBoolean";

export interface IJoinDef {
  as: string;
  isSingle: boolean;
  targetTableType: Type<any>;
  join: IJoinDef[];
}

export class QueryBuilderAdv<T> {
  private readonly _unionQba?: QueryBuilderAdv<T>[];
  private readonly _subQba?: QueryBuilderAdv<T>;
  private readonly _tableType?: Type<T>;
  private readonly _as: string;
  private readonly _database?: string;

  public qb: QueryBuilder;
  public joinDefs: IJoinDef[] = [];
  public selectObj: { [key: string]: QueryUnit<QueryType> | QueryType } = {};
  public orderByColNames: string[] = [];
  public singleSelectAsNames: string[] = [];
  public hasCustomSelect = false;

  public constructor(tableType: Type<T>, database?: string, as?: string);
  public constructor(subQueryBuilderAdv: QueryBuilderAdv<T>, database?: string, as?: string, tableType?: Type<T>);
  public constructor(unionQueryBuilderAdv: QueryBuilderAdv<T>[], database?: string, as?: string, tableType?: Type<T>);
  public constructor(arg: Type<T> | QueryBuilderAdv<T> | QueryBuilderAdv<T>[], database?: string, as?: string, tableType?: Type<T>);
  public constructor(arg: Type<T> | QueryBuilderAdv<T> | QueryBuilderAdv<T>[], database?: string, as: string = "TBL", tableType?: Type<T>) {
    if (arg instanceof Array) {
      this._unionQba = arg;
      this._tableType = tableType;

      for (const selectAs of Object.keys(this._unionQba[0].selectObj)) {
        const selectOrg = this._unionQba.map(item => item.selectObj[selectAs]).filterExists()[0];
        const selectType = selectOrg instanceof QueryUnit ? selectOrg.type : selectOrg.constructor;
        this.selectObj[selectAs] = new QueryUnit(selectType as any, `[${as}].[${selectAs}]`);
      }

      const unionQueryBuilders: QueryBuilder[] = [];
      for (let i = 0; i < this._unionQba.length; i++) {
        unionQueryBuilders[i] = this._unionQba[i].qb;
        const subSelect = {};
        for (const selectAs of Object.keys(this._unionQba[i].selectObj)) {
          const selectOrg = this._unionQba[i].selectObj[selectAs]!;
          subSelect[`[${selectAs}]`] = ormHelpers.getFieldQuery(selectOrg);
        }
        unionQueryBuilders[i] = unionQueryBuilders[i].select(subSelect);
      }

      this.qb = new QueryBuilder().from(unionQueryBuilders, `[${as}]`);
    }
    else if (arg instanceof QueryBuilderAdv) {
      this._subQba = arg;
      if (tableType) {
        this._tableType = tableType;

        const tableDef = core.Reflect.getMetadata(tableDefMetadataKey, this._tableType) as ITableDef | undefined;

        if (!tableDef) {
          throw new Error(`'${this._tableType.name}'에 '@Table()'이 지정되지 않았습니다.`);
        }
        if (!tableDef.columns) {
          throw new Error(`'${tableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
        }

        for (const colDef of tableDef.columns) {
          this.selectObj[colDef.name] = new QueryUnit(colDef.typeFwd(), `[${as}].[${colDef.name}]`);
        }

        let subQueryBuilder = this._subQba.qb;
        const subSelect = {};
        for (const selectAs of Object.keys(this._subQba.selectObj)) {
          if (
            tableDef.columns.map(item => item.name).includes(selectAs) ||
            this._subQba.orderByColNames.map(item => item.replace(/[\[\]]/g, "")).includes(selectAs)
          ) {
            const selectOrg = this._subQba.selectObj[selectAs]!;
            subSelect[`[${selectAs}]`] = ormHelpers.getFieldQuery(selectOrg);
          }
        }
        subQueryBuilder = subQueryBuilder.select(subSelect).distinct();

        this.qb = new QueryBuilder().from(subQueryBuilder, `[${as}]`);
      }
      else {
        for (const selectAs of Object.keys(this._subQba.selectObj)) {
          const selectOrg = this._subQba.selectObj[selectAs]!;
          const selectType = selectOrg instanceof QueryUnit ? selectOrg.type : selectOrg.constructor;
          this.selectObj[selectAs] = new QueryUnit(selectType as any, `[${as}].[${selectAs}]`);
        }

        let subQueryBuilder = this._subQba.qb;
        const subSelect = {};
        for (const selectAs of Object.keys(this._subQba.selectObj)) {
          const selectOrg = this._subQba.selectObj[selectAs]!;
          subSelect[`[${selectAs}]`] = ormHelpers.getFieldQuery(selectOrg);
        }
        subQueryBuilder = subQueryBuilder.select(subSelect);

        this.qb = new QueryBuilder().from(subQueryBuilder, `[${as}]`);
      }
    }
    else {
      this._tableType = arg;
      const tableDef = core.Reflect.getMetadata(tableDefMetadataKey, this._tableType) as ITableDef | undefined;

      if (!tableDef) {
        throw new Error(`'${this._tableType.name}'에 '@Table()'이 지정되지 않았습니다.`);
      }
      if (!tableDef.columns) {
        throw new Error(`'${tableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
      }

      for (const colDef of tableDef.columns) {
        this.selectObj[colDef.name] = new QueryUnit(colDef.typeFwd(), `[${as}].[${colDef.name}]`);
      }
      this.qb = new QueryBuilder().from(`[${tableDef.database || database}].[${tableDef.scheme}].[${tableDef.name}]`, `[${as}]`);
    }

    this._as = as;
    this._database = database;
  }

  public get query(): string {
    if (this.qb.def.type === "select") {
      const select = {};
      for (const selectAs of Object.keys(this.selectObj)) {
        select[`[${selectAs}]`] = ormHelpers.getFieldQuery(this.selectObj[selectAs]);
      }
      return this.qb.select(select).query;
    }
    else {
      return this.qb.query;
    }
  }

  public select<R>(fwd: (entity: T) => R): QueryBuilderAdv<R> {
    const result = this._clone();
    const selectObj = fwd(result.entity) as any;

    result.selectObj = {};
    result.singleSelectAsNames = [];

    const generate = (currObj: object, parentKey?: string) => {
      for (const key of Object.keys(currObj)) {
        if (
          currObj[key] instanceof Object
          && !(currObj[key] instanceof QueriedBoolean)
          && !(currObj[key] instanceof Number)
          && !(currObj[key] instanceof String)
          && !(currObj[key] instanceof Boolean)
          && !(currObj[key] instanceof DateOnly)
          && !(currObj[key] instanceof DateTime)
          && !(currObj[key] instanceof Time)
          && !(currObj[key] instanceof QueryUnit)
        ) {
          if (currObj[key] instanceof Array) {
            for (const item of currObj[key]) {
              generate(item, (parentKey ? parentKey + "." : "") + key);
            }
          }
          else {
            generate(currObj[key], (parentKey ? parentKey + "." : "") + key);
            result.singleSelectAsNames.push((parentKey ? parentKey + "." : "") + key);
          }
        }
        else {
          result.selectObj[(parentKey ? parentKey + "." : "") + key] = currObj[key];
        }
      }
    };

    generate(selectObj);

    const select = {};
    for (const selectAs of Object.keys(result.selectObj)) {
      select[`[${selectAs}]`] = ormHelpers.getFieldQuery(result.selectObj[selectAs]);
    }
    result.qb = this.qb.select(select);

    result.hasCustomSelect = true;

    return result as any;
  }

  public where(predicate: (entity: T) => boolean[]): QueryBuilderAdv<T> {
    const result = this._clone();

    const wheres = predicate(result.entityForWhere);
    for (const where of wheres) {
      result.qb = result.qb.where(ormHelpers.getWhereQuery(where));
    }
    return result;
  }

  public distinct(): QueryBuilderAdv<T> {
    const result = this._clone();
    result.qb = result.qb.distinct();
    return result;
  }

  public top(cnt: number): QueryBuilderAdv<T> {
    const result = this._clone();
    result.qb = result.qb.top(cnt);
    return result;
  }

  public orderBy(fwd: (entity: T) => QueryType, desc?: boolean): QueryBuilderAdv<T> {
    const result = this._clone();

    const colQuery = ormHelpers.getFieldQuery(fwd(result.entity));

    result.qb = result.qb.orderBy(colQuery, desc ? "DESC" : "ASC");

    result.orderByColNames.push(colQuery);
    return result;
  }

  public limit(skip: number, take: number): QueryBuilderAdv<T> {
    const result = this._clone();
    result.qb = result.qb.limit(skip, take);
    return result;
  }

  public groupBy(fwd: (entity: T) => QueryType[]): QueryBuilderAdv<T> {
    const result = this._clone();

    const colQueries = fwd(result.entity).map(item => ormHelpers.getFieldQuery(item));

    result.qb = result.qb.groupBy(colQueries);
    return result;
  }

  public having(predicate: (entity: T) => boolean[]): QueryBuilderAdv<T> {
    const result = this._clone();

    const havings = predicate(result.entity);
    for (const having of havings) {
      result.qb = result.qb.having(ormHelpers.getWhereQuery(having));
    }
    return result;
  }

  public join<A extends string, J, R, S extends boolean>(joinType: Type<J>, as: A, fwd: (qr: QueryBuilderAdv<J>, entity: T) => QueryBuilderAdv<R>, isSingle?: S): QueryBuilderAdv<T & { [K in A]: (S extends true ? R : R[]) }> {
    const result = this._clone();

    const joinQueryBuilderAdv = fwd(new QueryBuilderAdv(joinType, this._database, as), result.entity);

    if (joinQueryBuilderAdv.hasCustomSelect) {
      const joinSelect = {};
      for (const selectAs of Object.keys(joinQueryBuilderAdv.selectObj)) {
        joinSelect[`[${selectAs}]`] = ormHelpers.getFieldQuery(joinQueryBuilderAdv.selectObj[selectAs]);
      }
      joinQueryBuilderAdv.qb = joinQueryBuilderAdv.qb.select(joinSelect);
    }

    const qb = result.qb.join(joinQueryBuilderAdv.qb);
    if (!qb) return result as any;

    result.qb = qb;

    for (const selectAs of Object.keys(joinQueryBuilderAdv.selectObj)) {
      const selectOrg = joinQueryBuilderAdv.selectObj[selectAs]!;
      const selectType = selectOrg instanceof QueryUnit ? selectOrg.type : selectOrg.constructor;
      result.selectObj[`${as}.${selectAs}`] = new QueryUnit(selectType as any, `[${as}].[${selectAs}]`);
    }

    this.hasCustomSelect = true;

    result.joinDefs.push({
      as,
      isSingle: !!isSingle,
      targetTableType: joinType,
      join: joinQueryBuilderAdv.joinDefs
    });

    return result as any;
  }

  public include<A extends string, J, S extends boolean>(targetFwd: (entity: NonNullable<T>) => (J | J[] | undefined), as?: A, fwd?: (qr: QueryBuilderAdv<J>, entity: T) => QueryBuilderAdv<J>, isSingle?: S): QueryBuilderAdv<T> {
    const parsed = LambdaParser.parse(targetFwd);
    const itemParamName = parsed.params[0];
    const targetTableChainedName = parsed.returnContent
      .replace(new RegExp(`${itemParamName}\\.`), "")
      .replace(/\[0]/g, "")
      .trim();

    const fkOrFktDef = this._getFkOrFktDef(targetTableChainedName);
    if (!fkOrFktDef) {
      throw new Error(`${this._tableType}에서, ${targetTableChainedName}의 FK/FKT를 찾을 수 없습니다.`);
    }

    const filter: any = {};
    let joinTableType: Type<any>;
    let isSingle1: boolean;

    // FK
    if (fkOrFktDef["columnNames"]) {
      const fkDef = fkOrFktDef as IForeignKeyDef;

      const targetTableType = fkDef.targetTypeFwd();

      const targetTableDef = core.Reflect.getMetadata(tableDefMetadataKey, targetTableType) as ITableDef | undefined;
      if (!targetTableDef) {
        throw new Error(`'${targetTableType.name}'에 '@Table()'이 지정되지 않았습니다.`);
      }
      if (!targetTableDef.columns) {
        throw new Error(`'${targetTableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
      }

      const pkColDefs = targetTableDef.columns.filter(item => !!item.primaryKey);
      if (pkColDefs.length !== fkDef.columnNames.length) {
        throw new Error("기준테이블의 @ForeignKey 와 목표테이블의 @PrimaryKey 의 길이가 다릅니다.");
      }

      for (let i = 0; i < pkColDefs.length; i++) {
        const srcColumnName = fkDef.columnNames[i];
        const targetPkColumnName = pkColDefs[i].name;

        filter[targetPkColumnName] = new QueryUnit(pkColDefs[i].typeFwd(), `[${targetTableChainedName.split(".").slice(0, -1).join(".") || this._as}].[${srcColumnName}]`);
      }

      joinTableType = targetTableType;
      isSingle1 = true;
    }
    // FKT
    else {
      const fktDef = fkOrFktDef as IForeignKeyTargetDef;
      const sourceTableType = fktDef.sourceTypeFwd();
      const sourceTableDef = core.Reflect.getMetadata(tableDefMetadataKey, sourceTableType) as ITableDef | undefined;
      if (!sourceTableDef) {
        throw new Error(`'${sourceTableType.name}'에 '@Table()'이 지정되지 않았습니다.`);
      }

      const targetFkDef = sourceTableDef.foreignKeys!.single(item => item.name === fktDef.foreignKeyName)!;
      const targetTableType = targetFkDef.targetTypeFwd();
      const targetTableDef = core.Reflect.getMetadata(tableDefMetadataKey, targetTableType) as ITableDef | undefined;
      if (!targetTableDef) {
        throw new Error(`'${targetTableType.name}'에 '@Table()'이 지정되지 않았습니다.`);
      }
      if (!targetTableDef.columns) {
        throw new Error(`'${targetTableDef.name}'의 컬럼 설정이 잘못되었습니다.`);
      }

      const pkColDefs = targetTableDef.columns.filter(item => !!item.primaryKey);
      if (pkColDefs.length !== targetFkDef.columnNames.length) {
        throw new Error("기준테이블의 @PrimaryKey 와 목표테이블의 @ForeignKey 의 길이가 다릅니다.");
      }

      for (let i = 0; i < pkColDefs.length; i++) {
        const srcColumnName = targetFkDef.columnNames[i];
        const targetPkColumnName = pkColDefs[i].name;

        filter[srcColumnName] = new QueryUnit(pkColDefs[i].typeFwd(), `[${targetTableChainedName.split(".").slice(0, -1).join(".") || this._as}].[${targetPkColumnName}]`);
      }

      joinTableType = sourceTableType;
      isSingle1 = false;
    }

    return this.join(
      joinTableType,
      as || targetTableChainedName,
      (qr, en) => {
        let result = qr.where(item => {
          const whereQuery = [];
          for (const key of Object.keys(filter)) {
            whereQuery.push(
              sorm.equal(item[key], filter[key])
            );
          }
          return whereQuery;
        });

        if (fwd) {
          result = fwd(result, en);
        }

        return result;
      },
      isSingle || isSingle1
    );
  }

  public update(fwd: (entity: T) => Partial<T>): QueryBuilderAdv<T> {
    const result = this._clone();
    const obj = fwd(result.entity);

    const update = {};
    for (const updateKey of Object.keys(obj)) {
      update[`[${updateKey}]`] = ormHelpers.getFieldQuery(obj[updateKey]);
    }

    result.qb = result.qb
      .update(update)
      .output(["INSERTED.*"]);
    return result;
  }

  public delete(): QueryBuilderAdv<T> {
    const result = this._clone();
    result.qb = result.qb
      .delete()
      .output(["DELETED.*"]);
    return result;
  }

  public insert(obj: T): QueryBuilderAdv<T> {
    const result = this._clone();

    const insert = {};
    for (const insertKey of Object.keys(obj)) {
      insert[`[${insertKey}]`] = ormHelpers.getFieldQuery(obj[insertKey]);
    }

    result.qb = result.qb
      .insert(insert)
      .output(["INSERTED.*"]);

    return result;
  }

  public upsert(fwd: (item: T) => Partial<T>, additionalInsertObj: Partial<T>): QueryBuilderAdv<T>;
  public upsert(obj: Partial<T>, additionalInsertObj: Partial<T>): QueryBuilderAdv<T>;
  public upsert(fwd: (item: T) => T): QueryBuilderAdv<T>;
  public upsert(obj: T): QueryBuilderAdv<T>;
  public upsert(arg: Partial<T> | ((item: T) => Partial<T>), additionalInsertObj?: Partial<T>): QueryBuilderAdv<T>;
  public upsert(arg: Partial<T> | ((item: T) => Partial<T>), additionalInsertObj?: Partial<T>): QueryBuilderAdv<T> {
    const result = this._clone();

    const obj = typeof arg === "function" ? arg(result.entity) : arg;
    const upsert = {};
    for (const upsertKey of Object.keys(obj)) {
      upsert[`[${upsertKey}]`] = ormHelpers.getFieldQuery(obj[upsertKey]);
    }

    let additionalInsert: { [key: string]: string } | undefined;
    if (additionalInsertObj) {
      additionalInsert = {};
      for (const additionalInsertKey of Object.keys(additionalInsertObj)) {
        additionalInsert[`[${additionalInsertKey}]`] = ormHelpers.getFieldQuery(additionalInsertObj[additionalInsertKey]);
      }
    }

    result.qb = result.qb
      .upsert(upsert, additionalInsert)
      .output(["INSERTED.*"]);

    return result;
  }

  public get entity(): T {
    const entity = {};
    for (const selectAs of Object.keys(this.selectObj)) {
      const selectQueryUnit = this.selectObj[selectAs];

      if (selectAs.includes(".")) {
        const tblAsSplit = selectAs.split(".").slice(0, -1);
        const colAs = selectAs.split(".").slice(-1)[0];

        const cursorFullAsSplit: string[] = [];
        let cursorEntity = entity;
        for (const tblAsSplitItem of tblAsSplit) {
          cursorFullAsSplit.push(tblAsSplitItem);
          const joinDef = this.getAllJoinDef()[cursorFullAsSplit.join(".")];
          const isCursorSingle = joinDef ? joinDef.isSingle : this.singleSelectAsNames.includes(cursorFullAsSplit.join("."));

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

  public get entityForWhere(): T {
    const generate = (item: any) => {
      const obj = {};

      for (const key of Object.keys(item)) {
        if (item[key] instanceof Array) {
          obj[key] = [];
          for (const item1 of item[key]) {
            obj[key].push(generate(item1));
          }
        }
        else if (
          item[key] instanceof Object
          && !(item[key] instanceof QueriedBoolean)
          && !(item[key] instanceof Number)
          && !(item[key] instanceof String)
          && !(item[key] instanceof Boolean)
          && !(item[key] instanceof DateOnly)
          && !(item[key] instanceof DateTime)
          && !(item[key] instanceof Time)
          && !(item[key] instanceof QueryUnit)) {
          obj[key] = generate(item[key]);
        }
        else if (item[key] instanceof QueryUnit && item[key].type === QueriedBoolean) {
          obj[key] = new QueryUnit(Boolean, item[key].queryForWhere);
        }
        else {
          obj[key] = item[key];
        }
      }

      return obj;
    };

    return generate(this.entity) as T;
  }

  public getAllJoinDef(): { [chain: string]: IJoinDef } {
    if (!this._tableType) {
      throw new Error("테이블 타입을 알 수 없습니다.");
    }

    const result: { [chain: string]: IJoinDef } = {};

    const tableDef = core.Reflect.getMetadata(tableDefMetadataKey, this._tableType) as ITableDef | undefined;
    if (!tableDef) {
      throw new Error(`'${this._tableType.name}'에 '@Table()'이 지정되지 않았습니다.`);
    }

    const mapping = (joinDefs: IJoinDef[], parentAs?: string) => {
      for (const joinDef of joinDefs) {
        const currAs = (parentAs ? parentAs + "." : "") + joinDef.as;
        result[currAs] = joinDef;

        const targetTableDef = core.Reflect.getMetadata(tableDefMetadataKey, joinDef.targetTableType) as ITableDef | undefined;
        if (!targetTableDef) {
          throw new Error(`'${joinDef.targetTableType.name}'에 '@Table()'이 지정되지 않았습니다.`);
        }

        mapping(joinDef.join, currAs);
      }
    };

    mapping(this.joinDefs);

    return result;
  }

  private _getFkOrFktDef(chain: string): IForeignKeyDef | IForeignKeyTargetDef | undefined {
    const parentAs = chain.split(".").slice(0, -1).join(".");
    if (parentAs) {
      const joinDef = this.getAllJoinDef()[parentAs];
      const joinTableDef = core.Reflect.getMetadata(tableDefMetadataKey, joinDef.targetTableType)  as ITableDef | undefined;
      if (!joinTableDef) {
        throw new Error(`'${joinDef.targetTableType.name}'에 '@Table()'이 지정되지 않았습니다.`);
      }

      const fkOrFkts = [
        ...(joinTableDef.foreignKeys || []),
        ...(joinTableDef.foreignKeyTargets || [])
      ];

      return fkOrFkts.single(item => item.name === chain.split(".").last());
    }
    else {
      if (!this._tableType) {
        throw new Error("테이블 타입을 알 수 없습니다.");
      }

      const tableDef = core.Reflect.getMetadata(tableDefMetadataKey, this._tableType)  as ITableDef | undefined;
      if (!tableDef) {
        throw new Error(`'${this._tableType.name}'에 '@Table()'이 지정되지 않았습니다.`);
      }
      const fkOrFkts = [
        ...(tableDef.foreignKeys || []),
        ...(tableDef.foreignKeyTargets || [])
      ];
      return fkOrFkts.single(item => item.name === chain.split(".").last());
    }
  }

  private _clone(): QueryBuilderAdv<T> {
    const cloned = new QueryBuilderAdv((this._tableType || this._subQba || this._unionQba) as any, this._database, this._as);
    cloned.qb = this.qb.clone();
    cloned.selectObj = {...this.selectObj};
    cloned.joinDefs = [...this.joinDefs];
    cloned.orderByColNames = [...this.orderByColNames];
    return cloned as any;
  }
}