import type { DbContext } from "../../DbContext";
import type { Type, UnwrappedType } from "@simplysm/sd-core-common";
import { FnUtils, NeverEntryError, ObjectUtils } from "@simplysm/sd-core-common";
import type {
  IDeleteQueryDef,
  IInsertIfNotExistsQueryDef,
  IInsertQueryDef,
  IJoinQueryDef,
  IQueryTableNameDef,
  ISelectQueryDef,
  IUpdateQueryDef,
  IUpsertQueryDef,
  TQueryBuilderValue,
  TQueryDef,
} from "../query-builder/types";
import { DbDefUtils } from "../../utils/DbDefUtils";
import { QueryUnit } from "./QueryUnit";
import { SdOrmUtils } from "../../utils/SdOrmUtils";
import type { ITableDef, TQueryValue } from "../../types";
import type {
  IQueryableDef,
  TEntity,
  TEntityUnwrap,
  /*TEntityUnwrap,*/
  TEntityValue,
  TEntityValueOrQueryableOrArray,
  TIncludeEntity,
  TInsertObject,
  TSelectEntity,
  TUpdateObject,
} from "./types";
import type { IQueryResultParseOption } from "../../IDbContextExecutor";

export class Queryable<D extends DbContext, T> {
  T?: T;

  tableType?: Type<T>; // wrapping 사용시, undefined 일 수 있음
  tableDef?: ITableDef; // wrapping 사용시, undefined 일 수 있음
  // hasMultiJoin = false;

  private readonly _as?: string;
  // noinspection TypeScriptFieldCanBeMadeReadonly
  private readonly _entity: TEntity<T>;
  private _isCustomEntity: boolean = false;
  private readonly _def: IQueryableDef;

  constructor(db: D, cloneQueryable: Queryable<D, T>);

  constructor(db: D, cloneQueryable: Queryable<D, any>, entity: TEntity<T>);

  constructor(db: D, tableType: Type<T>, as?: string);

  constructor(
    db: D,
    tableType: Type<T> | undefined,
    as: string | undefined,
    entity: TEntity<T>,
    defs: IQueryableDef,
  );

  constructor(
    readonly db: D,
    arg1?: Queryable<D, T> | Type<T>,
    arg2?: string | TEntity<T>,
    arg3?: TEntity<T>,
    arg4?: IQueryableDef,
  ) {
    // Clone 일때
    if (arg1 instanceof Queryable) {
      this.tableType = arg1.tableType;
      this._as = arg1._as;
      this.tableDef = arg1.tableDef ? ObjectUtils.clone(arg1.tableDef) : undefined;
      this._entity = ObjectUtils.clone(arg1._entity);
      this._def = ObjectUtils.clone(arg1._def);
      // this.#isCustomEntity = arg1.#isCustomEntity;

      if (arg2 !== undefined) {
        this._entity = ObjectUtils.clone(arg2 as TEntity<T>, {
          useRefTypes: [this.db.constructor as Type<any>],
        });
        // console.log("arg2??", arg2);
        // this.#isCustomEntity = true;
        // this.#isCustomEntity = arg1.#isCustomEntity;
      }
    }
    // 일반 생성
    else if (arg3 === undefined) {
      this.tableType = arg1!;
      this._as = arg2 as string | undefined;

      // Init TABLE Definition
      const tableDef = DbDefUtils.getTableDef(this.tableType);
      if (typeof tableDef === "undefined") {
        throw new Error(`'${this.tableType.name}'에 '@Table()'이 지정되지 않았습니다.`);
      }
      this.tableDef = tableDef;

      // Init Entity
      this._entity = {} as TEntity<T>;
      const entityRec = this._entity as Record<string, any>;

      for (const colDef of this.tableDef.columns) {
        entityRec[colDef.propertyKey] = new QueryUnit(
          colDef.typeFwd(),
          `${this.db.qb.wrap(`TBL${this._as !== undefined ? `.${this._as}` : ""}`)}.${this.db.qb.wrap(colDef.name)}`,
        );
      }

      // Init FROM
      this._def = {
        from: this.tableName,
      };
    }
    // tableDef 없이 생성 (wrapping)
    else {
      this._as = arg2 as string;
      this._entity = arg3;
      this._def = arg4!;

      // wrapping인 경우 customEntity 강제
      // this.#isCustomEntity = true;

      if (arg1 !== undefined) {
        this.tableType = arg1;

        // Init TABLE Definition
        const tableDef = DbDefUtils.getTableDef(this.tableType);
        if (typeof tableDef === "undefined") {
          throw new Error(`'${this.tableType.name}'에 '@Table()'이 지정되지 않았습니다.`);
        }
        this.tableDef = tableDef;
      }
    }
  }

  get tableName(): string {
    if (!this.tableDef) throw new NeverEntryError();

    return this.db.qb.getTableName(this.tableNameDef);
  }

  get tableDescription(): string {
    if (!this.tableDef) throw new NeverEntryError();
    return this.tableDef.description;
  }

  get tableNameDef(): IQueryTableNameDef {
    if (!this.tableDef) throw new NeverEntryError();

    return {
      ...(this.db.opt.dialect === "sqlite"
        ? {}
        : {
            database: this.tableDef.database ?? this.db.opt.database,
            schema: this.tableDef.schema ?? this.db.opt.schema,
          }),
      name: this.tableDef.name,
    };
  }

  static union<ND extends DbContext, NT>(qrs: Queryable<ND, NT>[], as?: string): Queryable<ND, NT> {
    const db = qrs[0].db;
    const cqrs = qrs.map((item) => new Queryable<ND, NT>(db, item).wrap().clearOrderBy());

    const getNewEntity = (orgEntity: Record<string, any>): Record<string, any> => {
      const resultEntity: Record<string, any> = {};
      for (const orgEntityKey of Object.keys(orgEntity)) {
        const orgEntityValue = orgEntity[orgEntityKey];
        if (SdOrmUtils.canConvertToQueryValue(orgEntityValue)) {
          resultEntity[orgEntityKey] = new QueryUnit(
            SdOrmUtils.getQueryValueType(orgEntityValue),
            `${cqrs[0].db.qb.wrap(`TBL${as !== undefined ? "." + as : ""}`)}.${cqrs[0].db.qb.wrap(orgEntityKey)}`,
          );
        } else if (orgEntityValue instanceof Array) {
          resultEntity[orgEntityKey] = [getNewEntity(orgEntityValue[0])];
        } else {
          resultEntity[orgEntityKey] = getNewEntity(orgEntityValue);
        }
      }

      return resultEntity;
    };

    const entity = getNewEntity(cqrs[0]._entity) as TEntity<NT>;

    // Init defs.from
    const from = cqrs.map((item) => item.getSelectQueryDef());

    const qr = new Queryable(db, undefined, as, entity, { from });
    qr._isCustomEntity = true;
    return qr;
  }

  lock(): Queryable<D, T> {
    const result = new Queryable(this.db, this);
    result._def.lock = true;
    return result;
  }

  select<A, B extends TEntityUnwrap<A>>(fwd: (entity: TEntity<T>) => A): Queryable<D, B>;
  select<R>(fwd: (entity: TEntity<T>) => TSelectEntity<R>): Queryable<D, R>;
  select(fwd: (entity: TEntity<T>) => any): Queryable<D, any> {
    const newEntity = fwd(this._entity);
    const qr = new Queryable(this.db, this as any, newEntity);
    qr._isCustomEntity = true;
    return qr;
  }

  selectByType<A>(tableType: Type<A>): Queryable<D, A> {
    const tableDef = DbDefUtils.getTableDef(tableType);
    if (typeof tableDef === "undefined") {
      throw new Error(`'${tableType.name}'에 '@Table()'이 지정되지 않았습니다.`);
    }

    const newEntity = {} as TEntity<T>;
    const newEntityRec = newEntity as Record<string, any>;
    const entityRec = this._entity as Record<string, any>;
    for (const colDef of tableDef.columns) {
      newEntityRec[colDef.propertyKey] = entityRec[colDef.propertyKey];
    }

    const qr = new Queryable(this.db, this as any, newEntity);
    qr._isCustomEntity = true;
    return qr as any;
  }

  ofType<A>(): Queryable<D, A> {
    return this as any;
  }

  where(
    predicate: (entity: TEntity<T>) => TEntityValueOrQueryableOrArray<D, any>[],
  ): Queryable<D, T> {
    const result = new Queryable(this.db, this);
    const where = this.db.qh.and(predicate(this._entity));
    result._def.where = result._def.where ? this.db.qh.and([result._def.where, where]) : where;
    return result;
  }

