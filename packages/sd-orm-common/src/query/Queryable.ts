import {
  IConfigIdentityInsertQueryDef,
  IDeleteQueryDef,
  IInsertQueryDef,
  IJoinQueryDef,
  IQueryResultParseOption,
  ISelectQueryDef,
  IUpdateQueryDef,
  IUpsertQueryDef
} from "../query-definition";
import {
  TEntity,
  TEntityValue,
  TQueryValue,
  TQueryValueOrSelect,
  TQueryValueOrSelectArray,
  TQueryValueTypeWrap
} from "../common";
import {QueryUtils} from "../util/QueryUtils";
import {DbContext} from "./DbContext";
import {FunctionUtils, JsonConvert, NeverEntryError, ObjectUtils, Type, Wait} from "@simplysm/sd-core-common";
import {ITableDef} from "../definition";
import {DbDefinitionUtils} from "../util/DbDefinitionUtils";
import {QueryUnit} from "./QueryUnit";
import {sorm} from "./sorm";

export class Queryable<D extends DbContext, T> {
  public readonly tableType?: Type<T>; // wrapping 사용시, undefined 일 수 있음
  private readonly _as?: string;
  private readonly _tableDef?: ITableDef; // wrapping 사용시, undefined 일 수 있음
  private _entity: TEntity<T>;
  private readonly _isCustomEntity: boolean = false;

  private readonly _def: IQueryableDef;

  public constructor(db: D | undefined, cloneQueryable: Queryable<D, T>);
  public constructor(db: D | undefined, cloneQueryable: Queryable<D, any>, entity: TEntity<T>);
  public constructor(db: D | undefined, tableType: Type<T>, as?: string);
  public constructor(db: D | undefined, tableType: Type<T> | undefined, as: string | undefined, entity: TEntity<T>, defs: IQueryableDef);
  public constructor(private readonly _db: D | undefined, arg1?: Queryable<D, T> | Type<T>, arg2?: string | TEntity<T>, arg3?: TEntity<T>, arg4?: IQueryableDef) {
    // Clone 일때
    if (arg1 instanceof Queryable) {
      this.tableType = arg1.tableType;
      this._as = arg1._as;
      this._tableDef = arg1._tableDef ? ObjectUtils.clone(arg1._tableDef) : undefined;
      this._entity = ObjectUtils.clone(arg1._entity);
      this._def = ObjectUtils.clone(arg1._def);

      if (arg2 !== undefined) {
        this._entity = ObjectUtils.clone(arg2 as TEntity<T>, {
          useRefTypes: this._db ? [this._db.constructor as Type<any>] : []
        });
        this._isCustomEntity = true;
      }
    }
    // 일반 생성
    else if (arg3 === undefined) {
      this.tableType = arg1 as Type<T>;
      this._as = arg2 as string | undefined;

      // Init TABLE Definition
      const tableDef = DbDefinitionUtils.getTableDef(this.tableType);
      if (!tableDef) {
        throw new Error(`'${this.tableType.name}'에 '@Table()'이 지정되지 않았습니다.`);
      }
      this._tableDef = tableDef;

      // Init Entity
      this._entity = {} as TEntity<T>;

      for (const colDef of this._tableDef.columns) {
        this._entity[colDef.propertyKey] = new QueryUnit(colDef.typeFwd(), `[TBL${this._as !== undefined ? `.${this._as}` : ""}].[${colDef.name}]`);
      }

      // Init FROM
      this._def = {
        from: QueryUtils.getTableName({
          database: this._tableDef.database ?? (this._db ? this._db.schema.database : undefined),
          schema: this._tableDef.schema ?? (this._db ? this._db.schema.schema : undefined),
          name: this._tableDef.name
        })
      };
    }
    // tableDef 없이 생성 (wrapping)
    else {
      this._as = arg2 as string;
      this._entity = arg3;
      this._def = arg4!;

      if (arg1 !== undefined) {
        this.tableType = arg1;

        // Init TABLE Definition
        const tableDef = DbDefinitionUtils.getTableDef(this.tableType);
        if (!tableDef) {
          throw new Error(`'${this.tableType.name}'에 '@Table()'이 지정되지 않았습니다.`);
        }
        this._tableDef = tableDef;
      }
    }
  }

  public static union<D extends DbContext, T>(qrs: Queryable<D, T>[], as?: string): Queryable<D, T> {
    const db = qrs[0]._db;
    const cqrs = qrs.map(item => new Queryable(db, item));

    // Init entity
    const entity = {} as TEntity<T>;
    for (const entityKey of Object.keys(cqrs[0]._entity)) {
      const entityValue = cqrs[0]._entity[entityKey];
      if (!QueryUtils.canGetQueryValue(entityValue)) {
        throw new Error("단일계층 이상의 구조를 가진 'queryable' 은 UNION 할 수 없습니다. select 를 통해 단일계층으로 만드세요.");
      }

      entity[entityKey] = new QueryUnit(QueryUtils.getQueryValueType(entityValue), `[TBL${as !== undefined ? "." + as : ""}].[${entityKey}]`);
    }

    // Init defs.from
    const from = cqrs.map(item => item.getSelectDef());

    return new Queryable(db, undefined, as, entity, {from});
  }

