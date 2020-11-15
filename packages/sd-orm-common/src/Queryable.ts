import { DbContext } from "./DbContext";
import {
  FunctionUtils,
  JsonConvert,
  NeverEntryError,
  NotImplementError,
  ObjectUtils,
  Type,
  Wait
} from "@simplysm/sd-core-common";
import {
  IDeleteQueryDef,
  IInsertQueryDef,
  IJoinQueryDef,
  IQueryableDef,
  IQueryResultParseOption,
  ISelectQueryDef,
  ITableDef,
  IUpdateQueryDef,
  IUpsertQueryDef,
  TEntity, TEntityUnwrap,
  TEntityValue,
  TEntityValueOrQueryableOrArray,
  TInsertObject,
  TQueryBuilderValue,
  TQueryDef,
  TQueryValue,
  TUpdateObject
} from "./commons";
import { DbDefinitionUtils } from "./DbDefinitionUtils";
import { QueryUnit } from "./QueryUnit";
import { SdOrmUtils } from "./SdOrmUtils";

export class Queryable<D extends DbContext, T> {
  public readonly tableType?: Type<T>; // wrapping 사용시, undefined 일 수 있음
  private readonly _as?: string;
  private readonly _tableDef?: ITableDef; // wrapping 사용시, undefined 일 수 있음
  // noinspection TypeScriptFieldCanBeMadeReadonly
  private readonly _entity: TEntity<T>;
  private readonly _isCustomEntity: boolean = false;

  private readonly _def: IQueryableDef;

