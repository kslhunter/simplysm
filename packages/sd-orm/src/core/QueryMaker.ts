import {DateOnly, Safe, Type, Uuid} from "../../../sd-core/src";
import {OrderByRule} from "../common/Enums";
import {QueryHelper} from "../common/QueryHelper";
import {QueriedBoolean, Queryable, QueryUnit} from "./Queryable";

export class QueryMaker<T> {
  public constructor(public entity: T) {
  }

  //
  // "QueriedBoolean"은 "true", "false"를 반환하는 상태
  // "Boolean"은 "1, 0"을 반환하는 상태
  //

  //----- and/or

  public and(...args: (QueryUnit<Boolean> | QueryUnit<QueriedBoolean> | Boolean | QueriedBoolean | boolean)[]): boolean {
    return new QueryUnit(QueriedBoolean, `(${args.map((item) => this._getQuery(item, false)).join(" AND ")})`) as any;
  }

  public or(...args: (QueryUnit<Boolean> | QueryUnit<QueriedBoolean> | Boolean | QueriedBoolean | boolean)[]): boolean {
    return new QueryUnit(QueriedBoolean, `(${args.map((item) => this._getQuery(item, false)).join(" OR ")})`) as any;
  }

  //----- Boolean

  public in<P>(src: QueryUnit<P> | P, target: (QueryUnit<P> | P)[]): boolean {
    if (target.length < 1) {
      return new QueryUnit(QueriedBoolean, "1 = 0") as any;
    }
    else {
      return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} IN (${this._getQuery(target)})`) as any;
    }
  }

  public notIn<P>(src: QueryUnit<P> | P, target: (QueryUnit<P> | P)[]): boolean {
    if (target.length < 1) {
      return new QueryUnit(QueriedBoolean, "1 = 1") as any;
    }
    else {
      return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} NOT IN (${this._getQuery(target)})`) as any;
    }
  }

  public equal<P>(src: QueryUnit<P> | P, target: QueryUnit<P> | P): boolean {
    return new QueryUnit(QueriedBoolean, `(${this._getQuery(src)} IS NULL AND ${this._getQuery(target)} IS NULL) OR ${this._getQuery(src)} = ${this._getQuery(target)}`) as any;
  }

  public notEqual<P>(src: QueryUnit<P> | P, target: QueryUnit<P> | P): boolean {
    return new QueryUnit(QueriedBoolean, `(${this._getQuery(src)} IS NOT NULL OR ${this._getQuery(target)} IS NOT NULL) AND ${this._getQuery(src)} != ${this._getQuery(target)}`) as any;
  }

  /**
   * 조건 숫자(target) 의 부호를 통해 "equal", "notEqual"을 결정하여 수행합니다.
   *
   *   - (+): src === target (equal)
   *   - (-): src !== target (notEqual)
   */
  public toggle(src: QueryUnit<number | undefined> | number | undefined, target: number): boolean {
    if (target < 0) {
      return this.and(
        this.or(
          this.equal(src, target),
          this.null(src)
        ),
        this.null(src)
      );
    }
    return this.equal(src, target);
  }

  public true<P>(src: QueryUnit<P> | P): boolean {
    if (src instanceof QueryUnit && src.type && src.type.name === "QueriedBoolean") {
      return new QueryUnit(QueriedBoolean, `${this._getQuery(src)}`) as any;
    }
    else {
      return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} > 0`) as any;
    }
  }

  public false<P>(src: QueryUnit<P> | P): boolean {
    return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} <= 0`) as any;
  }

  public null<P>(src: QueryUnit<P> | P): boolean {
    return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} IS NULL`) as any;
  }

  public notNull<P>(src: QueryUnit<P> | P): boolean {
    return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} IS NOT NULL`) as any;
  }

  public empty<P>(src: QueryUnit<P> | P): boolean {
    return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} IS NULL OR ${this._getQuery(src)} = ''`) as any;
  }

  public notEmpty<P>(src: QueryUnit<P> | P): boolean {
    return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} IS NOT NULL AND ${this._getQuery(src)} != ''`) as any;
  }

  public startsWith<P extends String>(src: QueryUnit<P> | P, target: QueryUnit<P> | P): boolean {
    return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} LIKE ${this._getQuery(target)} + '%'`) as any;
  }

  public endsWith<P extends String>(src: QueryUnit<P> | P, target: QueryUnit<P> | P): boolean {
    return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} LIKE '%' + ${this._getQuery(target)}`) as any;
  }

  public includes<P extends String>(src: QueryUnit<P> | P, target: QueryUnit<P> | P): boolean {
    return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} LIKE '%' + ${this._getQuery(target)} + '%'`) as any;
  }

  public notIncludes<P extends String>(src: QueryUnit<P> | P, target: QueryUnit<P> | P): boolean {
    return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} NOT LIKE '%' + ${this._getQuery(target)} + '%'`) as any;
  }

  public greaterThen<P>(src: QueryUnit<P> | P, target: QueryUnit<P> | P): boolean {
    return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} > ${this._getQuery(target)}`) as any;
  }

  public greaterThenOrEqual<P>(src: QueryUnit<P> | P, target: QueryUnit<P> | P): boolean {
    return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} >= ${this._getQuery(target)}`) as any;
  }

  public lessThen<P>(src: QueryUnit<P> | P, target: QueryUnit<P> | P): boolean {
    return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} < ${this._getQuery(target)}`) as any;
  }

  public lessThenOrEqual<P>(src: QueryUnit<P> | P, target: QueryUnit<P> | P): boolean {
    return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} <= ${this._getQuery(target)}`) as any;
  }

  public between<P>(target: QueryUnit<P> | P, range: (QueryUnit<P> | P)[] | undefined): boolean {
    const safeRange = Safe.arr(range);

    return this.and(
      this.or(
        this.null(safeRange[0]),
        this.greaterThenOrEqual(target, safeRange[0])
      ),
      this.or(
        this.null(safeRange[1]),
        this.lessThenOrEqual(target, safeRange[1])
      )
    );
  }

  //----- Function

  public ifNull<P>(src: QueryUnit<P> | P | undefined, replacement: QueryUnit<P> | P): P {
    const type = this._getType(replacement);
    return new QueryUnit(type, `ISNULL(${this._getQuery(src)}, ${this._getQuery(replacement)})`) as any;
  }

  public ifNullOrEmpty(src: QueryUnit<string> | string | undefined, replacement: QueryUnit<string> | string | undefined): string | undefined {
    const type = this._getType(replacement);
    return new QueryUnit(type, `CASE WHEN (${this._getQuery(src)} IS NULL OR ${this._getQuery(src)} = '') THEN ${this._getQuery(replacement)} ELSE ${this._getQuery(src)} END`) as any;
  }

  public formula<P>(...args: any[]): P {
    let query = "";
    for (let i = 0; i < args.length; i++) {
      if (!(i % 2)) {
        if (args[i] instanceof Array) {
          query += `(${this.formula.apply(this, args[i]).query}) `;
        }
        else {
          query += `${this._getQuery(args[i])} `;
        }
      }
      else {
        query += `${args[i]} `;
      }
    }

    const type = this._getType(args);
    return new QueryUnit(type, query) as any;
  }

  public cast<P>(src: any, targetType: Type<P>, length?: number): P {
    return new QueryUnit(targetType, `CONVERT(${QueryHelper.convertToDataType(targetType)}${length ? `(${length})` : ""}, ${this._getQuery(src)})`) as any;
  }

  public substr(str: (string | undefined), start: number, length: number): string {
    return new QueryUnit(String, `RTRIM(SUBSTRING(${this._getQuery(str)}, ${start + 1}, ${length}))`) as any;
  }

  public concat(...args: (String | string)[]): string {
    const data: String[] = [];
    for (const arg of args) {
      data.push(arg);
      data.push(" + ");
    }
    return this.formula.apply(this, data.slice(0, -1));
  }

  public aggregate<J, P>(qr: Queryable<J>,
                         queryFn: (qr: Queryable<J>) => Queryable<P>,
                         select: (en: P) => string,
                         separator: string): string {
    const queryable = new Queryable(qr.db, qr.tableType, qr, Uuid.newUuid().toString());
    const queryable2 = queryFn(queryable);

    let query = queryable2
      .select((q) => ({
        result: q.concat(separator, select(q.entity))
      }))
      .orderBy(
        (item) => [item.result, OrderByRule.ASC]
      )
      .query;

    query = `(\n\t${query.replace(/\n/g, "\n\t")}\n\tFOR XML PATH(''), TYPE\n).value('.', 'NVARCHAR(MAX)')`;
    query = `STUFF(\n\t${query.replace(/\n/g, "\n\t")}\n\t,1,1,''\n)`;
    return new QueryUnit(String, query) as any;
  }

  public maxOf<P>(arg1: P, arg2: P): P {
    return this.case(
      this.greaterThen(arg1, arg2),
      arg1
    ).else(arg2);
  }

  public round(src: QueryUnit<number> | number, len: QueryUnit<number> | number): number {
    return new QueryUnit(Number, `ROUND(${this._getQuery(src)}, ${this._getQuery(len)})`) as any;
  }

  public case<R>(when: boolean | QueryUnit<Boolean> | QueryUnit<QueriedBoolean>, then: QueryUnit<R> | R): CaseQueryMaker<R> {
    const type = this._getType(then);
    return new CaseQueryMaker(type).case(when, then);
  }

  //----- Grouped

  public sum(src: QueryUnit<number> | QueryUnit<number> | number | undefined): number | undefined {
    return new QueryUnit(Number, `SUM(${this._getQuery(src)})`) as any;
  }

  public min<S extends number | string | DateOnly | Date>(src: QueryUnit<S> | S | undefined): S | undefined {
    const type = this._getType(src);
    return new QueryUnit(type, `MIN(${this._getQuery(src)})`) as any;
  }

  public max<S extends number | string | DateOnly | Date>(src: QueryUnit<S> | S | undefined): S | undefined {
    const type = this._getType(src);
    return new QueryUnit(type, `MAX(${this._getQuery(src)})`) as any;
  }

  public count(src?: any): number {
    return new QueryUnit(Number, `ISNULL(COUNT(${src ? this._getQuery(src) : "*"}), 0)`) as any;
  }

  //----- Math

  public floor(arg: number): number {
    return new QueryUnit(Number, `FLOOR(${this._getQuery(arg)})`) as any;
  }

  //----- Helper
  /*
      map<T extends { [key: string]: any }, R extends { [key: string]: any }>(arg: (T[] | T | undefined), fn: (entity: T) => R): R | undefined {
          if (arg instanceof Array) {
              return fn(arg[0]);
          }
          else if (arg !== undefined) {
              return fn(arg);
          }
          else {
              return undefined;
          }
      }*/

  //----- Private

  private _getQuery<P>(param: QueryUnit<P> | P | undefined, shouldCastQueriedBoolean: boolean = true): string {
    return param !== undefined
      ? param instanceof QueryUnit
        ? (shouldCastQueriedBoolean && param.type && (param.type.name === "QueriedBoolean"))
          ? `CASE WHEN (${param.query}) THEN 1 ELSE 0 END`
          : param.query
        : this._value(param)
      : "NULL";
  }

  private _value(value: any): string {
    if (value instanceof QueryUnit) {
      return value.query;
    }
    else {
      return QueryHelper.escape(value);
    }
  }

  private _getType(arg: any): (Type<any> | undefined) {
    return arg !== undefined
      ? (
        arg instanceof Array
          ? this._getType(arg[0])
          : (
            arg instanceof QueryUnit
              ? arg.type
              : arg.constructor as Type<any>
          )
      )
      : undefined;
  }
}

export class CaseQueryMaker<T> {
  private _query = "CASE ";

  public constructor(private _type: Type<T> | undefined) {
  }

  public case(when: boolean | QueryUnit<Boolean> | QueryUnit<QueriedBoolean>, then: QueryUnit<T> | T | undefined): CaseQueryMaker<T> {
    this._query += `WHEN ${this._getQuery(when, false)} THEN ${this._getQuery(then)} `;
    return this as any;
  }

  public else(elseResult: QueryUnit<T> | T | undefined): T {
    this._query += `ELSE ${this._getQuery(elseResult)} END`;
    return new QueryUnit(this._type, this._query) as any;
  }

  private _getQuery<P>(param: QueryUnit<P> | P | undefined, shouldCastQueriedBoolean: boolean = true): string {
    return param !== undefined
      ? param instanceof QueryUnit
        ? (shouldCastQueriedBoolean && param.type && (param.type.name === "QueriedBoolean"))
          ? `CASE WHEN (${param.query}) THEN 1 ELSE 0 END`
          : param.query
        : this._value(param)
      : "NULL";
  }

  private _value(value: any): string {
    if (value instanceof QueryUnit) {
      return value.query;
    }
    else {
      return QueryHelper.escape(value);
    }
  }
}