  public select<R>(fwd: (entity: TEntity<T>) => TEntity<R>): Queryable<D, R> {
    const newEntity = fwd(this._entity);
    // if (this._entity["__searchOrder"] !== undefined && this._def.orderBy?.some(item => item[0] === "[__searchOrder]")) {
    //   newEntity["__searchOrder"] = this._entity["__searchOrder"];
    // }
    return new Queryable(this._db, this, newEntity);
  }

  public where(predicate: (entity: TEntity<T>) => TQueryValueOrSelectArray[]): Queryable<D, T> {
    const result = new Queryable(this._db, this);
    const where = sorm.and(predicate(this._entity));
    result._def.where = result._def.where ? sorm.and([result._def.where, where]) : where;
    return result;
  }

  public distinct(): Queryable<D, T> {
    const result = new Queryable(this._db, this);
    result._def.distinct = true;
    return result;
  }

  public top(count: number): Queryable<D, T> {
    const result = new Queryable(this._db, this);
    result._def.top = count;
    return result;
  }

  public orderBy(fwd: (entity: TEntity<T>) => TEntityValue<TQueryValue>, desc?: boolean): Queryable<D, T>;
  public orderBy(chain: string, desc?: boolean): Queryable<D, T>;
  public orderBy(defs: { key: string; desc: boolean }[]): Queryable<D, T>;
  public orderBy(arg1: ((entity: TEntity<T>) => TEntityValue<TQueryValue>) | string | { key: string; desc: boolean }[], desc?: boolean): Queryable<D, T> {
    let result = new Queryable(this._db, this);

    let selectedColumn;
    if (typeof arg1 === "function") {
      selectedColumn = arg1(this._entity);
    }
    else if (typeof arg1 === "string") {
      const chain = arg1.split(".").slice(0, -1);
      const asChainArr: string[] = [];
      for (const fkName of chain) {
        asChainArr.push(fkName);
        const as = asChainArr.join(".");

        result = result.include(as);
      }

      selectedColumn = this._getEntityChainValue(result._entity, arg1);
    }
    else {
      for (const orderingItem of arg1) {
        result = result.orderBy(orderingItem.key, orderingItem.desc);
      }
      return result;
    }

    result._def.orderBy = result._def.orderBy ?? [];
    const queryValue = QueryUtils.getQueryValue(selectedColumn);
    if (result._def.orderBy.some(item => item[0] === queryValue)) {
      throw new Error("정렬 기준이 중복 되었습니다: " + queryValue);
    }
    result._def.orderBy.push([queryValue, (desc ? "DESC" : "ASC")]);
    return result;
  }

  public limit(skip: number, take: number): Queryable<D, T> {
    const result = new Queryable(this._db, this);
    result._def.limit = [skip, take];
    return result;
  }

  public groupBy(fwd: (entity: TEntity<T>) => TEntityValue<TQueryValue>[]): Queryable<D, T> {
    const result = new Queryable(this._db, this);
    result._def.groupBy = fwd(this._entity).map(item => QueryUtils.getQueryValue(item));

    // if (this._entity["__searchOrder"] !== undefined && this._def.orderBy?.some(item => item[0] === "[__searchOrder]")) {
    //   result._def.orderBy?.remove(item => item[0] === "[__searchOrder]");
    //   delete result._entity["__searchOrder"];
    // }

    return result;
  }

  public having(predicate: (entity: TEntity<T>) => TQueryValueOrSelectArray[]): Queryable<D, T> {
    const result = new Queryable(this._db, this);
    result._def.having = result._def.having ?? [];
    result._def.having.push(...sorm.and(predicate(this._entity)));
    return result;
  }

  public join<A extends string, J, R>(joinTypeOrQrs: Type<J> | Queryable<D, J>[], as: A, fwd: (queryable: Queryable<D, J>, entity: TEntity<T>) => Queryable<D, R>): Queryable<D, T & { [K in A]: R[] }>;
  public join<A extends string, J, R>(joinTypeOrQrs: Type<J> | Queryable<D, J>[], as: A, fwd: (queryable: Queryable<D, J>, entity: TEntity<T>) => Queryable<D, R>, isSingle: true): Queryable<D, T & { [K in A]: R }>;
  public join<A extends string, J, R>(joinTypeOrQrs: Type<J> | Queryable<D, J>[], as: A, fwd: (queryable: Queryable<D, J>, entity: TEntity<T>) => Queryable<D, R>, isSingle?: boolean): Queryable<D, T & { [K in A]: R | R[] }> {
    if (this._def.join?.some(item => item.as === `[TBL.${as}]`)) {
      return new Queryable(this._db, this) as any;
    }

    let joinTableQueryable: Queryable<D, J>;
    if (joinTypeOrQrs instanceof Array) {
      joinTableQueryable = Queryable.union(joinTypeOrQrs, as);
    }
    else {
      joinTableQueryable = new Queryable(this._db, joinTypeOrQrs, as);
    }
    const joinQueryable = fwd(joinTableQueryable, this._entity);
    const joinEntity = this._getParentEntity(joinQueryable._entity, as, undefined);

    const entity = {...this._entity};
    this._setEntityChainValue(entity, as, isSingle ? joinEntity : [joinEntity]);

    const result = new Queryable(
      this._db,
      this,
      entity as TEntity<T & { [K in A]: R | R[] }>
    );

    result._def.join = result._def.join ?? [];
    result._def.join.push({
      ...joinQueryable.getSelectDef() as IJoinQueryDef,
      isSingle: isSingle === true
    });

    return result;
  }