  distinct(): Queryable<D, T> {
    const result = new Queryable(this.db, this);
    result._def.distinct = true;
    return result;
  }

  top(count: number): Queryable<D, T> {
    const result = new Queryable(this.db, this);
    result._def.top = count;
    return result;
  }

  orderBy(
    arg1: ((entity: TEntity<T>) => TEntityValue<TQueryValue>) | string,
    desc?: boolean,
  ): Queryable<D, T> {
    let result = new Queryable(this.db, this);

    let selectedColumn;
    if (typeof arg1 === "function") {
      selectedColumn = arg1(this._entity);
    } /*if (typeof arg1 === "string")*/ else {
      const chain = arg1.split(".").slice(0, -1);
      const asChainArr: string[] = [];
      for (const fkName of chain) {
        asChainArr.push(fkName);
        const as = asChainArr.join(".");

        if (!this._def.join?.some((item) => item.as === this.db.qb.wrap(`TBL.${as}`))) {
          if (this._getEntityChainValue(result._entity, as) === undefined) {
            result = result.includeByTableChainedName(as);
          }
        }
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
    if (result._def.orderBy.some((item) => item[0] === queryValue)) {
      throw new Error("정렬 기준이 중복 되었습니다: " + queryValue);
    }
    result._def.orderBy.push([queryValue, desc ? "DESC" : "ASC"]);
    return result;
  }

  clearOrderBy(): Queryable<D, T> {
    const result = new Queryable(this.db, this);
    delete result._def.orderBy;
    return result;
  }

  limit(skip: number, take: number): Queryable<D, T> {
    const result = new Queryable(this.db, this);
    result._def.limit = [skip, take];
    return result;
  }

  sample(rowCount: number): Queryable<D, T> {
    const result = new Queryable(this.db, this);
    result._def.sample = rowCount;
    return result;
  }

  pivot<V extends TQueryValue, P extends string>(
    valueFwd: (entity: TEntity<T>) => TEntityValue<V>,
    valueDupFwd: (value: TEntityValue<V>) => TEntityValue<V>,
    emptyValue: V,
    pivotFwd: (entity: TEntity<T>) => TEntityValue<any>,
    pivotKeys: P[],
  ): Queryable<D, T & Record<P, V>> {
    const valueColumn = valueFwd(this._entity);
    const pivotColumn = pivotFwd(this._entity);

    const entity: any = { ...this._entity };
    if (this.db.opt.dialect === "mysql") {
      for (const pivotKey of pivotKeys) {
        if (valueColumn instanceof QueryUnit) {
          // const asWrap = this.db.qb.wrap(`TBL${this.#as !== undefined ? `.${this.#as}` : ""}`);
          entity[pivotKey] = valueDupFwd(
            new QueryUnit<V>(valueColumn.type, [
              `IF(`,
              this.db.qh.getQueryValue(pivotColumn),
              ` = '${pivotKey}', `,
              this.db.qh.getQueryValue(valueColumn),
              ", ",
              this.db.qh.getQueryValue(emptyValue),
              `)`,
            ]),
          );
        } else {
          throw new Error("미구현");
        }
      }
    } else {
      for (const pivotKey of pivotKeys) {
        if (valueColumn instanceof QueryUnit) {
          entity[pivotKey] = new QueryUnit<V>(
            valueColumn.type,
            `${this.db.qb.wrap(`TBL${this._as !== undefined ? `.${this._as}` : ""}`)}.${this.db.qb.wrap(pivotKey)}`,
          );
        } else {
          throw new Error("미구현");
        }
      }
    }

    let result = new Queryable(this.db, this as any, entity);
    result._isCustomEntity = true;

    if (this.db.opt.dialect === "mysql") {
      result = result.groupBy(
        (item) =>
          Object.entries(item)
            .filter(
              ([k, v]) =>
                !(pivotKeys as any[]).includes(k) &&
                !ObjectUtils.equal(v, valueColumn) &&
                !ObjectUtils.equal(v, pivotColumn),
            )
            .map(([_, v]) => v) as any,
      );
    } else {
      result._def.pivot = {
        valueColumn: this.db.qh.getQueryValue(valueDupFwd(valueColumn)),
        pivotColumn: this.db.qh.getQueryValue(pivotColumn),
        pivotKeys,
      };
    }

    return result as any;
  }

  unpivot<VC extends string, PC extends string, RT extends TQueryValue>(
    valueColumn: VC,
    pivotColumn: PC,
    pivotKeys: string[],
    _resultType: Type<RT>,
  ): Queryable<D, T & Record<PC, string> & Record<VC, UnwrappedType<RT> | undefined>> {
    const entity: any = { ...this._entity };

    if (this.db.opt.dialect === "mysql") {
      throw new Error("MYSQL 미구현");
    } else {
      if (entity[pivotKeys[0]] instanceof QueryUnit) {
        entity[valueColumn] = new QueryUnit<any>(
          entity[pivotKeys[0]].type,
          `${this.db.qb.wrap(`TBL${this._as !== undefined ? `.${this._as}` : ""}`)}.${this.db.qb.wrap(valueColumn)}`,
        );
        entity[pivotColumn] = new QueryUnit<any>(
          String,
          `${this.db.qb.wrap(`TBL${this._as !== undefined ? `.${this._as}` : ""}`)}.${this.db.qb.wrap(pivotColumn)}`,
        );

        for (const pivotKey of pivotKeys) {
          delete entity[pivotKey];
        }
      } else {
        throw new Error("미구현");
      }
    }

    const result = new Queryable(this.db, this as any, entity);
    result._isCustomEntity = true;

    result._def.unpivot = {
      valueColumn: this.db.qb.wrap(valueColumn),
      pivotColumn: this.db.qb.wrap(pivotColumn),
      pivotKeys,
    };
    return result as any;
  }

  groupBy(fwd: (entity: TEntity<T>) => TEntityValue<TQueryValue>[]): Queryable<D, T> {
    const result = new Queryable(this.db, this);
    result._def.groupBy = fwd(this._entity)
      .map((item) => this.db.qh.getQueryValue(item))
      .filter((item) => item !== "NULL");
    return result;
  }

  having(
    predicate: (entity: TEntity<T>) => TEntityValueOrQueryableOrArray<D, any>[],
  ): Queryable<D, T> {
    const result = new Queryable(this.db, this);
    const having = this.db.qh.and(predicate(this._entity));
    result._def.having = result._def.having ? this.db.qh.and([result._def.having, having]) : having;
    return result;
  }

  join<A extends string, J, R>(
    joinTypeOrQrs: Type<J> | Queryable<D, J>[],
    as: A,
    fwd: (qr: Queryable<D, J>, en: TEntity<T>) => Queryable<D, R>,
  ): Queryable<D, Omit<T, A> & { [K in A]: R[] }> {
    const realAs = this._as !== undefined ? this._as + "." + as : as;

    if (this._def.join?.some((item) => item.as === this.db.qb.wrap(`TBL.${realAs}`))) {
      return new Queryable(this.db, this) as any;
    }

    let joinTableQueryable: Queryable<D, J>;
    if (joinTypeOrQrs instanceof Array) {
      joinTableQueryable = Queryable.union(joinTypeOrQrs, realAs);
    } else {
      joinTableQueryable = new Queryable(this.db, joinTypeOrQrs, realAs);
    }
    const joinQueryable = fwd(joinTableQueryable, this._entity);
    const joinEntity = this._getParentEntity(joinQueryable._entity, realAs, undefined);

    const entity = { ...this._entity } as TEntity<Omit<T, A> & { [K in A]: R[] }>;
    this._setEntityChainValue(entity, as, [joinEntity]);

    const result = new Queryable(this.db, this as any, entity);
    result._isCustomEntity = joinQueryable._isCustomEntity;

    result._def.join = result._def.join ?? [];
    result._def.join.push({
      ...joinQueryable.getSelectQueryDef(),
      isCustomSelect: joinQueryable._isCustomEntity,
      isSingle: false,
    });
    // this.hasMultiJoin = true;

    return result;
  }

  joinSingle<A extends string, J, R>(
    joinTypeOrQrs: Type<J> | Queryable<D, J>[],
    as: A,
    fwd: (qr: Queryable<D, J>, en: TEntity<T>) => Queryable<D, R>,
  ): Queryable<D, T & { [K in A]?: R }> {
    const realAs = this._as !== undefined ? this._as + "." + as : as;

    if (this._def.join?.some((item) => item.as === this.db.qb.wrap(`TBL.${realAs}`))) {
      return new Queryable(this.db, this) as any;
    }

    let joinTableQueryable: Queryable<D, J>;
    if (joinTypeOrQrs instanceof Array) {
      joinTableQueryable = Queryable.union(joinTypeOrQrs, realAs);
    } else {
      joinTableQueryable = new Queryable(this.db, joinTypeOrQrs, realAs);
    }
    const joinQueryable = fwd(joinTableQueryable, this._entity);
    const joinEntity = this._getParentEntity(joinQueryable._entity, realAs, undefined);

    const entity = { ...this._entity } as TEntity<T & { [K in A]?: R }>;
    this._setEntityChainValue(entity, as, joinEntity);

    const result = new Queryable(this.db, this as any, entity);
    result._isCustomEntity = joinQueryable._isCustomEntity;

    result._def.join = result._def.join ?? [];
    result._def.join.push({
      ...joinQueryable.getSelectQueryDef(),
      isCustomSelect: joinQueryable._isCustomEntity,
      isSingle: true,
    });
    // this.hasMultiJoin = this.hasMultiJoin || joinQueryable.hasMultiJoin;

    return result;
  }

  includeByTableChainedName(tableChainedName: string): Queryable<D, T> {
    return this._include(tableChainedName);
  }

  include(
    arg: (entity: TIncludeEntity<T>) => TIncludeEntity<any> | TIncludeEntity<any>[],
  ): Queryable<D, T> {
    const parsed = FnUtils.parse(arg);
    const itemParamName = parsed.params[0];
    const tableChainedName = parsed.returnContent
      .replace(itemParamName + ".", "")
      .replace(/\[0]/g, "")
      .trim();

    return this._include(tableChainedName);
  }

  search(
    fwd: (entity: TEntity<T>) => TEntityValue<String | string | undefined>[],
    searchText: string,
  ): Queryable<D, T> {
    let result: Queryable<D, T> = new Queryable(this.db, this);

    // WHERE
    const whereFnName: "having" | "where" =
      result._def.groupBy && result._def.groupBy.length > 0 ? "having" : "where";

    result = result[whereFnName]((item) => {
      const fieldOrArr: TQueryBuilderValue[] = [];
      const fields = fwd(item);
      for (const field of fields) {
        if (searchText.startsWith("==") || searchText.startsWith("<>")) {
          if (searchText.startsWith("<>")) {
            fieldOrArr.push(
              this.db.qh.notRegexp(
                this.db.qh.toLowerCase(field),
                searchText.substring(2).toLowerCase(),
              ),
            );
          } else {
            fieldOrArr.push(
              this.db.qh.regexp(
                this.db.qh.toLowerCase(field),
                searchText.substring(2).toLowerCase(),
              ),
            );
          }
          /*const searchStr = searchText
            .substring(2)
            .replace(/%/g, "!%")
            .replace(/!/g, "!!")
            .replace(/_/g, "!_")
            .replace(/\*!/g, "%")
            .toLowerCase();

          if (searchText.startsWith("<>")) {
            fieldOrArr.push(this.db.qh.notLike(this.db.qh.toLowerCase(field), searchStr));
          } else {
            fieldOrArr.push(this.db.qh.like(this.db.qh.toLowerCase(field), searchStr));
          }*/
        } else {
          const splitSearchText = searchText
            .trim()
            .split(" ")
            .map((item1) => item1.trim())
            .filter((item1) => Boolean(item1));

          const splitSearchTextWhereArr: TQueryBuilderValue[] = [];
          for (const text of splitSearchText) {
            if (text.startsWith("<>")) {
              splitSearchTextWhereArr.push(
                this.db.qh.notIncludes(this.db.qh.toLowerCase(field), text.toLowerCase()),
              );
            } else {
              splitSearchTextWhereArr.push(
                this.db.qh.includes(this.db.qh.toLowerCase(field), text.toLowerCase()),
              );
            }
          }
          fieldOrArr.push(this.db.qh.and(splitSearchTextWhereArr));
        }
      }

      return [this.db.qh.or(fieldOrArr)];
    });

    /*if (searchText.startsWith("<>")) {
      result = result[whereFnName]((item) => {
        const fieldOrArr: TQueryBuilderValue[] = [];

        const fields = fwd(item);
        for (const field of fields) {
          const splitSearchTextWhereArr: TQueryBuilderValue[] = [];
          for (const text of splitSearchText) {
            if (text.includes("*")) {
              splitSearchTextWhereArr.push(
                this.db.qh.notLike(
                  this.db.qh.toLowerCase(field),
                  text.substring(2).replace(/\*!/g, "%").toLowerCase(),
                ),
              );
            }
            else {
              splitSearchTextWhereArr.push(
                this.db.qh.notIncludes(
                  this.db.qh.toLowerCase(field),
                  text.substring(2).toLowerCase(),
                ),
              );
            }
          }
          fieldOrArr.push(this.db.qh.and(splitSearchTextWhereArr));
        }

        return [this.db.qh.and(fieldOrArr)];
      });
    }
    else {
      result = result[whereFnName]((item) => {
        const fieldOrArr: TQueryBuilderValue[] = [];

        const fields = fwd(item);
        for (const field of fields) {
          const splitSearchTextWhereArr: TQueryBuilderValue[] = [];
          for (const text of splitSearchText) {
            if (text.includes("*")) {
              splitSearchTextWhereArr.push(
                this.db.qh.like(
                  this.db.qh.toLowerCase(field),
                  text.replace(/\*!/g, "%").toLowerCase(),
                ),
              );
            }
            else {
              splitSearchTextWhereArr.push(this.db.qh.includes(
                this.db.qh.toLowerCase(field),
                text.toLowerCase(),
              ));
            }
          }
          fieldOrArr.push(this.db.qh.and(splitSearchTextWhereArr));
        }

        return [this.db.qh.or(fieldOrArr)];
      });
    }*/
    return result;
  }

  wrap(): Queryable<D, T>;

  wrap<R extends Partial<T>>(tableType: Type<R>): Queryable<D, R>;

  wrap(tableType?: any): any {
    let clone: Queryable<D, T>;

    if (tableType !== undefined) {
      const cloneEntity: any = {};
      const entityRec = this._entity as Record<string, any>;
      for (const key of Object.keys(this._entity)) {
        const entityValue = entityRec[key];
        if (SdOrmUtils.canConvertToQueryValue(entityValue)) {
          cloneEntity[key] = entityValue;
        }
      }
      clone = new Queryable(this.db, this as any, cloneEntity);
      clone._def.distinct = true;
    } else {
      clone = new Queryable(this.db, this);
    }
    clone._isCustomEntity = true;

    const subFrom = clone.getSelectQueryDef();
    if (this.db.opt.dialect === "mssql" || this.db.opt.dialect === "mssql-azure") {
      if (subFrom.orderBy) {
        let seq = 0;
        for (const subOrderBy of subFrom.orderBy) {
          seq++;
          subFrom.select["__order_" + seq] = subOrderBy[0];
        }
      }
    }

    const currEntity = this._getParentEntity(clone._entity, this._as, undefined);

    const result = new Queryable<D, any>(this.db, tableType, this._as, currEntity, {
      from: subFrom,
    });
    result._isCustomEntity = true;

    if (this.db.opt.dialect === "mssql" || this.db.opt.dialect === "mssql-azure") {
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
    }

    return result;
  }

  getSelectQueryDef(): ISelectQueryDef & { select: Record<string, TQueryBuilderValue> } {
    const result: ISelectQueryDef & { select: Record<string, TQueryBuilderValue> } = {} as any;

    // FROM 구성
    result.from = this._def.from;

    // AS 구성
    result.as = this.db.qb.wrap(`TBL${this._as !== undefined ? `.${this._as}` : ""}`);

    // SELECT 필드 구성
    result.select = {};

    const addSelectValue = (
      key: string,
      value: QueryUnit<any> | TEntity<any> | TEntity<any>[],
    ): void => {
      if (SdOrmUtils.canConvertToQueryValue(value)) {
        if (typeof result.select === "undefined") throw new NeverEntryError();
        result.select[`${this.db.qb.wrap(key)}`] = this.db.qh.getQueryValue(value);
      } else if (Array.isArray(value)) {
        if (value.some((item) => SdOrmUtils.canConvertToQueryValue(item))) {
          throw new Error(
            "SELECT 에 입력할 수 없는 정보가 입력되었습니다. (qh.equal 등은 qh.is 로 wrapping 해 주어야 사용할 수 있습니다.)",
          );
        } else {
          for (const subKey of Object.keys(value[0]).orderBy()) {
            addSelectValue(`${key}.${subKey}`, value[0][subKey]);
          }
        }
      } else {
        const valueRec = value as Record<string, any>;
        for (const subKey of Object.keys(value).orderBy()) {
          addSelectValue(`${key}.${subKey}`, valueRec[subKey]);
        }
      }
    };

    const entityRec = this._entity as Record<string, any>;
    for (const entityKey of Object.keys(this._entity).orderBy()) {
      addSelectValue(entityKey, entityRec[entityKey]);
    }

    result.where = this._def.where;
    result.distinct = this._def.distinct;
    result.top = this._def.top;
    result.orderBy = this._def.orderBy;
    result.limit = this._def.limit;
    result.pivot = this._def.pivot;
    result.unpivot = this._def.unpivot;
    result.groupBy = this._def.groupBy;
    result.having = this._def.having;
    result.lock = this._def.lock;
    result.sample = this._def.sample;

    if (this._def.join) {
      const joins = ObjectUtils.clone(this._def.join);
      for (const join of joins) {
        // @ts-expect-error
        delete join.isSingle;
      }
      result.join = joins;
    }

    /*if (this.#def.having && !(this.#def.groupBy && this.#def.groupBy.length > 0)) {
      throw new Error("'HAVING'을 사용하려면, 'GROUP BY'를 반드시 설정해야 합니다.");
    }

    if (this.#def.limit && this.#def.join && this.#def.join.some((item) => !item.isSingle) && !this.#def.groupBy && !this.#isCustomEntity) {
      throw new Error("다수의 'RECORD'를 'JOIN'하는 쿼리와 'LIMIT'을 동시에 사용할 수 없습니다. 'LIMIT'을 먼저 사용하고, 'WRAP'한 이후에 'JOIN' 하거나, 'GROUP BY'도 함께 사용하세요.");
    }

    if (this.#def.limit && (!this.#def.orderBy || this.#def.orderBy.length <= 0)) {
      throw new Error("'LIMIT'을 사용하려면, 'ORDER BY'를 반드시 설정해야 합니다.");
    }*/

    return ObjectUtils.clearUndefined(result);
  }

  getInsertQueryDef(
    obj: TInsertObject<T>,
    outputColumns: (keyof T)[] | undefined,
  ): IInsertQueryDef {
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

    const record: Record<string, any> = {};
    const objRec = obj as Record<string, any>;
    for (const key of Object.keys(obj)) {
      record[this.db.qb.wrap(key)] = this.db.qh.getQueryValue(objRec[key]);
    }

    return ObjectUtils.clearUndefined({
      from: this._def.from,
      output: (outputColumns as string[] | undefined)?.map((item) => this.db.qb.wrap(item)),
      record,
    });
  }

  getUpdateQueryDef(
    obj: TUpdateObject<T>,
    outputColumns: (keyof T)[] | undefined,
  ): IUpdateQueryDef {
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

    const record: Record<string, any> = {};
    const objRec = obj as Record<string, any>;
    for (const key of Object.keys(obj)) {
      record[this.db.qb.wrap(key)] = this.db.qh.getQueryValue(objRec[key]);
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
      output: (outputColumns as string[] | undefined)?.map((item) => this.db.qb.wrap(item)),
      as: this.db.qb.wrap(`TBL${this._as !== undefined ? `.${this._as}` : ""}`),
      join: joinDefs,
      where: this._def.where,
    });
  }

  getInsertIfNotExistsQueryDef(
    insertObj: TInsertObject<T>,
    outputColumns: (keyof T)[] | undefined,
  ): IInsertIfNotExistsQueryDef {
    if (this._def.join !== undefined) {
      throw new Error("INSERT IF NOT EXISTS 와 JOIN 를 함께 사용할 수 없습니다.");
    }

    if (typeof this._def.from !== "string") {
      throw new Error("INSERT IF NOT EXISTS 할 TABLE 을 정확히 지정해야 합니다.");
    }

    if (this._isCustomEntity) {
      throw new Error("INSERT IF NOT EXISTS 와 SELECT 를 함께 사용할 수 없습니다.");
    }

    if (this._def.distinct !== undefined) {
      throw new Error("INSERT IF NOT EXISTS 와 DISTINCT 를 함께 사용할 수 없습니다.");
    }

    if (this._def.top !== undefined) {
      throw new Error("INSERT IF NOT EXISTS 와 TOP 를 함께 사용할 수 없습니다.");
    }

    if (this._def.orderBy !== undefined) {
      throw new Error("INSERT IF NOT EXISTS 와 ORDER BY 를 함께 사용할 수 없습니다.");
    }

    if (this._def.limit !== undefined) {
      throw new Error("INSERT IF NOT EXISTS 와 LIMIT 를 함께 사용할 수 없습니다.");
    }

    if (this._def.groupBy !== undefined) {
      throw new Error("INSERT IF NOT EXISTS 와 GROUP BY 를 함께 사용할 수 없습니다.");
    }

    if (this._def.having !== undefined) {
      throw new Error("INSERT IF NOT EXISTS 와 HAVING 를 함께 사용할 수 없습니다.");
    }

    if (this._def.where === undefined || this._def.where.length < 1) {
      throw new Error("INSERT IF NOT EXISTS 시, WHERE 를 반드시 사용해야 합니다.");
    }

    const insertRecord: Record<string, any> = {};
    const insertObjRec = insertObj as Record<string, any>;
    for (const key of Object.keys(insertObj)) {
      insertRecord[this.db.qb.wrap(`${key}`)] = this.db.qh.getQueryValue(insertObjRec[key]);
    }

    return ObjectUtils.clearUndefined({
      from: this._def.from,
      as: this.db.qb.wrap(`TBL${this._as !== undefined ? `.${this._as}` : ""}`),
      where: this._def.where,
      insertRecord,
      output: (outputColumns as string[] | undefined)?.map((item) => this.db.qb.wrap(item)),
    });
  }

  getUpsertQueryDef<U extends TUpdateObject<T>>(
    updateObj: U,
    insertObj: TInsertObject<T> | undefined,
    outputColumns: (keyof T)[] | undefined,
    aiKeyName: string | undefined,
    pkColNames: string[],
  ): IUpsertQueryDef {
    if (this._def.join !== undefined) {
      throw new Error("UPSERT 와 JOIN 를 함께 사용할 수 없습니다.");
    }

    if (typeof this._def.from !== "string") {
      throw new Error("UPSERT 할 TABLE 을 정확히 지정해야 합니다.");
    }

    if (this._isCustomEntity) {
      throw new Error("UPSERT 와 SELECT 를 함께 사용할 수 없습니다.");
    }

    if (this._def.distinct !== undefined) {
      throw new Error("UPSERT 와 DISTINCT 를 함께 사용할 수 없습니다.");
    }

    if (this._def.top !== undefined) {
      throw new Error("UPSERT 와 TOP 를 함께 사용할 수 없습니다.");
    }

    if (this._def.orderBy !== undefined) {
      throw new Error("UPSERT 와 ORDER BY 를 함께 사용할 수 없습니다.");
    }

    if (this._def.limit !== undefined) {
      throw new Error("UPSERT 와 LIMIT 를 함께 사용할 수 없습니다.");
    }

    if (this._def.groupBy !== undefined) {
      throw new Error("UPSERT 와 GROUP BY 를 함께 사용할 수 없습니다.");
    }

    if (this._def.having !== undefined) {
      throw new Error("UPSERT 와 HAVING 를 함께 사용할 수 없습니다.");
    }

    if (this._def.where === undefined || this._def.where.length < 1) {
      throw new Error("UPSERT 시, WHERE 를 반드시 사용해야 합니다.");
    }

    // const updateRecordEntity = typeof updateObjOrFwd === "function" ? updateObjOrFwd(this.#entity) : updateObjOrFwd;
    const updateRecord: Record<string, any> = {};
    const updateObjRec = updateObj as Record<string, any>;
    for (const key of Object.keys(updateObj)) {
      updateRecord[this.db.qb.wrap(`${key}`)] = this.db.qh.getQueryValue(updateObjRec[key]);
    }

    // const insertObj = typeof insertObjOrFwd === "function" ? insertObjOrFwd(updateRecord as any) : insertObjOrFwd;
    let insertRecord: Record<string, any> = {};
    if (insertObj) {
      const insertObjRec = insertObj as Record<string, any>;
      for (const key of Object.keys(insertObj)) {
        insertRecord[this.db.qb.wrap(`${key}`)] = this.db.qh.getQueryValue(insertObjRec[key]);
      }
    } else {
      insertRecord = ObjectUtils.clone(updateRecord);
    }

    return ObjectUtils.clearUndefined({
      from: this._def.from,
      as: this.db.qb.wrap(`TBL${this._as !== undefined ? `.${this._as}` : ""}`),
      where: this._def.where,
      updateRecord,
      insertRecord,
      output: (outputColumns as string[] | undefined)?.map((item) => this.db.qb.wrap(item)),
      aiKeyName,
      pkColNames,
    });
  }

  getDeleteQueryDef(outputColumns: (keyof T)[] | undefined): IDeleteQueryDef {
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
      output: (outputColumns as string[] | undefined)?.map((item) => this.db.qb.wrap(item)),
      as: this.db.qb.wrap(`TBL${this._as !== undefined ? `.${this._as}` : ""}`),
      join: joinDefs,
      where: this._def.where,
    });
  }

  async insertIntoAsync(tableType: Type<T>, stopAutoIdentity?: boolean): Promise<void> {
    if (typeof this.db === "undefined") {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }

    const def = this.getSelectQueryDef();

    const targetTableDef = DbDefUtils.getTableDef(tableType);
    if (typeof targetTableDef === "undefined") {
      throw new Error(`'${tableType.name}'에 '@Table()'이 지정되지 않았습니다.`);
    }

    const targetTableName = this.db.qb.getTableName({
      ...(this.db.opt.dialect === "sqlite"
        ? {}
        : {
            database: targetTableDef.database ?? this.db.opt.database,
            schema: targetTableDef.schema ?? this.db.opt.schema,
          }),
      name: targetTableDef.name,
    });

    const defs: TQueryDef[] = [
      {
        type: "insertInto",
        ...def,
        target: targetTableName,
      },
    ];

    if (stopAutoIdentity) {
      if (this.db.opt.dialect === "mssql" || this.db.opt.dialect === "mssql-azure") {
        defs.insert(0, {
          type: "configIdentityInsert" as const,
          ...{
            table: targetTableDef,
            state: "on" as const,
          },
        });

        defs.push({
          type: "configIdentityInsert" as const,
          ...{
            table: targetTableDef,
            state: "off" as const,
          },
        });
      } else {
        throw new Error("mssql only");
      }
    }

    await this.db.executeDefsAsync(defs);
  }

  async resultAsync(): Promise<T[]> {
    if (typeof this.db === "undefined") {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }

    const def = this.getSelectQueryDef();

    // const cacheKey = JsonConvert.stringify(def)!;
    //
    // if (DbContext.selectCache.has(cacheKey)) {
    //   try {
    //     await Wait.until(() => DbContext.selectCache.get(cacheKey) !== undefined, undefined, 30000);
    //     const cacheValue = DbContext.selectCache.get(cacheKey)!;
    //
    //     clearTimeout(cacheValue.timeout);
    //     cacheValue.timeout = setTimeout(() => {
    //       DbContext.selectCache.delete(cacheKey);
    //     }, DbContext.SELECT_CACHE_TIMEOUT);
    //
    //     return cacheValue.result;
    //   }
    //   catch (err) {
    //     // eslint-disable-next-line no-console
    //     console.error(err);
    //   }
    // }
    // DbContext.selectCache.set(cacheKey, undefined);

    const results = await this.db.executeDefsAsync(
      [{ type: "select", ...def }],
      [this._getParseOption(undefined)],
    );

    // const timeout = setTimeout(() => {
    //   DbContext.selectCache.delete(cacheKey);
    // }, DbContext.SELECT_CACHE_TIMEOUT);
    // DbContext.selectCache.set(cacheKey, { result: results[0] ?? [], timeout });

    return results[0];
  }

  async singleAsync(): Promise<T | undefined> {
    const result = await this.resultAsync();
    if (result.length > 1) {
      if (process.env["NODE_ENV"] === "development") {
        // eslint-disable-next-line no-console
        console.error(result);
      }
      throw new Error("복수의 쿼리결과가 있습니다.");
    }

    return result[0];
  }

  async countAsync(): Promise<number>;
  async countAsync(fwd: (entity: TEntity<T>) => TEntityValue<any>): Promise<number>;
  async countAsync(fwd?: (entity: TEntity<T>) => TEntityValue<any>): Promise<number> {
    if (this._def.distinct) {
      throw new Error(
        "distinct 이후엔 'countAsync'를 사용할 수 없습니다." +
          " 사용하려면 distinct와 countAsync 사이에 wrap을 먼저 사용하거나," +
          " distinct대신 groupBy와 qh.count 로 수동으로 처리하세요.",
      );
    }
    if (this._def.groupBy) {
      throw new Error(
        "groupBy 이후엔 'countAsync'를 사용할 수 없습니다." +
          " 사용하려면 groupBy와 countAsync 사이에 wrap을 먼저 사용하세요.",
      );
    }

    const queryable = fwd
      ? this.select(() => ({ cnt: this.db.qh.count(fwd(this._entity)) }))
      : this.select(() => ({ cnt: this.db.qh.count() }));
    delete queryable._def.orderBy;
    const item = await queryable.singleAsync();

    return (item?.cnt ?? 0) as any;
  }

  async existsAsync(): Promise<boolean> {
    // const cnt = await this.lock().countAsync();
    const cnt = await this.countAsync();
    return cnt > 0;
  }

  async bulkInsertAsync(records: TInsertObject<T>[]): Promise<void> {
    if (records.length === 0) return;

    if (typeof this.db === "undefined") {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }
    // DbContext.selectCache.clear();

    if (!this.tableDef) {
      throw new Error("'Wrapping'된 이후에는 테이블의 정보를 가져올 수 없습니다.");
    }

    const columnDefs = this.tableDef.columns.map((col) => ({
      primaryKey: col.primaryKey,
      name: col.name,
      dataType: this.db.qh.type(col.dataType ?? col.typeFwd()),
      autoIncrement: col.autoIncrement,
      nullable: col.nullable,
    }));

    await this.db.bulkInsertAsync(
      this.tableName,
      columnDefs,
      records.map((item) => {
        const result: Record<string, any> = {};
        const itemRec = item as Record<string, any>;
        for (const key of Object.keys(item)) {
          result[key] = this.db.qh.getBulkInsertQueryValue(itemRec[key]);
        }
        return result;
      }),
    );
  }

  async bulkUpsertAsync(records: TInsertObject<T>[]): Promise<void> {
    if (records.length === 0) return;

    if (typeof this.db === "undefined") {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }

    if (this.db.opt.dialect !== "mysql") {
      throw new Error("'bulkUpsert'는 'MYSQL'에서만 지원됩니다.");
    }

    // DbContext.selectCache.clear();

    if (!this.tableDef) {
      throw new Error("'Wrapping'된 이후에는 테이블의 정보를 가져올 수 없습니다.");
    }

    const columnDefs = this.tableDef.columns.map((col) => ({
      primaryKey: col.primaryKey,
      name: col.name,
      dataType: this.db.qh.type(col.dataType ?? col.typeFwd()),
      autoIncrement: col.autoIncrement,
      nullable: col.nullable,
    }));

    await this.db.bulkUpsertAsync(
      this.tableName,
      columnDefs,
      records.map((item) => {
        const result: Record<string, any> = {};
        const itemRec = item as Record<string, any>;
        for (const key of Object.keys(item)) {
          result[key] = this.db.qh.getBulkInsertQueryValue(itemRec[key]);
        }
        return result;
      }),
    );
  }

  async insertAsync(records: TInsertObject<T>[]): Promise<void>;

  async insertAsync<OK extends keyof T>(
    records: TInsertObject<T>[],
    outputColumns: OK[],
  ): Promise<{ [K in OK]: T[K] }[]>;

  async insertAsync<OK extends keyof T>(
    records: TInsertObject<T>[],
    outputColumns?: OK[],
  ): Promise<{ [K in OK]: T[K] }[] | void> {
    return await this._insertAsync(false, records, outputColumns);
  }

  async insertWithoutFkCheckAsync(records: TInsertObject<T>[]): Promise<void>;

  async insertWithoutFkCheckAsync<OK extends keyof T>(
    records: TInsertObject<T>[],
    outputColumns: OK[],
  ): Promise<{ [K in OK]: T[K] }[]>;

  async insertWithoutFkCheckAsync<OK extends keyof T>(
    records: TInsertObject<T>[],
    outputColumns?: OK[],
  ): Promise<{ [K in OK]: T[K] }[] | void> {
    return await this._insertAsync(true, records, outputColumns);
  }

  insertPrepare(records: TInsertObject<T>[]): void {
    this._insertPrepare(false, records);
  }

  insertWithoutFkCheckPrepare(records: TInsertObject<T>[]): void {
    this._insertPrepare(true, records);
  }

  async updateAsync(
    recordFwd: (entity: TEntity<T>) => TUpdateObject<T> | Promise<TUpdateObject<T>>,
  ): Promise<void>;

  async updateAsync<OK extends keyof T>(
    recordFwd: (entity: TEntity<T>) => TUpdateObject<T> | Promise<TUpdateObject<T>>,
    outputColumns: OK[],
  ): Promise<{ [K in OK]: T[K] }[]>;

  async updateAsync<OK extends keyof T>(
    recordFwd: (entity: TEntity<T>) => TUpdateObject<T> | Promise<TUpdateObject<T>>,
    outputColumns?: OK[],
  ): Promise<{ [K in OK]: T[K] }[] | void> {
    const record = await recordFwd(this._entity);
    const { defs, dataIndex } = this._getUpdateDefs(record, outputColumns);
    const parseOption = outputColumns ? this._getParseOption(outputColumns) : undefined;

    return (
      await this.db.executeDefsAsync(
        defs,
        defs.map((def, i) => (dataIndex === i ? parseOption : undefined)),
      )
    )[dataIndex];
  }

  updatePrepare(recordFwd: (entity: TEntity<T>) => TUpdateObject<T>): void {
    const record = recordFwd(this._entity);
    const { defs } = this._getUpdateDefs(record, undefined);
    this.db.prepareDefs.push(...defs);
  }

  async deleteAsync(): Promise<void>;

  async deleteAsync<OK extends keyof T>(outputColumns: OK[]): Promise<{ [K in OK]: T[K] }[]>;

  async deleteAsync<OK extends keyof T>(
    outputColumns?: OK[],
  ): Promise<{ [K in OK]: T[K] }[] | void> {
    const { defs, dataIndex } = this._getDeleteDefs(outputColumns);
    const parseOption = outputColumns ? this._getParseOption(outputColumns) : undefined;

    return (
      await this.db.executeDefsAsync(
        defs,
        defs.map((def, i) => (dataIndex === i ? parseOption : undefined)),
      )
    )[dataIndex];
  }

  deletePrepare(): void {
    const { defs } = this._getDeleteDefs(undefined);
    this.db.prepareDefs.push(...defs);
  }

  async upsertAsync(
    inAndUpsertFwd: (entity: TEntity<T>) => TInsertObject<T> | Promise<TInsertObject<T>>,
  ): Promise<void>;

  async upsertAsync<OK extends keyof T>(
    inAndUpsertFwd: (entity: TEntity<T>) => TInsertObject<T> | Promise<TInsertObject<T>>,
    outputColumns: OK[],
  ): Promise<{ [K in OK]: T[K] }[]>;

  async upsertAsync<U extends TUpdateObject<T>>(
    updateFwd: (entity: TEntity<T>) => U | Promise<U>,
    insertFwd: (updateRecord: U) => TInsertObject<T> | Promise<TInsertObject<T>>,
  ): Promise<void>;

  async upsertAsync<U extends TUpdateObject<T>, OK extends keyof T>(
    updateFwd: (entity: TEntity<T>) => U | Promise<U>,
    insertFwd: (updateRecord: U) => TInsertObject<T> | Promise<TInsertObject<T>>,
    outputColumns: OK[],
  ): Promise<{ [K in OK]: T[K] }[]>;

  async upsertAsync<U extends TUpdateObject<T>, OK extends keyof T>(
    arg1:
      | ((entity: TEntity<T>) => U | Promise<U>)
      | ((entity: TEntity<T>) => TInsertObject<T> | Promise<TInsertObject<T>>),
    arg2?: ((updateRecord: U) => TInsertObject<T> | Promise<TInsertObject<T>>) | OK[],
    arg3?: OK[],
  ): Promise<{ [K in OK]: T[K] }[] | void> {
    const updateFwd = arg1;
    const insertFwd = typeof arg2 === "function" ? arg2 : undefined;
    const outputColumns = arg2 instanceof Array ? arg2 : arg3;

    const updateRecord = (await updateFwd(this._entity)) as U;
    const insertRecord = (
      insertFwd ? await insertFwd(updateRecord) : ObjectUtils.clone(updateRecord)
    ) as TInsertObject<T>;

    const { defs, dataIndex } = this._getUpsertDefs(updateRecord, insertRecord, outputColumns);
    const parseOption = outputColumns ? this._getParseOption(outputColumns) : undefined;

    const result = await this.db.executeDefsAsync(
      defs,
      defs.map((def, i) => (dataIndex === i ? parseOption : undefined)),
    );
    return result[dataIndex];
  }

  upsertPrepare<U extends TUpdateObject<T>>(
    updateObjOrFwd: U | ((entity: TEntity<T>) => U),
    insertObjOrFwd?: TInsertObject<T> | ((updateRecord: U) => TInsertObject<T>),
  ): void {
    const updateRecord =
      typeof updateObjOrFwd === "function" ? updateObjOrFwd(this._entity) : updateObjOrFwd;
    const insertRecord = (
      insertObjOrFwd
        ? typeof insertObjOrFwd === "function"
          ? insertObjOrFwd(updateRecord)
          : insertObjOrFwd
        : updateRecord
    ) as TInsertObject<T>;

    const { defs } = this._getUpsertDefs(updateRecord, insertRecord, undefined);
    this.db.prepareDefs.push(...defs);
  }

  configIdentityInsert(state: "on" | "off"): void {
    if (typeof this.db === "undefined") {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }

    if (!this.tableDef) {
      throw new Error("'Wrapping'된 이후에는 테이블의 정보를 가져올 수 없습니다.");
    }

    this.db.prepareDefs.push(
      ...[
        {
          type: "configIdentityInsert" as const,
          table: this.tableNameDef,
          state,
        },
      ],
    );
  }

  private _include(tableChainedName: string): Queryable<D, T> {
    if (!this.tableDef) {
      throw new Error("'Wrapping'된 이후에는 include 를 사용할 수 없습니다.");
    }

    const chain = tableChainedName.split(".");

    let result = this;
    let tableDef = this.tableDef;
    const asChainArr: string[] = [];
    for (const fkName of chain) {
      const prevAs = asChainArr.join(".");
      asChainArr.push(fkName);
      const as = asChainArr.join(".");

      // FK 정의 가져오기
      const fkDef =
        tableDef.foreignKeys.single((item) => item.propertyKey === fkName) ??
        tableDef.referenceKeys.single((item) => item.propertyKey === fkName);
      const fktDef =
        tableDef.foreignKeyTargets.single((item) => item.propertyKey === fkName) ??
        tableDef.referenceKeyTargets.single((item) => item.propertyKey === fkName);
      if (!fkDef && !fktDef) {
        throw new Error(
          `'${tableDef.name}.${as}'에 '@ForeignKey()'나 '@ForeignKeyTarget()'이 지정되지 않았습니다.`,
        );
      }

      // FK
      if (fkDef) {
        // FK 대상 테이블의 정의 가져오기
        const fkTargetType = fkDef.targetTypeFwd();
        const fkTargetTableDef = DbDefUtils.getTableDef(fkTargetType);
        if (
          fkDef.columnPropertyKeys.length !==
          fkTargetTableDef.columns.filter((item) => item.primaryKey !== undefined).length
        ) {
          throw new Error(
            `'${tableDef.name}.${as}'의 FK 설정과 '${fkTargetTableDef.name}'의 PK 설정의 길이가 다릅니다.`,
          );
        }

        // apply 실행
        result = result.joinSingle(fkTargetType, as, (q, en) =>
          q.where((item) => {
            const lastEn = this._getEntityChainValue(en, prevAs);

            const whereQuery: TQueryBuilderValue[] = [];
            for (let i = 0; i < fkDef.columnPropertyKeys.length; i++) {
              const columnPropertyKey = fkDef.columnPropertyKeys[i];

              if (columnPropertyKey.startsWith("=")) {
                const columnPropertyValue = columnPropertyKey.slice(1);
                whereQuery.push([
                  this.db.qh.getQueryValue(item[fkTargetTableDef.columns[i].propertyKey]),
                  " = ",
                  columnPropertyValue,
                ]);
              } else {
                whereQuery.push(
                  ...[
                    this.db.qh.isNotNull(lastEn[columnPropertyKey]),
                    this.db.qh.equal(
                      item[fkTargetTableDef.columns[i].propertyKey],
                      lastEn[columnPropertyKey],
                    ),
                  ],
                );
              }
            }
            return whereQuery;
          }),
        ) as any;

        tableDef = fkTargetTableDef;
      }
      // FKT
      else if (fktDef) {
        const fktSourceType = fktDef.sourceTypeFwd();
        const fktSourceTableDef = DbDefUtils.getTableDef(fktSourceType);
        const fktSourceFkDef =
          fktSourceTableDef.foreignKeys.single(
            (item) => item.propertyKey === fktDef.sourceKeyPropertyKey,
          ) ??
          fktSourceTableDef.referenceKeys.single(
            (item) => item.propertyKey === fktDef.sourceKeyPropertyKey,
          );
        if (!fktSourceFkDef) {
          throw new Error(
            `'${fktSourceTableDef.name}.${fktDef.sourceKeyPropertyKey}'에 '@ForeignKey()'가 지정되지 않았습니다.`,
          );
        }

        if (
          fktSourceFkDef.columnPropertyKeys.length !==
          tableDef.columns.filter((item) => item.primaryKey !== undefined).length
        ) {
          throw new Error(
            `'${fktSourceTableDef.name}.${fktDef.sourceKeyPropertyKey}'의 FK 설정과 '${tableDef.name}'의 PK 설정의 길이가 다릅니다.`,
          );
        }

        // JOIN 실행
        result = result[fktDef.isSingle ? "joinSingle" : "join"](fktSourceType, as, (q, en) =>
          q.where((item) => {
            const lastEn = this._getEntityChainValue(en, prevAs);

            const whereQuery: TQueryBuilderValue[] = [];
            for (let i = 0; i < fktSourceFkDef.columnPropertyKeys.length; i++) {
              const columnPropertyKey = fktSourceFkDef.columnPropertyKeys[i];

              if (columnPropertyKey.startsWith("=")) {
                const columnPropertyValue = columnPropertyKey.slice(1);
                whereQuery.push([
                  this.db.qh.getQueryValue(lastEn[tableDef.columns[i].propertyKey]),
                  " = ",
                  columnPropertyValue,
                ]);
              } else {
                whereQuery.push(
                  ...[
                    this.db.qh.isNotNull(lastEn[tableDef.columns[i].propertyKey]),
                    this.db.qh.equal(
                      item[columnPropertyKey],
                      lastEn[tableDef.columns[i].propertyKey],
                    ),
                  ],
                );
              }
            }
            return whereQuery;
          }),
        ) as any;

        tableDef = fktSourceTableDef;
      }
    }

    return result as Queryable<D, T>;
  }

  private _getParentEntity<P>(
    fromEntity: TEntity<P>,
    rootAs: string | undefined,
    parentAs: string | undefined,
  ): TEntity<P> {
    const result: any = {};
    const fromEntityRec = fromEntity as Record<string, any>;
    for (const key of Object.keys(fromEntity)) {
      const entityValue: any = fromEntityRec[key];
      if (SdOrmUtils.canConvertToQueryValue(entityValue)) {
        result[key] = new QueryUnit(
          SdOrmUtils.getQueryValueType(entityValue),
          this.db.qb.wrap("TBL" + (rootAs !== undefined ? "." + rootAs : "")) +
            "." +
            this.db.qb.wrap((parentAs !== undefined ? `${parentAs}.` : "") + key),
        );
      } else if (entityValue instanceof Array) {
        result[key] = [
          this._getParentEntity(
            entityValue[0],
            rootAs,
            (parentAs !== undefined ? parentAs + "." : "") + key,
          ),
        ] as any;
      } else {
        result[key] = this._getParentEntity(
          entityValue,
          rootAs,
          (parentAs !== undefined ? parentAs + "." : "") + key,
        );
      }
    }
    return result;
  }

  private async _insertAsync<OK extends keyof T>(
    ignoreFk: boolean,
    records: TInsertObject<T>[],
    outputColumns: OK[] | undefined,
  ): Promise<{ [K in OK]: T[K] }[] | void> {
    if (records.length === 0 && outputColumns !== undefined) return [];
    if (records.length === 0 && outputColumns === undefined) return undefined;

    const { defs, dataIndexes } = this._getInsertDefs(ignoreFk, records, outputColumns);
    const parseOption = outputColumns ? this._getParseOption(outputColumns) : undefined;

    return (
      await this.db.executeDefsAsync(
        defs,
        defs.map((def, i) => (dataIndexes.includes(i) ? parseOption : undefined)),
      )
    )
      .filter((item, i) => dataIndexes.includes(i))
      .map((item) => item[0]);
  }

  private _insertPrepare(ignoreFk: boolean, records: TInsertObject<T>[]): void {
    if (records.length === 0) return;

    const { defs } = this._getInsertDefs(ignoreFk, records, undefined);
    this.db.prepareDefs.push(...defs);
  }

  private _getInsertDefs<OK extends keyof T>(
    ignoreFk: boolean,
    records: TInsertObject<T>[],
    outputColumns: OK[] | undefined,
  ): {
    defs: TQueryDef[];
    dataIndexes: number[];
  } {
    if (records.length < 1) {
      throw new Error("데이터 누락");
    }
    if (typeof this.db === "undefined") {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }
    if (!this.tableDef) {
      throw new Error("'Wrapping'된 이후에는 테이블의 정보를 가져올 수 없습니다.");
    }
    // DbContext.selectCache.clear();

    const pkColNames = this.tableDef.columns
      .filter((item) => item.primaryKey !== undefined)
      .map((item) => item.name);
    const aiColNames = this.tableDef.columns
      .filter((item) => !!item.autoIncrement)
      .map((item) => item.name);

    const dataIndexes: number[] = [];
    const defs: TQueryDef[] = [];
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const queryDef = this.getInsertQueryDef(record, outputColumns);
      defs.push({
        type: "insert" as const,
        ...queryDef,
      });

      if (this.db.opt.dialect === "mysql" && outputColumns) {
        const selectObj = outputColumns.toObject(
          (colName) => this.db.qb.wrap(colName as string),
          (colName) => this.db.qb.wrap(colName as string),
        );

        if (
          pkColNames.length === 1 &&
          aiColNames.length === 1 &&
          pkColNames[0] === aiColNames[0] &&
          !Object.keys(record).includes(aiColNames[0])
        ) {
          const pkColName = pkColNames[0];
          defs.push({
            type: "select" as const,
            from: this._def.from,
            select: selectObj,
            where: [[this.db.qb.wrap(pkColName), " = ", "LAST_INSERT_ID()"]],
          });
        } else {
          const recordRec = record as Record<string, any>;
          defs.push({
            type: "select" as const,
            from: this._def.from,
            select: selectObj,
            where: pkColNames.map((pkColName) => [
              [this.db.qb.wrap(pkColName), " = ", this.db.qh.getQueryValue(recordRec[pkColName])],
            ]),
          });
        }
        dataIndexes.push(i * 2 + 1);
      } else if (outputColumns) {
        dataIndexes.push(i);
      }
    }

    if (ignoreFk) {
      defs.insert(0, {
        type: "configForeignKeyCheck",
        table: this.tableNameDef,
        useCheck: false,
      });
      for (let i = 0; i < dataIndexes.length; i++) {
        dataIndexes[i]++;
      }

      defs.push({
        type: "configForeignKeyCheck",
        table: this.tableNameDef,
        useCheck: true,
      });
    }

    if (this.db.opt.dialect === "mssql" || this.db.opt.dialect === "mssql-azure") {
      const hasSomeAIColVal = records.some((record) =>
        Object.keys(record).some((item) => aiColNames.includes(item)),
      );
      if (hasSomeAIColVal) {
        defs.insert(0, {
          type: "configIdentityInsert" as const,
          ...{
            table: this.tableNameDef,
            state: "on" as const,
          },
        });
        for (let i = 0; i < dataIndexes.length; i++) {
          dataIndexes[i]++;
        }

        defs.push({
          type: "configIdentityInsert" as const,
          ...{
            table: this.tableNameDef,
            state: "off" as const,
          },
        });
      }
    }

    return {
      defs,
      dataIndexes,
    };
  }

  private _getUpdateDefs<OK extends keyof T>(
    record: TUpdateObject<T>,
    outputColumns: OK[] | undefined,
  ): {
    defs: TQueryDef[];
    dataIndex: number;
  } {
    if (typeof this.db === "undefined") {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }
    if (!this.tableDef) {
      throw new Error("'Wrapping'된 이후에는 편집 쿼리를 실행할 수 없습니다.");
    }
    // DbContext.selectCache.clear();

    let dataIndex: number;
    const defs: TQueryDef[] = [];

    const queryDef = this.getUpdateQueryDef(record, outputColumns);
    defs.push({
      type: "update" as const,
      ...queryDef,
    });

    if (this.db.opt.dialect === "mysql" && outputColumns) {
      const selectObj = outputColumns.toObject(
        (colName) => this.db.qb.wrap(colName as string),
        (colName) => this.db.qb.wrap(colName as string),
      );
      defs.push({
        type: "select" as const,
        ...this.getSelectQueryDef(),
        select: selectObj,
      });
      dataIndex = 1;
    } else {
      dataIndex = 0;
    }

    return {
      defs,
      dataIndex,
    };
  }

  private _getDeleteDefs<OK extends keyof T>(
    outputColumns: OK[] | undefined,
  ): {
    defs: TQueryDef[];
    dataIndex: number;
  } {
    if (typeof this.db === "undefined") {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }
    if (!this.tableDef) {
      throw new Error("'Wrapping'된 이후에는 편집 쿼리를 실행할 수 없습니다.");
    }
    // DbContext.selectCache.clear();

    const defs: TQueryDef[] = [];

    const queryDef = this.getDeleteQueryDef(outputColumns);
    defs.push({
      type: "delete" as const,
      ...queryDef,
    });

    if (this.db.opt.dialect === "mysql" && outputColumns) {
      const selectObj = outputColumns.toObject(
        (colName) => this.db.qb.wrap(colName as string),
        (colName) => this.db.qb.wrap(colName as string),
      );
      defs.insert(0, {
        type: "select" as const,
        ...this.getSelectQueryDef(),
        select: selectObj,
      });
    }

    return {
      defs,
      dataIndex: 0,
    };
  }

  /*public async insertIfNotExistsAsync(records: TInsertObject<T>[]): Promise<void>;
async insertIfNotExistsAsync<OK extends keyof T>(records: TInsertObject<T>[], outputColumns: OK[]): Promise<{ [K in OK]: T[K] }[]>;
async insertIfNotExistsAsync<OK extends keyof T>(records: TInsertObject<T>[], outputColumns?: OK[]): Promise<{ [K in OK]: T[K] }[] | void> {
    if (typeof this.db === "undefined") {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }
    if (!this.#tableDef) {
      throw new Error("'Wrapping'된 이후에는 편집 쿼리를 실행할 수 없습니다.");
    }
    DbContext.selectCache.clear();

    const queryDefs = records.map((record) => this.getInsertIfNotExistsQueryDef(record, outputColumns));
    const parseOption = outputColumns ? this.#getParseOption(outputColumns) : undefined;

    if (this.db.opt.dialect === "mysql") {
      throw new NotImplementError("mysql 미구현");
    }
    else {
      const aiColNames = this.#tableDef.columns.filter((item) => item.autoIncrement).map((item) => item.name);
      const hasAutoIncreaseColumnValue = Object.keys(records[0]).some((item) => aiColNames.includes(item));

      if (hasAutoIncreaseColumnValue) {
        return (
          await this.db.executeDefsAsync([
            {
              type: "configIdentityInsert",
              ...{
                table: {
                  database: this.#tableDef.database ?? this.db.opt.database,
                  schema: this.#tableDef.schema ?? this.db.opt.schema,
                  name: this.#tableDef.name
                },
                state: "on"
              }
            },
            ...queryDefs.map((queryDef) => ({
              type: "insertIfNotExists" as const,
              ...queryDef
            })),
            {
              type: "configIdentityInsert",
              ...{
                table: {
                  database: this.#tableDef.database ?? this.db.opt.database,
                  schema: this.#tableDef.schema ?? this.db.opt.schema,
                  name: this.#tableDef.name
                },
                state: "off"
              }
            }
          ], [undefined, ...queryDefs.map(() => parseOption), undefined])
        ).slice(1, -1).map((item) => item[0]);
      }

      return (await this.db.executeDefsAsync(
        queryDefs.map((queryDef) => ({
          type: "insertIfNotExists" as const,
          ...queryDef
        })),
        queryDefs.map(() => parseOption)
      )).map((item) => item[0]);
    }
  }*/

  private _getUpsertDefs<OK extends keyof T>(
    updateRecord: TUpdateObject<T>,
    insertRecord: TInsertObject<T>,
    outputColumns: OK[] | undefined,
  ): {
    defs: TQueryDef[];
    dataIndex: number;
  } {
    if (typeof this.db === "undefined") {
      throw new Error("'DbContext'가 설정되지 않은 쿼리는 실행할 수 없습니다.");
    }
    if (!this.tableDef) {
      throw new Error("'Wrapping'된 이후에는 편집 쿼리를 실행할 수 없습니다.");
    }
    // DbContext.selectCache.clear();

    const pkColNames = this.tableDef.columns
      .filter((item) => item.primaryKey !== undefined)
      .map((item) => item.name);
    const aiColNames = this.tableDef.columns
      .filter((item) => !!item.autoIncrement)
      .map((item) => item.name);

    // let dataIndex: number;
    const defs: TQueryDef[] = [];

    const aiKeyName = pkColNames.single((item) => aiColNames.includes(item));
    const queryDef = this.getUpsertQueryDef(
      updateRecord,
      insertRecord,
      outputColumns,
      aiKeyName,
      pkColNames,
    );
    defs.push({
      type: "upsert" as const,
      ...queryDef,
    });

    /*if (this.db.opt.dialect === "mysql" && outputColumns) {
      const selectObj = outputColumns.toObject((colName) => this.db.qb.wrap(colName as string), (colName) => this.db.qb.wrap(colName as string));

      // if (
      //   pkColNames.length === 1 && aiColNames.length === 1
      //   && pkColNames[0] === aiColNames[0]
      //   && !Object.keys(insertRecord).includes(aiColNames[0])
      // ) {
      //   const pkColName = pkColNames[0];
      //   defs.push({
      //     type: "select" as const,
      //     ...this.getSelectQueryDef(),
      //     select: selectObj,
      //     where: [[this.db.qb.wrap(pkColName), " = ", "LAST_INSERT_ID()"]]
      //   });
      // }
      // else {
      //   defs.push({
      //     type: "select" as const,
      //     ...this.getSelectQueryDef(),
      //     select: selectObj
      //   });
      // }
      defs.push({
        type: "select" as const,
        ...this.getSelectQueryDef(),
        select: selectObj
      });
      dataIndex = 1;
    }
    else {
      dataIndex = 0;
    }*/

    let dataIndex = 0;

    if (this.db.opt.dialect !== "mysql") {
      const hasSomeAIColVal = Object.keys(insertRecord).some((item) => aiColNames.includes(item));
      if (hasSomeAIColVal) {
        defs.insert(0, {
          type: "configIdentityInsert" as const,
          ...{
            table: this.tableNameDef,
            state: "on" as const,
          },
        });
        dataIndex++;

        defs.push({
          type: "configIdentityInsert" as const,
          ...{
            table: this.tableNameDef,
            state: "off" as const,
          },
        });
      }
    }

    return {
      defs,
      dataIndex,
    };
  }

  private _getParseOption(columns: (keyof T)[] | undefined): IQueryResultParseOption {
    const result: IQueryResultParseOption = {
      columns: {},
      joins: {},
    };

    const configuration = (entity: TEntity<any>, parentKeys: string[]): void => {
      for (const key of Object.keys(ObjectUtils.clearUndefined(entity))) {
        const fullKeyArr = parentKeys.concat([key]);
        const fullKey = fullKeyArr.join(".");
        if (columns && !(columns as string[]).includes(fullKey)) continue;

        try {
          if (
            typeof entity[key] !== "undefined" &&
            SdOrmUtils.canConvertToQueryValue(entity[key])
          ) {
            result.columns![fullKey] = {
              dataType: SdOrmUtils.getQueryValueType(entity[key])!.name,
            };
          } else if (entity[key] instanceof Array) {
            result.joins![fullKey] = { isSingle: false };
            configuration(entity[key][0], fullKeyArr);
          } else {
            result.joins![fullKey] = { isSingle: true };
            configuration(entity[key] as TEntity<any>, fullKeyArr);
          }
        } catch (err) {
          if (err instanceof Error) {
            err.message += `\n==> [${key}]`;
            throw err;
          } else {
            throw err;
          }
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
      } else {
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
      } else {
        result = result[splitItem];
      }
      if (result instanceof Array) {
        result = result[0];
      }
    }
    return result;
  }
}