  public constructor(db: D, cloneQueryable: Queryable<D, T>);
  public constructor(db: D, cloneQueryable: Queryable<D, any>, entity: TEntity<T>);
  public constructor(db: D, tableType: Type<T>, as?: string);
  public constructor(db: D, tableType: Type<T> | undefined, as: string | undefined, entity: TEntity<T>, defs: IQueryableDef);
  public constructor(public readonly db: D, arg1?: Queryable<D, T> | Type<T>, arg2?: string | TEntity<T>, arg3?: TEntity<T>, arg4?: IQueryableDef) {
    // Clone 일때
    if (arg1 instanceof Queryable) {
      this.tableType = arg1.tableType;
      this._as = arg1._as;
      this._tableDef = arg1._tableDef ? ObjectUtils.clone(arg1._tableDef) : undefined;
      this._entity = ObjectUtils.clone(arg1._entity);
      this._def = ObjectUtils.clone(arg1._def);

      if (arg2 !== undefined) {
        this._entity = ObjectUtils.clone(arg2 as TEntity<T>, {
          useRefTypes: [this.db.constructor as Type<any>]
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
      if (tableDef === undefined) {
        throw new Error(`'${this.tableType.name}'에 '@Table()'이 지정되지 않았습니다.`);
      }
      this._tableDef = tableDef;

      // Init Entity
      this._entity = {} as TEntity<T>;

      for (const colDef of this._tableDef.columns) {
        this._entity[colDef.propertyKey] = new QueryUnit(colDef.typeFwd(), `${this.db.qb.wrap(`TBL${this._as !== undefined ? `.${this._as}` : ""}`)}.${this.db.qb.wrap(colDef.name)}`);
      }

      // Init FROM
      this._def = {
        from: this.db.qb.getTableName({
          database: this._tableDef.database ?? this.db.schema.database,
          schema: this._tableDef.schema ?? this.db.schema.schema,
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
        if (tableDef === undefined) {
          throw new Error(`'${this.tableType.name}'에 '@Table()'이 지정되지 않았습니다.`);
        }
        this._tableDef = tableDef;
      }
    }
  }

  public static union<ND extends DbContext, NT>(qrs: Queryable<ND, NT>[], as?: string): Queryable<ND, NT> {
    const db = qrs[0].db;
    const cqrs = qrs.map(item => new Queryable(db, item).wrap().clearOrderBy());

    // Init entity
    const entity = {} as TEntity<NT>;
    for (const entityKey of Object.keys(cqrs[0]._entity)) {
      const entityValue = cqrs[0]._entity[entityKey];
      if (!SdOrmUtils.canConvertToQueryValue(entityValue)) {
        throw new Error("단일계층 이상의 구조를 가진 'queryable' 은 UNION 할 수 없습니다. select 를 통해 단일계층으로 만드세요.");
      }

      entity[entityKey] = new QueryUnit(SdOrmUtils.getQueryValueType(entityValue), `${cqrs[0].db.qb.wrap(`TBL${as !== undefined ? "." + as : ""}`)}.${cqrs[0].db.qb.wrap(entityKey)}`);
    }

    // Init defs.from
    const from = cqrs.map(item => item.getSelectDef());

    return new Queryable(db, undefined, as, entity, { from });
  }

  public select<R>(fwd: (entity: TEntity<T>) => R): Queryable<D, TEntityUnwrap<R>> {
    const newEntity = fwd(this._entity);
    return new Queryable(this.db, this, newEntity) as any;
  }

  public where(predicate: (entity: TEntity<T>) => TEntityValueOrQueryableOrArray<D, any>[]): Queryable<D, T> {
    const result = new Queryable(this.db, this);
    const where = this.db.qh.and(predicate(this._entity));
    result._def.where = result._def.where ? this.db.qh.and([result._def.where, where]) : where;
    return result;
  }

  public distinct(): Queryable<D, T> {
    const result = new Queryable(this.db, this);
    result._def.distinct = true;
    return result;
  }

  public top(count: number): Queryable<D, T> {
    const result = new Queryable(this.db, this);
    result._def.top = count;
    return result;
  }

  // public orderBy(fwd: (entity: TEntity<T>) => TEntityValue<TQueryValue>, desc?: boolean): Queryable<D, T>;
  // public orderBy(chain: string, desc?: boolean): Queryable<D, T>;
  // public orderBy(defs: IQueryableOrderingDef<T>[]): Queryable<D, T>;
  public orderBy(arg1: ((entity: TEntity<T>) => TEntityValue<TQueryValue>) | string, desc?: boolean): Queryable<D, T> {
    // public orderBy(arg1: ((entity: TEntity<T>) => TEntityValue<TQueryValue>) | string | IQueryableOrderingDef<T>[], desc?: boolean): Queryable<D, T> {
    let result = new Queryable(this.db, this);

    let selectedColumn;
    if (typeof arg1 === "function") {
      selectedColumn = arg1(this._entity);
    }
    else /*if (typeof arg1 === "string")*/ {
      const chain = arg1.split(".").slice(0, -1);
      const asChainArr: string[] = [];
      for (const fkName of chain) {
        asChainArr.push(fkName);
        const as = asChainArr.join(".");

        result = result.include(as);
      }

      selectedColumn = this._getEntityChainValue(result._entity, arg1);
    }
    /*else {
      for (const orderingItem of arg1) {
        result = result.orderBy(orderingItem.key, orderingItem.desc);
      }
      return result;
    }*/

    result._def.orderBy = result._def.orderBy ?? [];
    const queryValue = this.db.qh.getQueryValue(selectedColumn);
    if (result._def.orderBy.some(item => item[0] === queryValue)) {
      throw new Error("정렬 기준이 중복 되었습니다: " + queryValue);
    }
    result._def.orderBy.push([queryValue, (desc ? "DESC" : "ASC")]);
    return result;
  }

  public clearOrderBy(): Queryable<D, T> {
    const result = new Queryable(this.db, this);
    delete result._def.orderBy;
    return result;
  }

  public limit(skip: number, take: number): Queryable<D, T> {
    const result = new Queryable(this.db, this);
    result._def.limit = [skip, take];
    return result;
  }

  public pivot<V extends TQueryValue, P extends string>(valueFwd: ((entity: TEntity<T>) => TEntityValue<V>),
                                                        pivotFwd: ((entity: TEntity<T>) => TEntityValue<P>),
                                                        pivotKeys: P[]): Queryable<D, T & Record<P, V>> {
    const valueColumn = valueFwd(this._entity);
    const pivotColumn = pivotFwd(this._entity);

    const entity: any = { ...this._entity };
    for (const pivotKey of pivotKeys) {
      if (valueColumn instanceof QueryUnit) {
        entity[pivotKey] = new QueryUnit<any>(valueColumn.type, `${this.db.qb.wrap(`TBL${this._as !== undefined ? `.${this._as}` : ""}`)}.${this.db.qb.wrap(pivotKey)}`);
      }
      else {
        throw new NotImplementError();
      }
    }

    const result = new Queryable(this.db, this, entity);

    result._def.pivot = {
      valueColumn: this.db.qh.getQueryValue(valueColumn),
      pivotColumn: this.db.qh.getQueryValue(pivotColumn),
      pivotKeys
    };
    return result as any;
  }

  public groupBy(fwd: (entity: TEntity<T>) => TEntityValue<TQueryValue>[]): Queryable<D, T> {
    const result = new Queryable(this.db, this);
    result._def.groupBy = fwd(this._entity).map(item => this.db.qh.getQueryValue(item));

    // if (this._entity["__searchOrder"] !== undefined && this._def.orderBy?.some(item => item[0] === "[__searchOrder]")) {
    //   result._def.orderBy?.remove(item => item[0] === "[__searchOrder]");
    //   delete result._entity["__searchOrder"];
    // }

    return result;
  }

  public having(predicate: (entity: TEntity<T>) => TEntityValueOrQueryableOrArray<D, any>[]): Queryable<D, T> {
    const result = new Queryable(this.db, this);
    result._def.having = result._def.having ?? [];
    result._def.having.push(...this.db.qh.and(predicate(this._entity)));
    return result;
  }

  public join<A extends string, J, R>(joinTypeOrQrs: Type<J> | Queryable<D, J>[], as: A, fwd: (queryable: Queryable<D, J>, entity: TEntity<T>) => Queryable<D, R>): Queryable<D, T & { [K in A]: Partial<R>[] }>;
  public join<A extends string, J, R>(joinTypeOrQrs: Type<J> | Queryable<D, J>[], as: A, fwd: (queryable: Queryable<D, J>, entity: TEntity<T>) => Queryable<D, R>, isSingle: true): Queryable<D, T & { [K in A]: Partial<R> }>;
  public join<A extends string, J, R>(joinTypeOrQrs: Type<J> | Queryable<D, J>[], as: A, fwd: (queryable: Queryable<D, J>, entity: TEntity<T>) => Queryable<D, R>, isSingle?: true): Queryable<D, T & { [K in A]: R | R[] }> {
    if (this._def.join?.some(item => item.as === this.db.qb.wrap(`TBL.${as}`))) {
      return new Queryable(this.db, this) as any;
    }

    let joinTableQueryable: Queryable<D, J>;
    if (joinTypeOrQrs instanceof Array) {
      joinTableQueryable = Queryable.union(joinTypeOrQrs, as);
    }
    else {
      joinTableQueryable = new Queryable(this.db, joinTypeOrQrs, as);
    }
    const joinQueryable = fwd(joinTableQueryable, this._entity);
    const joinEntity = this._getParentEntity(joinQueryable._entity, as, undefined);

    const entity = { ...this._entity };
    this._setEntityChainValue(entity, as, isSingle ? joinEntity : [joinEntity]);

    const result = new Queryable(
      this.db,
      this,
      entity as TEntity<T & { [K in A]: R | R[] }>
    );

    result._def.join = result._def.join ?? [];
    result._def.join.push({
      ...joinQueryable.getSelectDef(),
      isCustomSelect: joinQueryable._isCustomEntity,
      isSingle: isSingle === true
    });

    return result;
  }

  public include(chain: string): Queryable<D, T>;
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

            const whereQuery: TQueryBuilderValue[] = [];
            for (let i = 0; i < fkDef.columnPropertyKeys.length; i++) {
              whereQuery.push(this.db.qh.equal(item[fkTargetTableDef.columns[i].propertyKey], lastEn[fkDef.columnPropertyKeys[i]]));
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

            const whereQuery: TQueryBuilderValue[] = [];
            for (let i = 0; i < fktSourceFkDef.columnPropertyKeys.length; i++) {
              whereQuery.push(this.db.qh.equal(item[fktSourceFkDef.columnPropertyKeys[i]], lastEn[tableDef.columns[i].propertyKey]));
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
    let result: Queryable<D, T> = new Queryable(this.db, this);

    const splitSearchText = searchText.trim().split(" ")
      .map(item => item.trim())
      .filter(item => Boolean(item));

    // WHERE
    result = result
      .where(item => {
        const fieldOrArr = [];

        const fields = fwd(item);
        for (const field of fields) {
          const splitSearchTextWhereArr = [];
          for (const text of splitSearchText) {
            if (text.includes("*")) {
              splitSearchTextWhereArr.push(this.db.qh.like(field as any, text.replace(/\*/g, "%")));
            }
            else {
              splitSearchTextWhereArr.push(this.db.qh.includes(field as any, text));
            }
          }
          fieldOrArr.push(this.db.qh.and(splitSearchTextWhereArr));
        }

        return [this.db.qh.or(fieldOrArr)];
      });

    return result;
  }
  
  /*public search(fwd: (entity: TEntity<T>) => TEntityValue<String | string | undefined>[], searchText: string): Queryable<D, T> {
    let result: Queryable<D, T> = new Queryable(this.db, this);

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
            orArr.push(this.db.qh.includes(field as any, text));
          }
        }

        return [this.db.qh.or(orArr)];
      });

    // SELECT
    result = result.select(item => {
      const fields = fwd(item) as any[];

      // 같은거 포함(999)
      let countQuery = [];
      for (const field of fields) {
        countQuery.push(...[this.db.qh.case<number>(this.db.qh.includes(field, searchText), 10000).else(0), "+"]);
      }

      // 분할 텍스트 각각 모두 포함(888)
      for (const field of fields) {
        const andArr = [];
        for (const text of splitSearchText) {
          andArr.push(this.db.qh.includes(field, text));
        }
        countQuery.push(...[this.db.qh.case<number>(this.db.qh.and(andArr), 100).else(0), "+"]);
      }

      // 분할중 일부만 포함한것(포함갯수)
      for (const field of fields) {
        for (const text of splitSearchText) {
          countQuery.push(...[this.db.qh.case<number>(this.db.qh.includes(field, text), 1).else(0), "+"]);
        }
      }

      countQuery = countQuery.slice(0, -1);

      return {
        ...item,
        __searchOrder: new QueryUnit(Number, countQuery)
      };
    }) as any;

    // ORDER BY
    result = result.orderBy(item => item["__searchOrder"], true);
    return result;
  }*/

  public wrap(): Queryable<D, T>;
  public wrap<R extends Partial<T>>(tableType: Type<R>): Queryable<D, R>;
  public wrap<R extends Partial<T>>(tableType?: Type<R>): Queryable<D, T | R> {
    let clone: Queryable<D, T>;

    if (tableType !== undefined) {
      const cloneEntity: any = {};
      for (const key of Object.keys(this._entity)) {
        const entityValue = this._entity[key];
        if (SdOrmUtils.canConvertToQueryValue(entityValue)) {
          cloneEntity[key] = entityValue;
        }
      }
      clone = new Queryable(this.db, this, cloneEntity);
      clone._def.distinct = true;
    }
    else {
      clone = new Queryable(this.db, this);
    }

    const subFrom = clone.getSelectDef();
    if (subFrom.orderBy) {
      let seq = 0;
      for (const subOrderBy of subFrom.orderBy) {
        seq++;
        subFrom.select["__order_" + seq] = subOrderBy[0];
      }
    }

    const currEntity = this._getParentEntity(clone._entity, this._as, undefined);

    const result = new Queryable<D, T | R>(this.db, tableType, this._as, currEntity, { from: subFrom });

    if (subFrom.orderBy && subFrom.orderBy.length > 0) {
      result._def.orderBy = [];
      let seq = 0;
      for (const subOrderBy of subFrom.orderBy) {
        seq++;
        result._def.orderBy.push(["__order_" + seq, subOrderBy[1]]);
      }

      if (!subFrom.limit) {
        delete subFrom.orderBy;
      }
    }

    return result;
  }

  public getSelectDef(): ISelectQueryDef & { select: { [key: string]: TQueryBuilderValue } } {
    const result: ISelectQueryDef & { select: { [key: string]: TQueryBuilderValue } } = {} as any;

    // FROM 구성
    result.from = this._def.from;

    // AS 구성
    result.as = this.db.qb.wrap(`TBL${this._as !== undefined ? `.${this._as}` : ""}`);

    // SELECT 필드 구성
    result.select = {};

    const addSelectValue = (key: string, value: QueryUnit<any> | TEntity<any> | TEntity<any>[]): void => {
      if (SdOrmUtils.canConvertToQueryValue(value)) {
        if (result.select === undefined) throw new NeverEntryError();
        result.select[`${this.db.qb.wrap(key)}`] = this.db.qh.getQueryValue(value);
      }
      else if (value instanceof Array) {
        if (value.some(item => SdOrmUtils.canConvertToQueryValue(item))) {
          throw new Error("SELECT 에 입력할 수 없는 정보가 입력되었습니다. (qh.equal 등은 qh.is 로 wrapping 해 주어야 사용할 수 있습니다.)");
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
    result.pivot = this._def.pivot;
    result.groupBy = this._def.groupBy;
    result.having = this._def.having;

    if (this._def.join) {
      const joins = ObjectUtils.clone(this._def.join);
      for (const join of joins) {
        // @ts-ignore
        delete join.isSingle;
      }
      result.join = joins;
    }


    if (this._def.having && !(this._def.groupBy && this._def.groupBy.length > 0)) {
      throw new Error("'HAVING'을 사용하려면, 'GROUP BY'를 반드시 설정해야 합니다.");
    }

    if (this._def.limit && this._def.join && this._def.join.some(item => !item.isSingle) && !this._def.groupBy && !this._isCustomEntity) {
      throw new Error("다수의 'RECORD'를 'JOIN'하는 쿼리와 'LIMIT'을 동시에 사용할 수 없습니다. 'LIMIT'을 먼저 사용하고, 'WRAP'한 이후에 'JOIN' 하거나, 'GROUP BY'도 함께 사용하세요.");
    }

    if (this._def.limit && (!this._def.orderBy || this._def.orderBy.length <= 0)) {
      throw new Error("'LIMIT'을 사용하려면, 'ORDER BY'를 반드시 설정해야 합니다.");
    }

    return ObjectUtils.clearUndefined(result);
  }

  private _getParentEntity<P>(fromEntity: TEntity<P>, rootAs: string | undefined, parentAs: string | undefined): TEntity<P> {
    const result: any = {};
    for (const key of Object.keys(fromEntity)) {
      const entityValue: any = fromEntity[key];
      if (SdOrmUtils.canConvertToQueryValue(entityValue)) {
        result[key] = new QueryUnit(SdOrmUtils.getQueryValueType(entityValue), this.db.qb.wrap("TBL" + (rootAs !== undefined ? "." + rootAs : "")) + "." + this.db.qb.wrap((parentAs !== undefined ? `${parentAs}.` : "") + key));
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
  }

  public getInsertDef(obj: TInsertObject<T>): IInsertQueryDef {
    if (typeof this._def.from !== "string") {
      throw new Error("INSERT 할 TABLE 을 정확히 지정해야 합니다.");
    }

    if (this._def.join !== undefined) {
      throw new Error("INSERT 와 JOIN 를 함께 사용할 수 없습니다.");
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
      record[this.db.qb.wrap(key)] = this.db.qh.getQueryValue(obj[key]);
    }

    return {
      from: this._def.from,
      output: ["*"],
      record
    };
  }

  public getUpdateDef(arg: TUpdateObject<T> | ((entity: TEntity<T>) => TUpdateObject<T>)): IUpdateQueryDef {
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
      record[this.db.qb.wrap(`${key}`)] = this.db.qh.getQueryValue(recordEntity[key]);
    }

    let joinDefs: IJoinQueryDef[] | undefined;
    if (this._def.join) {
      const joins = ObjectUtils.clone(this._def.join);
      for (const join of joins) {
        delete (join as any).isSingle;
      }
      joinDefs = joins;
    }

    return ObjectUtils.clearUndefined({
      top: this._def.top,
      from: this._def.from,
      record,
      output: ["*"],
      as: this.db.qb.wrap(`TBL${this._as !== undefined ? `.${this._as}` : ""}`),
      join: joinDefs,
      where: this._def.where
    });
  }

  public getUpsertDef(updateObjOrFwd: TUpdateObject<T> | ((entity: TEntity<T>) => TUpdateObject<T>), insertObj?: TInsertObject<T>): IUpsertQueryDef {
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
      updateRecord[this.db.qb.wrap(`${key}`)] = this.db.qh.getQueryValue(updateRecordEntity[key]);
    }

    let insertRecord = {};
    if (insertObj) {
      for (const key of Object.keys(insertObj)) {
        insertRecord[this.db.qb.wrap(`${key}`)] = this.db.qh.getQueryValue(insertObj[key]);
      }
    }
    else {
      insertRecord = ObjectUtils.clone(updateRecord);
    }

    return ObjectUtils.clearUndefined({
      from: this._def.from,
      as: this.db.qb.wrap(`TBL${this._as !== undefined ? `.${this._as}` : ""}`),
      where: this._def.where,
      updateRecord,
      insertRecord,
      output: ["*"]
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

    let joinDefs: IJoinQueryDef[] | undefined;
    if (this._def.join) {
      const joins = ObjectUtils.clone(this._def.join);
      for (const join of joins) {
        delete (join as any).isSingle;
      }
      joinDefs = joins;
    }

    return ObjectUtils.clearUndefined({
      top: this._def.top,
      from: this._def.from,
      output: ["*"],
      as: this.db.qb.wrap(`TBL${this._as !== undefined ? `.${this._as}` : ""}`),
      join: joinDefs,
      where: this._def.where
    });
  }

  public async resultAsync(): Promise<T[]> {
    if (this.db === undefined) {
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

    const results = await this.db.executeDefsAsync([{ type: "select", ...def }], [this._getParseOption()]);

    const timeout = setTimeout(() => {
      DbContext.selectCache.delete(cacheKey);
    }, 1000);
    DbContext.selectCache.set(cacheKey, { result: results[0] ?? [], timeout });

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
        " distinct대신 groupBy와 qh.count 로 수동으로 처리하세요.");
    }

    const queryable = this.select(() => ({ cnt: new QueryUnit(Number, "COUNT(*)") }));
    delete queryable._def.orderBy;
    // delete queryable._entity["__searchOrder"];
    const item = await queryable.singleAsync();

    return (item?.cnt ?? 0) as any;
  }

  public async bulkInsertAsync(...records: TInsertObject<T>[]): Promise<void> {
    if (this.db === undefined) {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }
    DbContext.selectCache.clear();

    if (!this._tableDef) {
      throw new Error("'Wrapping'된 이후에는 테이블의 정보를 가져올 수 없습니다.");
    }

    const columnDefs = this._tableDef.columns.map(col => ({
      name: col.name,
      dataType: this.db.qh.type(col.dataType ?? col.typeFwd()),
      autoIncrement: col.autoIncrement,
      nullable: col.nullable
    }));


    await this.db.bulkInsertAsync(this.db.qb.getTableName({
      database: this._tableDef.database ?? this.db.schema.database,
      schema: this._tableDef.schema ?? this.db.schema.schema,
      name: this._tableDef.name
    }), columnDefs, ...records.map(item => {
      const result = {};
      for (const key of Object.keys(item)) {
        result[key] = this.db.qh.getBulkInsertQueryValue(item[key]);
      }
      return result;
    }));
  }

  public async insertAsync(...records: TInsertObject<T>[]): Promise<T[]> {
    return await this._insertAsync(false, ...records);
  }

  public async insertWithoutFkCheckAsync(...records: TInsertObject<T>[]): Promise<T[]> {
    return await this._insertAsync(true, ...records);
  }

  private async _insertAsync(ignoreFk: boolean, ...records: TInsertObject<T>[]): Promise<T[]> {
    if (this.db === undefined) {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }
    DbContext.selectCache.clear();

    if (!this._tableDef) {
      throw new Error("'Wrapping'된 이후에는 테이블의 정보를 가져올 수 없습니다.");
    }

    const queryDefs = records.map(record => this.getInsertDef(record));
    const parseOption = this._getParseOption();

    if (this.db.dialect === "mysql") {
      const aiColNames = this._tableDef.columns.filter(item => item.autoIncrement).map(item => item.name);
      if (aiColNames.length > 1) {
        throw new Error("하나의 테이블에 AI 컬럼이 2개 이상일 수 없습니다.");
      }

      const prepareDefs: TQueryDef[] = queryDefs
        .mapMany(queryDef => {
          const insertDef: TQueryDef = {
            type: "insert" as const,
            ...queryDef
          };

          const selectDef: TQueryDef = {
            type: "select",
            select: {
              [this.db.qb.wrap("id")]:
                aiColNames.length === 1 && !Object.keys(queryDef.record).includes(this.db.qb.wrap(aiColNames[0])) ?
                  "LAST_INSERT_ID()" :
                  "0"
            }
          };

          return [
            insertDef,
            selectDef
          ].filterExists();
        });

      if (ignoreFk) {
        prepareDefs.insert(0, {
          type: "configForeignKeyCheck",
          useCheck: false
        });

        prepareDefs.push({
          type: "configForeignKeyCheck",
          useCheck: true
        });
      }

      const insertIds = (
        await this.db.executeDefsAsync(prepareDefs)
      ).filter((item, i) => prepareDefs[i].type === "select").map(item => item[0].id);

      return ObjectUtils.clone(records).map((item, i) => ({
        ...item,
        [aiColNames[0]]: insertIds[i] === 0 ? item[aiColNames[0]] : insertIds[i]
      })) as any;
    }
    else {
      if (ignoreFk) {
        throw new NotImplementError("mssql 에 대한 IGNORE FK 가 아직 구현되어있지 않습니다.");
      }

      const aiColNames = this._tableDef.columns.filter(item => item.autoIncrement).map(item => item.name);
      const hasAutoIncreaseColumnValue = Object.keys(records[0]).some(item => aiColNames.includes(item));

      if (hasAutoIncreaseColumnValue) {
        return (
          await this.db.executeDefsAsync([
            {
              type: "configIdentityInsert",
              ...{
                table: {
                  database: this._tableDef.database ?? this.db.schema.database,
                  schema: this._tableDef.schema ?? this.db.schema.schema,
                  name: this._tableDef.name
                },
                state: "on"
              }
            },
            ...queryDefs.map(queryDef => ({
              type: "insert" as const,
              ...queryDef
            })),
            {
              type: "configIdentityInsert",
              ...{
                table: {
                  database: this._tableDef.database ?? this.db.schema.database,
                  schema: this._tableDef.schema ?? this.db.schema.schema,
                  name: this._tableDef.name
                },
                state: "off"
              }
            }
          ], [undefined, ...queryDefs.map(() => parseOption), undefined])
        ).slice(1, -1).map(item => item[0]);
      }

      return (await this.db.executeDefsAsync(
        queryDefs.map(queryDef => ({
          type: "insert" as const,
          ...queryDef
        })),
        queryDefs.map(() => parseOption)
      )).map(item => item[0]);
    }
  }

  public insertPrepare(...records: TInsertObject<T>[]): void {
    this._insertPrepare(false, ...records);
  }

  public insertWithoutFkCheckPrepare(...records: TInsertObject<T>[]): void {
    this._insertPrepare(true, ...records);
  }

  private _insertPrepare(ignoreFk: boolean, ...records: TInsertObject<T>[]): void {
    if (records.length < 1) {
      return;
    }

    if (this.db === undefined) {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }

    if (!this._tableDef) {
      throw new Error("'Wrapping'된 이후에는 테이블의 정보를 가져올 수 없습니다.");
    }

    const queryDefs = records.map(record => this.getInsertDef(record));

    if (this.db.dialect === "mysql") {
      this.db.prepareDefs.push(...[
        ignoreFk ? {
          type: "configForeignKeyCheck" as const,
          useCheck: false
        } : undefined,
        ...queryDefs
          .map(queryDef => ({
            type: "insert" as const,
            ...queryDef
          })),
        ignoreFk ? {
          type: "configForeignKeyCheck" as const,
          useCheck: true
        } : undefined
      ].filterExists());
    }
    else {
      if (ignoreFk) {
        throw new NotImplementError("mssql 에 대한 IGNORE FK 가 아직 구현되어있지 않습니다.");
      }

      const aiColNames = this._tableDef.columns.filter(item => item.autoIncrement).map(item => item.name);
      const hasAutoIncreaseColumnValue = Object.keys(records[0]).some(item => aiColNames.includes(item));
      if (hasAutoIncreaseColumnValue) {
        this.db.prepareDefs.push(...[
          {
            type: "configIdentityInsert" as const,
            ...{
              table: {
                database: this._tableDef.database ?? this.db.schema.database,
                schema: this._tableDef.schema ?? this.db.schema.schema,
                name: this._tableDef.name
              },
              state: "on" as const
            }
          },
          ...queryDefs.map(queryDef => ({
            type: "insert" as const,
            ...queryDef
          })),
          {
            type: "configIdentityInsert" as const,
            ...{
              table: {
                database: this._tableDef.database ?? this.db.schema.database,
                schema: this._tableDef.schema ?? this.db.schema.schema,
                name: this._tableDef.name
              },
              state: "off" as const
            }
          }
        ]);
      }
      else {
        this.db.prepareDefs.push(
          ...queryDefs.map(queryDef => ({
            type: "insert" as const,
            ...queryDef
          }))
        );
      }
    }
  }

  public async updateAsync(arg: TUpdateObject<T> | ((entity: TEntity<T>) => TUpdateObject<T>)): Promise<T[]> {
    if (this.db === undefined) {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }
    if (!this._tableDef) {
      throw new Error("'Wrapping'된 이후에는 편집 쿼리를 실행할 수 없습니다.");
    }
    DbContext.selectCache.clear();

    const queryDef = this.getUpdateDef(arg);
    const parseOption = this._getParseOption();

    if (this.db.dialect === "mysql") {
      let newEntity = {} as TEntity<T>;

      for (const colDef of this._tableDef.columns) {
        newEntity[colDef.propertyKey] = new QueryUnit(colDef.typeFwd(), `${this.db.qb.wrap(`TBL${this._as !== undefined ? `.${this._as}` : ""}`)}.${this.db.qb.wrap(colDef.name)}`);
      }

      newEntity = {
        ...newEntity,
        ...(typeof arg === "function" ? arg(this._entity) : arg)
      };

      const clone: Queryable<D, T> = new Queryable(this.db, this, newEntity);

      return (
        await this.db.executeDefsAsync(
          [
            {
              type: "select",
              ...clone.getSelectDef()
            },
            { type: "update", ...queryDef }
          ],
          [{ columns: parseOption.columns }, undefined]
        )
      )[0];
    }
    else {
      return (
        await this.db.executeDefsAsync(
          [{ type: "update", ...queryDef }],
          [{ columns: parseOption.columns }]
        )
      )[0];
    }
  }

  public updatePrepare(arg: TUpdateObject<T> | ((entity: TEntity<T>) => TUpdateObject<T>)): void {
    if (this.db === undefined) {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }
    if (!this._tableDef) {
      throw new Error("'Wrapping'된 이후에는 편집 쿼리를 실행할 수 없습니다.");
    }

    const queryDef = this.getUpdateDef(arg);

    this.db.prepareDefs.push({
      type: "update" as const,
      ...queryDef
    });
  }

  public async deleteAsync(): Promise<T[]> {
    if (this.db === undefined) {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }
    if (!this._tableDef) {
      throw new Error("'Wrapping'된 이후에는 편집 쿼리를 실행할 수 없습니다.");
    }
    DbContext.selectCache.clear();

    const queryDef = this.getDeleteDef();
    const parseOption = this._getParseOption();

    if (this.db.dialect === "mysql") {
      const newEntity = {} as TEntity<T>;

      for (const colDef of this._tableDef.columns) {
        newEntity[colDef.propertyKey] = new QueryUnit(colDef.typeFwd(), `${this.db.qb.wrap(`TBL${this._as !== undefined ? `.${this._as}` : ""}`)}.${this.db.qb.wrap(colDef.name)}`);
      }

      const clone: Queryable<D, T> = new Queryable(this.db, this, newEntity);

      return (await this.db.executeDefsAsync(
        [
          { type: "select", ...clone.getSelectDef() },
          { type: "delete", ...queryDef }
        ],
        [{ columns: parseOption.columns }]
      ))[0];
    }
    else {
      return (await this.db.executeDefsAsync(
        [
          { type: "delete", ...queryDef }
        ],
        [{ columns: parseOption.columns }]
      ))[0];
    }
  }

  public deletePrepare(): void {
    if (this.db === undefined) {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }
    if (!this._tableDef) {
      throw new Error("'Wrapping'된 이후에는 편집 쿼리를 실행할 수 없습니다.");
    }
    const queryDef = this.getDeleteDef();
    this.db.prepareDefs.push({ type: "delete", ...queryDef });
  }

  public async upsertAsync(updateObjOrFwd: TUpdateObject<T> | ((entity: TEntity<T>) => TUpdateObject<T>), insertObj?: TInsertObject<T>): Promise<T[]> {
    if (this.db === undefined) {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }
    if (!this._tableDef) {
      throw new Error("'Wrapping'된 이후에는 편집 쿼리를 실행할 수 없습니다.");
    }
    DbContext.selectCache.clear();

    const queryDef = this.getUpsertDef(updateObjOrFwd, insertObj);
    const parseOption = this._getParseOption();

    if (this.db.dialect === "mysql") {
      let newEntity = {} as TEntity<T>;

      for (const colDef of this._tableDef.columns) {
        newEntity[colDef.propertyKey] = new QueryUnit(colDef.typeFwd(), `${this.db.qb.wrap(`TBL${this._as !== undefined ? `.${this._as}` : ""}`)}.${this.db.qb.wrap(colDef.name)}`);
      }

      newEntity = {
        ...newEntity,
        ...(typeof updateObjOrFwd === "function" ? updateObjOrFwd(this._entity) : updateObjOrFwd)
      };

      const clone: Queryable<D, T> = new Queryable(this.db, this, newEntity);

      const aiColNames = this._tableDef.columns.filter(item => item.autoIncrement).map(item => item.name);

      const insertRecord = insertObj ?? (typeof updateObjOrFwd === "function" ? updateObjOrFwd(this._entity) : updateObjOrFwd);

      const result = (
        await this.db.executeDefsAsync(
          [
            {
              type: "select",
              ...clone.getSelectDef()
            },
            { type: "upsert", ...queryDef },
            {
              type: "select",
              select: {
                [this.db.qb.wrap("id")]:
                  aiColNames.length === 1 && !Object.keys(insertRecord).includes(aiColNames[0]) ?
                    "LAST_INSERT_ID()" :
                    "0"
              }
            }
          ],
          [{ columns: parseOption.columns }, undefined, undefined]
        )
      );

      if (result[0].length > 0) {
        return result[0];
      }

      if (result[2][0] !== undefined) {
        return [
          {
            ...insertRecord,
            [aiColNames[0]]: result[2][0].id === 0 ? insertRecord[aiColNames[0]] : result[2][0].id
          } as any
        ];
      }
      else {
        return [insertRecord as any];
      }
    }
    else {
      return (
        await this.db.executeDefsAsync(
          [{ type: "upsert", ...queryDef }],
          [{ columns: parseOption.columns }]
        )
      )[0];
    }
  }

  public upsertPrepare(updateObjOrFwd: TUpdateObject<T> | ((entity: TEntity<T>) => TUpdateObject<T>), insertObj?: TInsertObject<T>): void {
    if (this.db === undefined) {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }
    if (!this._tableDef) {
      throw new Error("'Wrapping'된 이후에는 편집 쿼리를 실행할 수 없습니다.");
    }

    const queryDef = this.getUpsertDef(updateObjOrFwd, insertObj);
    this.db.prepareDefs.push({ type: "upsert", ...queryDef });
  }

  private _getParseOption(): IQueryResultParseOption {
    const result: IQueryResultParseOption = {
      columns: {},
      joins: {}
    };

    const configuration = (entity: TEntity<any>, parentKeys: string[]): void => {
      for (const key of Object.keys(ObjectUtils.clearUndefined(entity))) {
        try {
          if (entity[key] !== undefined && SdOrmUtils.canConvertToQueryValue(entity[key])) {
            result.columns![parentKeys.concat([key]).join(".")] = { dataType: SdOrmUtils.getQueryValueType(entity[key])!.name };
          }
          else if (entity[key] instanceof Array) {
            result.joins![parentKeys.concat([key]).join(".")] = { isSingle: false };
            configuration(entity[key][0], parentKeys.concat([key]));
          }
          else {
            result.joins![parentKeys.concat([key]).join(".")] = { isSingle: true };
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

  private _getEntityChainValue(obj: any, chain: string, optional?: boolean): any {
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