  public include<J>(chain: string): Queryable<D, T>;
  public include<J>(targetFwd: (entity: TEntity<T>) => TEntity<J>): Queryable<D, T>;
  public include<J>(arg: string | ((entity: TEntity<T>) => TEntity<J>)): Queryable<D, T> {
    if (!this._tableDef) {
      throw new Error("'Wrapping'된 이후에는 include 를 사용할 수 없습니다.");
    }

    let tableChainedName;
    if (typeof arg === "function") {
      const parsed = FunctionUtils.parse(arg);
      const itemParamName = parsed.params[0];
      tableChainedName = parsed.returnContent
        .replace(new RegExp(`${itemParamName}\\.`), "")
        .replace(/\[0]/g, "")
        .trim();
    }
    else {
      tableChainedName = arg;
    }

    const chain = tableChainedName.split(".");
    let result: Queryable<D, any> = this;
    let tableDef = this._tableDef;
    const asChainArr: string[] = [];
    for (const fkName of chain) {
      const prevAs = asChainArr.join(".");
      asChainArr.push(fkName);
      const as = asChainArr.join(".");

      // FK 정의 가져오기
      const fkDef = tableDef.foreignKeys.single(item => item.propertyKey === fkName);
      const fktDef = tableDef.foreignKeyTargets.single(item => item.propertyKey === fkName);
      if (!fkDef && !fktDef) {
        throw new Error(`'${tableDef.name}.${fkName}'에 '@ForeignKey()'나 '@ForeignKeyTarget()'이 지정되지 않았습니다.`);
      }

      // FK
      if (fkDef) {
        // FK 대상 테이블의 정의 가져오기
        const fkTargetType = fkDef.targetTypeFwd();
        const fkTargetTableDef = DbDefinitionUtils.getTableDef(fkTargetType);
        if (fkDef.columnPropertyKeys.length !== fkTargetTableDef.columns.filter(item => item.primaryKey !== undefined).length) {
          throw new Error(`'${tableDef.name}.${fkName}'의 FK 설정과 '${fkTargetTableDef.name}'의 PK 설정의 길이가 다릅니다.`);
        }

        // JOIN (SINGLE) 실행
        result = result.join(
          fkTargetType,
          as,
          (q, en) => q.where(item => {
            const lastEn = this._getEntityChainValue(en, prevAs);

            const whereQuery: TQueryValueOrSelectArray[] = [];
            for (let i = 0; i < fkDef.columnPropertyKeys.length; i++) {
              whereQuery.push(sorm.equal(item[fkTargetTableDef.columns[i].propertyKey], lastEn[fkDef.columnPropertyKeys[i]]));
            }
            return whereQuery;
          }),
          true
        );

        tableDef = fkTargetTableDef;
      }
      // FKT
      else if (fktDef) {
        const fktSourceType = fktDef.sourceTypeFwd();
        const fktSourceTableDef = DbDefinitionUtils.getTableDef(fktSourceType);
        const fktSourceFkDef = fktSourceTableDef.foreignKeys.single(item => item.propertyKey === fktDef.foreignKeyPropertyKey);
        if (!fktSourceFkDef) {
          throw new Error(`'${fktSourceTableDef.name}.${fktDef.foreignKeyPropertyKey}'에 '@ForeignKey()'가 지정되지 않았습니다.`);
        }

        if (fktSourceFkDef.columnPropertyKeys.length !== tableDef.columns.filter(item => item.primaryKey !== undefined).length) {
          throw new Error(`'${fktSourceTableDef.name}.${fktDef.foreignKeyPropertyKey}'의 FK 설정과 '${tableDef.name}'의 PK 설정의 길이가 다릅니다.`);
        }

        // JOIN 실행
        result = result.join(
          fktSourceType,
          as,
          (q, en) => q.where(item => {
            const lastEn = this._getEntityChainValue(en, prevAs);

            const whereQuery: TQueryValueOrSelectArray[] = [];
            for (let i = 0; i < fktSourceFkDef.columnPropertyKeys.length; i++) {
              whereQuery.push(sorm.equal(item[fktSourceFkDef.columnPropertyKeys[i]], lastEn[tableDef.columns[i].propertyKey]));
            }
            return whereQuery;
          })
        );

        tableDef = fktSourceTableDef;
      }
    }

    return result as Queryable<D, T>;
  }

  public search(fwd: (entity: TEntity<T>) => TEntityValue<String | string | undefined>[], searchText: string): Queryable<D, T> {
    let result: Queryable<D, T> = new Queryable(this._db, this);

    const splitSearchText = searchText.trim().split(" ")
      .map(item => item.trim())
      .filter(item => Boolean(item));

    // WHERE
    result = result
      .where(item => {
        const orArr = [];

        const fields = fwd(item);
        for (const field of fields) {
          for (const text of splitSearchText) {
            orArr.push(sorm.includes(field as any, text));
          }
        }

        return [sorm.or(orArr)];
      });

    // SELECT
    result = result.select(item => {
      const fields = fwd(item) as any[];

      // 같은거 포함(999)
      let countQuery = [];
      for (const field of fields) {
        countQuery.push(...[sorm.case(sorm.includes(field, searchText), 10000).else(0), "+"]);
      }

      // 분할 텍스트 각각 모두 포함(888)
      for (const field of fields) {
        const andArr = [];
        for (const text of splitSearchText) {
          andArr.push(sorm.includes(field, text));
        }
        countQuery.push(...[sorm.case(sorm.and(andArr), 100).else(0), "+"]);
      }

      // 분할중 일부만 포함한것(포함갯수)
      for (const field of fields) {
        for (const text of splitSearchText) {
          countQuery.push(...[sorm.case(sorm.includes(field, text), 1).else(0), "+"]);
        }
      }

      countQuery = countQuery.slice(0, -1);

      return {
        ...item,
        __searchOrder: new QueryUnit(Number, countQuery)
      };
    }) as any;

    // ORDER BY
    result.orderBy(item => item["__searchOrder"], true);
    /*result._def.orderBy = result._def.orderBy ?? [];
    result._def.orderBy.insert(0, ["[__searchOrder]", "DESC"]);*/
    return result;
  }

  public wrap(): Queryable<D, T>;
  public wrap<R extends Partial<T>>(tableType: Type<R>): Queryable<D, R>;
  public wrap<R extends Partial<T>>(tableType?: Type<R>): Queryable<D, T | R> {
    const clone: Queryable<D, T> = new Queryable(this._db, this);
    if (tableType !== undefined) {
      const cloneEntity: any = {};
      for (const key of Object.keys(this._entity)) {
        const entityValue = this._entity[key];
        if (QueryUtils.canGetQueryValue(entityValue)) {
          cloneEntity[key] = entityValue;
        }
      }
      clone._entity = cloneEntity;
    }
    const subFrom = clone.getSelectDef();

    const currEntity = this._getParentEntity(clone._entity, this._as, undefined);

    return new Queryable<D, T | R>(this._db, tableType, this._as, currEntity, {from: subFrom});
  }

  public getSelectDef(): ISelectQueryDef {
    const result: ISelectQueryDef = {} as any;

    // FROM 구성
    result.from = this._def.from;

    // AS 구성
    result.as = `[TBL${this._as !== undefined ? `.${this._as}` : ""}]`;

    // SELECT 필드 구성
    result.select = {};

    const addSelectValue = (key: string, value: any): void => {
      if (QueryUtils.canGetQueryValue(value)) {
        /*const queryValue = QueryUtils.getQueryValue(value);
        if (queryValue && queryValue["from"]) {
          if (queryValue["top"] !== 1) {
            throw new Error("SELECT 안에서 내부쿼리문을 쓰려면, 내부쿼리에서는 반드시 TOP 1 이 지정 되야 합니다.");
          }
          if (Object.keys(queryValue["select"]).length > 1) {
            throw new Error("SELECT 안에서 내부쿼리문을 쓰려면, 내부쿼리에서는 반드시 하나의 컬럼만 SELECT 되야 합니다.");
          }
        }*/
        result.select[`[${key}]`] = QueryUtils.getQueryValue(value);
      }
      else if (value instanceof Array) {
        if (value.some(item => QueryUtils.canGetQueryValue(item))) {
          throw new Error("SELECT 에 입력할 수 없는 정보가 입력되었습니다. (sorm.equal 등은 sorm.is 로 wrapping 해 주어야 사용할 수 있습니다.)");
        }
        else {
          for (const subKey of Object.keys(value[0])) {
            addSelectValue(`${key}.${subKey}`, value[0][subKey]);
          }
        }
      }
      else {
        for (const subKey of Object.keys(value)) {
          addSelectValue(`${key}.${subKey}`, value[subKey]);
        }
      }
    };

    for (const entityKey of Object.keys(this._entity)) {
      addSelectValue(entityKey, this._entity[entityKey]);
    }

    result.where = this._def.where;
    result.distinct = this._def.distinct;
    result.top = this._def.top;
    result.orderBy = this._def.orderBy;
    result.limit = this._def.limit;
    result.groupBy = this._def.groupBy;
    result.having = this._def.having;
    result.join = this._def.join;

    if (this._def.having && !(this._def.groupBy && this._def.groupBy.length > 0)) {
      throw new Error("'HAVING'을 사용하려면, 'GROUP BY'를 반드시 설정해야 합니다.");
    }

    if (this._def.limit && this._def.join && this._def.join.some(item => !item.isSingle)) {
      throw new Error("다수의 'RECORD'를 'JOIN'하는 쿼리와 'LIMIT'을 동시에 사용할 수 없습니다. 'LIMIT'을 먼저 사용하고, 'WRAP'한 이후에 'JOIN' 하시기 바랍니다.");
    }

    if (this._def.limit && (!this._def.orderBy || this._def.orderBy.length <= 0)) {
      throw new Error("'LIMIT'을 사용하려면, 'ORDER BY'를 반드시 설정해야 합니다.");
    }

    return ObjectUtils.clearUndefined(result);
  }


  private _getParentEntity<P>(fromEntity: TEntity<P>, rootAs: string | undefined, parentAs: string | undefined): TEntity<P> {
    const result: any = {};
    for (const key of Object.keys(fromEntity)) {
      const entityValue = fromEntity[key];
      if (QueryUtils.canGetQueryValue(entityValue)) {
        result[key] = new QueryUnit(QueryUtils.getQueryValueType(entityValue), "[TBL" + (rootAs !== undefined ? "." + rootAs : "") + "].[" + (parentAs !== undefined ? `${parentAs}.` : "") + key + "]");
      }
      else if (entityValue instanceof Array) {
        result[key] = [
          this._getParentEntity(entityValue[0], rootAs, (parentAs !== undefined ? parentAs + "." : "") + key)
        ] as any;
      }
      else {
        result[key] = this._getParentEntity(entityValue, rootAs, (parentAs !== undefined ? parentAs + "." : "") + key);
      }
    }
    return result;
  };

  public getInsertDef(obj: InsertObject<T>): IInsertQueryDef {
    if (this._def.join !== undefined) {
      throw new Error("INSERT 와 JOIN 를 함께 사용할 수 없습니다.");
    }

    if (typeof this._def.from !== "string") {
      throw new Error("INSERT 할 TABLE 을 정확히 지정해야 합니다.");
    }

    if (this._isCustomEntity) {
      throw new Error("INSERT 와 SELECT 를 함께 사용할 수 없습니다.");
    }

    if (this._def.where !== undefined) {
      throw new Error("INSERT 와 WHERE 를 함께 사용할 수 없습니다.");
    }

    if (this._def.distinct !== undefined) {
      throw new Error("INSERT 와 DISTINCT 를 함께 사용할 수 없습니다.");
    }

    if (this._def.top !== undefined) {
      throw new Error("INSERT 와 TOP 를 함께 사용할 수 없습니다.");
    }

    if (this._def.orderBy !== undefined) {
      throw new Error("INSERT 와 ORDER BY 를 함께 사용할 수 없습니다.");
    }

    if (this._def.limit !== undefined) {
      throw new Error("INSERT 와 LIMIT 를 함께 사용할 수 없습니다.");
    }

    if (this._def.groupBy !== undefined) {
      throw new Error("INSERT 와 GROUP BY 를 함께 사용할 수 없습니다.");
    }

    if (this._def.having !== undefined) {
      throw new Error("INSERT 와 HAVING 를 함께 사용할 수 없습니다.");
    }

    const record = {};
    for (const key of Object.keys(obj)) {
      record[`[${key}]`] = QueryUtils.getQueryValue(obj[key]);
    }

    return {
      from: this._def.from,
      output: ["INSERTED.*"],
      record
    };
  }

  public getUpdateDef(arg: UpdateObject<T> | ((entity: TEntity<T>) => UpdateObject<T>)): IUpdateQueryDef {
    if (typeof this._def.from !== "string") {
      throw new Error("UPDATE 할 TABLE 을 정확히 지정해야 합니다.");
    }

    if (this._isCustomEntity) {
      throw new Error("UPDATE 와 SELECT 를 함께 사용할 수 없습니다.");
    }

    if (this._def.orderBy !== undefined) {
      throw new Error("UPDATE 와 ORDER BY 를 함께 사용할 수 없습니다.");
    }

    if (this._def.limit !== undefined) {
      throw new Error("UPDATE 와 LIMIT 를 함께 사용할 수 없습니다.");
    }

    if (this._def.groupBy !== undefined) {
      throw new Error("UPDATE 와 GROUP BY 를 함께 사용할 수 없습니다.");
    }

    if (this._def.having !== undefined) {
      throw new Error("UPDATE 와 HAVING 를 함께 사용할 수 없습니다.");
    }

    const recordEntity = typeof arg === "function" ? arg(this._entity) : arg;
    const record = {};
    for (const key of Object.keys(recordEntity)) {
      record[`[${key}]`] = QueryUtils.getQueryValue(recordEntity[key]);
    }

    return ObjectUtils.clearUndefined({
      top: this._def.top,
      from: this._def.from,
      record,
      output: ["INSERTED.*"],
      as: `[TBL${this._as !== undefined ? `.${this._as}` : ""}]`,
      join: this._def.join,
      where: this._def.where
    });
  }

  public getUpsertDef(updateObjOrFwd: UpdateObject<T> | ((entity: TEntity<T>) => UpdateObject<T>), insertObj?: InsertObject<T>): IUpsertQueryDef {
    if (this._def.join !== undefined) {
      throw new Error("INSERT 와 JOIN 를 함께 사용할 수 없습니다.");
    }

    if (typeof this._def.from !== "string") {
      throw new Error("INSERT 할 TABLE 을 정확히 지정해야 합니다.");
    }

    if (this._isCustomEntity) {
      throw new Error("INSERT 와 SELECT 를 함께 사용할 수 없습니다.");
    }

    if (this._def.distinct !== undefined) {
      throw new Error("INSERT 와 DISTINCT 를 함께 사용할 수 없습니다.");
    }

    if (this._def.top !== undefined) {
      throw new Error("INSERT 와 TOP 를 함께 사용할 수 없습니다.");
    }

    if (this._def.orderBy !== undefined) {
      throw new Error("INSERT 와 ORDER BY 를 함께 사용할 수 없습니다.");
    }

    if (this._def.limit !== undefined) {
      throw new Error("INSERT 와 LIMIT 를 함께 사용할 수 없습니다.");
    }

    if (this._def.groupBy !== undefined) {
      throw new Error("INSERT 와 GROUP BY 를 함께 사용할 수 없습니다.");
    }

    if (this._def.having !== undefined) {
      throw new Error("INSERT 와 HAVING 를 함께 사용할 수 없습니다.");
    }

    if (this._def.where === undefined || this._def.where.length < 1) {
      throw new Error("UPSERT 시, WHERE 를 반드시 사용해야 합니다.");
    }

    const updateRecordEntity = typeof updateObjOrFwd === "function" ? updateObjOrFwd(this._entity) : updateObjOrFwd;
    const updateRecord = {};
    for (const key of Object.keys(updateRecordEntity)) {
      updateRecord[`[${key}]`] = QueryUtils.getQueryValue(updateRecordEntity[key]);
    }

    let insertRecord = {};
    if (insertObj) {
      for (const key of Object.keys(insertObj)) {
        insertRecord[`[${key}]`] = QueryUtils.getQueryValue(insertObj[key]);
      }
    }
    else {
      insertRecord = ObjectUtils.clone(updateRecord);
    }

    return ObjectUtils.clearUndefined({
      from: this._def.from,
      as: `[TBL${this._as !== undefined ? `.${this._as}` : ""}]`,
      where: this._def.where,
      updateRecord,
      insertRecord,
      output: ["INSERTED.*"]
    });
  }

  public getDeleteDef(): IDeleteQueryDef {
    if (typeof this._def.from !== "string") {
      throw new Error("INSERT 할 TABLE 을 정확히 지정해야 합니다.");
    }

    if (this._isCustomEntity) {
      throw new Error("INSERT 와 SELECT 를 함께 사용할 수 없습니다.");
    }

    if (this._def.distinct !== undefined) {
      throw new Error("INSERT 와 DISTINCT 를 함께 사용할 수 없습니다.");
    }

    if (this._def.orderBy !== undefined) {
      throw new Error("INSERT 와 ORDER BY 를 함께 사용할 수 없습니다.");
    }

    if (this._def.limit !== undefined) {
      throw new Error("INSERT 와 LIMIT 를 함께 사용할 수 없습니다.");
    }

    if (this._def.groupBy !== undefined) {
      throw new Error("INSERT 와 GROUP BY 를 함께 사용할 수 없습니다.");
    }

    if (this._def.having !== undefined) {
      throw new Error("INSERT 와 HAVING 를 함께 사용할 수 없습니다.");
    }

    return ObjectUtils.clearUndefined({
      top: this._def.top,
      from: this._def.from,
      output: ["DELETED.*"],
      as: `[TBL${this._as !== undefined ? `.${this._as}` : ""}]`,
      join: this._def.join,
      where: this._def.where
    });
  }

  public async resultAsync(): Promise<T[]> {
    if (!this._db) {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }

    const def = this.getSelectDef();

    const cacheKey = JsonConvert.stringify(def)!;

    if (DbContext.selectCache.has(cacheKey)) {
      try {
        await Wait.true(() => DbContext.selectCache.get(cacheKey) !== undefined, undefined, 30000);
        const cacheValue = DbContext.selectCache.get(cacheKey)!;

        clearTimeout(cacheValue.timeout);
        cacheValue.timeout = setTimeout(() => {
          DbContext.selectCache.delete(cacheKey);
        }, 1000);

        return cacheValue.result;
      }
      catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    }
    DbContext.selectCache.set(cacheKey, undefined);

    const results = await this._db.executeDefsAsync([{type: "select", ...def}], [this._getParseOption()]);

    const timeout = setTimeout(() => {
      DbContext.selectCache.delete(cacheKey);
    }, 1000);
    DbContext.selectCache.set(cacheKey, {result: results[0] ?? [], timeout});

    return results[0];
  }

  public async singleAsync(): Promise<T | undefined> {
    const result = await this.resultAsync();
    if (result.length > 1) {
      throw new Error("복수의 쿼리결과가 있습니다.");
    }

    return result[0];
  }

  public async countAsync(): Promise<number> {
    if (this._def.distinct) {
      throw new Error("distinct 이후엔 'countAsync'를 사용할 수 없습니다." +
        " 사용하려면 distinct와 countAsync 사이에 wrap을 먼저 사용하거나," +
        " distinct대신 groupBy와 sorm.count 로 수동으로 처리하세요.");
    }

    const queryable = this.select(() => ({cnt: new QueryUnit(Number, "COUNT(*)")}));
    queryable._def.orderBy?.remove(item1 => item1[0] === "[__searchOrder]");
    delete queryable._entity["__searchOrder"];
    const item = await queryable.singleAsync();

    return (item?.cnt ?? 0) as any;
  }

  public async insertAsync(...records: InsertObject<T>[]): Promise<T[]> {
    if (!this._db) {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }
    DbContext.selectCache.clear();

    if (!this._tableDef) {
      throw new Error("'Wrapping'된 이후에는 테이블의 정보를 가져올 수 없습니다.");
    }

    const aiColNames = this._tableDef.columns.filter(item => item.autoIncrement).map(item => item.name);
    const hasAutoIncreaseColumnValue = Object.keys(records[0]).some(item => aiColNames.includes(item));

    const queryDefs = records.map(record => this.getInsertDef(record));
    const parseOption = this._getParseOption();

    if (hasAutoIncreaseColumnValue) {
      return (
        await this._db.executeDefsAsync([
          {
            type: "configIdentityInsert",
            ...{
              table: {
                database: this._tableDef.database ?? this._db.schema.database,
                schema: this._tableDef.schema ?? this._db.schema.schema,
                name: this._tableDef.name
              },
              state: "on"
            } as IConfigIdentityInsertQueryDef
          },
          ...queryDefs.map(queryDef => ({
            type: "insert" as const,
            ...queryDef
          })),
          {
            type: "configIdentityInsert",
            ...{
              table: {
                database: this._tableDef.database ?? this._db.schema.database,
                schema: this._tableDef.schema ?? this._db.schema.schema,
                name: this._tableDef.name
              },
              state: "off"
            } as IConfigIdentityInsertQueryDef
          }
        ], [undefined, parseOption, undefined])
      )[1];
    }

    return (
      await this._db.executeDefsAsync(queryDefs.map(queryDef => ({
        type: "insert" as const,
        ...queryDef
      })), [parseOption])
    )[0];
  }

  public insertPrepare(...records: InsertObject<T>[]): void {
    if (records.length < 1) {
      return;
    }

    if (!this._db) {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }

    if (!this._tableDef) {
      throw new Error("'Wrapping'된 이후에는 테이블의 정보를 가져올 수 없습니다.");
    }

    const aiColNames = this._tableDef.columns.filter(item => item.autoIncrement).map(item => item.name);
    const hasAutoIncreaseColumnValue = Object.keys(records[0]).some(item => aiColNames.includes(item));

    const queryDefs = records.map(record => this.getInsertDef(record));
    const parseOption = this._getParseOption();
    if (hasAutoIncreaseColumnValue) {
      this._db.prepareDefs.push(...[
        {
          def: {
            type: "configIdentityInsert" as const,
            ...{
              table: {
                database: this._tableDef.database ?? this._db.schema.database,
                schema: this._tableDef.schema ?? this._db.schema.schema,
                name: this._tableDef.name
              },
              state: "on"
            } as IConfigIdentityInsertQueryDef
          },
          option: undefined,
          isRealResult: false
        },
        ...queryDefs.map(queryDef => ({
          def: {
            type: "insert" as const,
            ...queryDef
          },
          option: parseOption,
          isRealResult: true
        })),
        {
          def: {
            type: "configIdentityInsert" as const,
            ...{
              table: {
                database: this._tableDef.database ?? this._db.schema.database,
                schema: this._tableDef.schema ?? this._db.schema.schema,
                name: this._tableDef.name
              },
              state: "off"
            } as IConfigIdentityInsertQueryDef
          },
          option: undefined,
          isRealResult: false
        }
      ]);
    }
    else {
      this._db.prepareDefs.push(...queryDefs.map(queryDef => ({
        def: {
          type: "insert" as const,
          ...queryDef
        },
        option: parseOption,
        isRealResult: true
      })));
    }
  }

  public async updateAsync(arg: UpdateObject<T> | ((entity: TEntity<T>) => UpdateObject<T>)): Promise<T[]> {
    if (!this._db) {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }
    if (!this._tableDef) {
      throw new Error("'Wrapping'된 이후에는 편집 쿼리를 실행할 수 없습니다.");
    }
    DbContext.selectCache.clear();

    const queryDef = this.getUpdateDef(arg);
    const parseOption = this._getParseOption();

    return (await this._db.executeDefsAsync([{type: "update", ...queryDef}], [{
      columns: parseOption.columns
    }]))[0];
  }

  public updatePrepare(arg: UpdateObject<T> | ((entity: TEntity<T>) => UpdateObject<T>)): void {
    if (!this._db) {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }
    if (!this._tableDef) {
      throw new Error("'Wrapping'된 이후에는 편집 쿼리를 실행할 수 없습니다.");
    }

    const queryDef = this.getUpdateDef(arg);
    const parseOption = this._getParseOption();

    this._db.prepareDefs.push({
      def: {
        type: "update",
        ...queryDef
      },
      option: {
        columns: parseOption.columns
      },
      isRealResult: true
    });
  }

  public async deleteAsync(): Promise<T[]> {
    if (!this._db) {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }
    if (!this._tableDef) {
      throw new Error("'Wrapping'된 이후에는 편집 쿼리를 실행할 수 없습니다.");
    }
    DbContext.selectCache.clear();

    const queryDef = this.getDeleteDef();
    const parseOption = this._getParseOption();

    return (await this._db.executeDefsAsync([{type: "delete", ...queryDef}], [{
      columns: parseOption.columns
    }]))[0];
  }

  public deletePrepare(): void {
    if (!this._db) {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }
    if (!this._tableDef) {
      throw new Error("'Wrapping'된 이후에는 편집 쿼리를 실행할 수 없습니다.");
    }
    const queryDef = this.getDeleteDef();
    const parseOption = this._getParseOption();
    this._db.prepareDefs.push({
      def: {type: "delete", ...queryDef},
      option: {
        columns: parseOption.columns
      },
      isRealResult: true
    });
  }

  public async upsertAsync(updateObjOrFwd: UpdateObject<T> | ((entity: TEntity<T>) => UpdateObject<T>), insertObj?: InsertObject<T>): Promise<T[]> {
    if (!this._db) {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }
    if (!this._tableDef) {
      throw new Error("'Wrapping'된 이후에는 편집 쿼리를 실행할 수 없습니다.");
    }
    DbContext.selectCache.clear();

    const queryDef = this.getUpsertDef(updateObjOrFwd, insertObj);
    const parseOption = this._getParseOption();

    return (await this._db.executeDefsAsync([{type: "upsert", ...queryDef}], [{
      columns: parseOption.columns
    }]))[0];
  }

  public upsertPrepare(updateObjOrFwd: UpdateObject<T> | ((entity: TEntity<T>) => UpdateObject<T>), insertObj?: InsertObject<T>): void {
    if (!this._db) {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }
    if (!this._tableDef) {
      throw new Error("'Wrapping'된 이후에는 편집 쿼리를 실행할 수 없습니다.");
    }

    const queryDef = this.getUpsertDef(updateObjOrFwd, insertObj);
    const parseOption = this._getParseOption();

    this._db.prepareDefs.push({
      def: {type: "upsert", ...queryDef},
      option: {
        columns: parseOption.columns
      },
      isRealResult: true
    });
  }

  private _getParseOption(): IQueryResultParseOption {
    const result: IQueryResultParseOption = {
      columns: {},
      joins: {}
    };

    const configuration = (entity: TEntity<any>, parentKeys: string[]): void => {
      for (const key of Object.keys(ObjectUtils.clearUndefined(entity))) {
        try {
          if (entity[key] && QueryUtils.canGetQueryValue(entity[key])) {
            result.columns![parentKeys.concat([key]).join(".")] = {dataType: QueryUtils.getQueryValueType(entity[key])!.name};
          }
          else if (entity[key] instanceof Array) {
            result.joins![parentKeys.concat([key]).join(".")] = {isSingle: false};
            configuration(entity[key][0], parentKeys.concat([key]));
          }
          else {
            result.joins![parentKeys.concat([key]).join(".")] = {isSingle: true};
            configuration(entity[key] as TEntity<any>, parentKeys.concat([key]));
          }
        }
        catch (err) {
          err.message += `\n==> [${key}]`;
          throw err;
        }
      }
    };
    configuration(this._entity, []);

    return result;
  }


  private _setEntityChainValue(obj: any, chain: string, value: any): void {
    const split = chain.split(".");
    let curr = obj;
    for (const splitItem of split.slice(0, -1)) {
      if (curr[splitItem] instanceof Array) {
        curr = curr[splitItem][0];
      }
      else {
        curr = curr[splitItem];
      }
    }

    const last = split.last();
    if (last === undefined) {
      throw new NeverEntryError();
    }

    curr[last] = value;
  }

  public _getEntityChainValue(obj: any, chain: string, optional?: boolean): any {
    if (chain === "") return obj;
    const split = chain.split(".");
    let result = obj;
    for (const splitItem of split) {
      if (optional && result === undefined) {
        result = undefined;
      }
      else {
        result = result[splitItem];
      }
      if (result instanceof Array) {
        result = result[0];
      }
    }
    return result;
  }
}

export interface IQueryableDef {
  from: string | ISelectQueryDef | ISelectQueryDef[];
  where?: TQueryValueOrSelectArray;
  distinct?: true;
  top?: number;
  orderBy?: [TQueryValueOrSelect | TQueryValueOrSelectArray, "ASC" | "DESC"][];
  limit?: [number, number];
  groupBy?: (TQueryValueOrSelect | TQueryValueOrSelectArray)[];
  having?: TQueryValueOrSelectArray;
  join?: (IJoinQueryDef & { isSingle: boolean })[];
}

type NonTQueryValuePropertyNames<T> = { [K in keyof T]: T[K] extends TQueryValue ? never : K }[keyof T];
type UpdateObject<T> = Partial<Omit<{ [K in keyof T]: T[K] extends TQueryValue ? (T[K] | QueryUnit<TQueryValueTypeWrap<T[K]>, any>) : never }, NonTQueryValuePropertyNames<T>>>;

type NullablePropertyNames<T> = { [K in keyof T]: undefined extends T[K] ? K : never }[keyof T];
type InsertObject<T> =
  Omit<{ [K in keyof T]: T[K] extends TQueryValue ? (T[K] | QueryUnit<TQueryValueTypeWrap<T[K]>, any>) : T[K] }, NullablePropertyNames<T> | NonTQueryValuePropertyNames<T>>
  &
  Pick<{ [K in keyof T]?: T[K] extends TQueryValue ? (T[K] | QueryUnit<TQueryValueTypeWrap<T[K]>, any>) : T[K] }, NullablePropertyNames<T> | NonTQueryValuePropertyNames<T>>;
