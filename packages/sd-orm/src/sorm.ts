import {QueriedBoolean, QueryType} from "./commons";
import {DateOnly, DateTime, StripTypeWrap, Type} from "@simplysm/sd-core";
import {QueryUnit} from "./QueryUnit";
import {QueryHelper} from "./QueryHelper";

export class CaseQueryable<T extends QueryType> {
  private readonly _cases: string[] = [];

  public constructor(private _type: Type<T> | undefined) {
  }

  public case(predicate: QueriedBoolean | QueryUnit<QueriedBoolean>, then: T | QueryUnit<T>): CaseQueryable<T> {
    if (!this._type) {
      if (then instanceof QueryUnit) {
        this._type = then.type;
      }
      else if (then) {
        this._type = then.constructor as any;
      }
      else {
        this._type = undefined;
      }
    }

    this._cases.push(`WHEN ${QueryHelper.getWhereQuery(predicate)} THEN ${QueryHelper.getFieldQuery(then)}`);
    return this;
  }

  public else(then: T | QueryUnit<T>): T {
    if (!this._type) {
      if (then instanceof QueryUnit) {
        this._type = then.type;
      }
      else if (then) {
        this._type = then.constructor as any;
      }
      else {
        this._type = undefined;
      }
    }

    return new QueryUnit<T>(this._type as any, `CASE ${this._cases.join(" ")} ELSE ${QueryHelper.getFieldQuery(then)} END`) as any;
  }
}

export const sorm = {
  equal<T extends QueryType>(source: T | QueryUnit<T>, target: T | undefined | QueryUnit<T>): boolean {
    if (target === undefined) {
      return new QueryUnit(QueriedBoolean, QueryHelper.getFieldQuery(source) + " IS NULL") as any;
    }
    else {
      return new QueryUnit(QueriedBoolean, QueryHelper.getFieldQuery(source) + " = " + QueryHelper.getFieldQuery(target)) as any;
    }
  },
  notEqual<T extends QueryType>(source: T | QueryUnit<T>, target: T | undefined | QueryUnit<T>): boolean {
    if (target === undefined) {
      return new QueryUnit(QueriedBoolean, QueryHelper.getFieldQuery(source) + " IS NOT NULL") as any;
    }
    else {
      return new QueryUnit(QueriedBoolean, QueryHelper.getFieldQuery(source) + " != " + QueryHelper.getFieldQuery(target)) as any;
    }
  },
  null<T extends QueryType>(source: T | QueryUnit<T>): boolean {
    return new QueryUnit(QueriedBoolean, QueryHelper.getFieldQuery(source) + " IS NULL") as any;
  },
  notNull<T extends QueryType>(source: T | QueryUnit<T>): boolean {
    return new QueryUnit(QueriedBoolean, QueryHelper.getFieldQuery(source) + " IS NOT NULL") as any;
  },
  nullOrEmpty(source: undefined | string | QueryUnit<string | undefined>): boolean {
    return this.or([
      this.null(source),
      this.equal(source, "")
    ]);
  },
  notNullOrEmpty(source: undefined | string | QueryUnit<string | undefined>): boolean {
    return this.and([
      this.notNull(source),
      this.notEqual(source, "")
    ]);
  },
  lessThen<T extends number | DateOnly | DateTime>(source: T | undefined, target: T | undefined): boolean {
    return new QueryUnit(QueriedBoolean, QueryHelper.getFieldQuery(source) + " < " + QueryHelper.getFieldQuery(target)) as any;
  },
  lessThenOrEqual<T extends number | DateOnly | DateTime>(source: T | undefined, target: T | undefined): boolean {
    return new QueryUnit(QueriedBoolean, QueryHelper.getFieldQuery(source) + " <= " + QueryHelper.getFieldQuery(target)) as any;
  },
  greaterThen<T extends number | DateOnly | DateTime>(source: T | undefined, target: T | undefined): boolean {
    return new QueryUnit(QueriedBoolean, QueryHelper.getFieldQuery(source) + " > " + QueryHelper.getFieldQuery(target)) as any;
  },
  greaterThenOrEqual<T extends number | DateOnly | DateTime>(source: T | undefined, target: T | undefined): boolean {
    return new QueryUnit(QueriedBoolean, QueryHelper.getFieldQuery(source) + " >= " + QueryHelper.getFieldQuery(target)) as any;
  },
  between<T extends number | DateOnly | DateTime>(source: T | undefined, from: T | undefined, to: T | undefined): boolean {
    const result: boolean[] = [];
    if (from) {
      result.push(this.greaterThenOrEqual(source, from));
    }
    if (to) {
      result.push(this.lessThenOrEqual(source, to));
    }

    return this.and(result);
  },
  includes(source: string | undefined, target: string | undefined): boolean {
    return new QueryUnit(QueriedBoolean, QueryHelper.getFieldQuery(source) + " LIKE '%' + " + QueryHelper.getFieldQuery(target) + " + '%'") as any;
  },
  in<P extends QueryType>(src: P, target: P[]): boolean {
    if (target.length < 1) {
      return new QueryUnit(QueriedBoolean, "1 = 0") as any;
    }
    else {
      let query = "";
      if (!target.every(item => item === undefined)) {
        query = `${QueryHelper.getFieldQuery(src)} IN (${target.filterExists().map(item => QueryHelper.getFieldQuery(item)).join(", ")})`;
      }

      // @ts-ignore
      if (target.includes(undefined)) {
        query = `${query ? query + " OR " : ""}${QueryHelper.getFieldQuery(src)} IS NULL`;
      }
      return new QueryUnit(QueriedBoolean, query) as any;
    }
  },
  notIn<P extends QueryType>(src: P, target: P[]): boolean {
    if (target.length < 1) {
      return new QueryUnit(QueriedBoolean, "1 = 1") as any;
    }
    else {
      let query = "";
      if (!target.every(item => item === undefined)) {
        query = `${QueryHelper.getFieldQuery(src)} NOT IN (${target.filterExists().map(item => QueryHelper.getFieldQuery(item)).join(", ")})`;
      }

      // @ts-ignore
      if (target.includes(undefined)) {
        query = `${query ? query + " AND " : ""}${QueryHelper.getFieldQuery(src)} IS NOT NULL`;
      }
      return new QueryUnit(QueriedBoolean, query) as any;
    }
  },
  and(arg: boolean[]): boolean {
    return new QueryUnit(QueriedBoolean, "(" + arg.map(item => QueryHelper.getWhereQuery(item)).join(") AND (") + ")") as any;
  },
  or(arg: boolean[]): boolean {
    return new QueryUnit(QueriedBoolean, "(" + arg.map(item => QueryHelper.getWhereQuery(item)).join(") OR (") + ")") as any;
  },
  search(sources: (string | undefined)[], searchText: string): boolean {
    if (!searchText) {
      return new QueryUnit(QueriedBoolean, "1 = 1") as any;
    }

    const searchWords = searchText.split(" ").filter(item => item);
    if (searchWords.length < 1) {
      return new QueryUnit(QueriedBoolean, "1 = 1") as any;
    }

    const orArr: boolean[] = [];
    for (const source of sources) {
      const andArr: boolean[] = [];
      for (const searchWord of searchWords) {
        andArr.push(sorm.includes(source, searchWord));
      }
      orArr.push(sorm.and(andArr));
    }
    return sorm.or(orArr);
  },
  count<T extends QueryType>(arg?: T): number | undefined {
    if (arg) {
      return new QueryUnit(Number as any, "COUNT(DISTINCT(" + QueryHelper.getFieldQuery(arg) + "))") as any;
    }
    else {
      return new QueryUnit(Number as any, "COUNT(*)") as any;
    }
  },
  exists<T extends QueryType>(arg: T): boolean {
    return sorm.greaterThen(sorm.ifNull(sorm.count(arg), 0), 0);
  },
  notExists<T extends QueryType>(arg: T): boolean {
    return sorm.lessThenOrEqual(sorm.ifNull(sorm.count(arg), 0), 0);
  },
  sum<T extends number | undefined>(unit: T | QueryUnit<T>): T | undefined {
    if (!(unit instanceof QueryUnit)) {
      throw new TypeError();
    }

    return new QueryUnit(unit.type, "SUM(" + QueryHelper.getFieldQuery(unit) + ")") as any;
  },
  max<T extends number | string | DateOnly | DateTime | undefined>(unit: T | QueryUnit<T>): T | undefined {
    if (!(unit instanceof QueryUnit)) {
      throw new TypeError();
    }

    return new QueryUnit(unit.type, "MAX(" + QueryHelper.getFieldQuery(unit) + ")") as any;
  },
  min<T extends number | string | DateOnly | DateTime | undefined>(unit: T | QueryUnit<T>): T | undefined {
    if (!(unit instanceof QueryUnit)) {
      throw new TypeError();
    }

    return new QueryUnit(unit.type, "MIN(" + QueryHelper.getFieldQuery(unit) + ")") as any;
  },

  if<T extends QueryType, R extends T>(source: T | QueryUnit<T>, predicate: T | QueryUnit<T>, target: R | QueryUnit<R>): R extends undefined ? R : NonNullable<R> {
    let type;
    if (source instanceof QueryUnit) {
      type = source.type;
    }
    else if (target instanceof QueryUnit) {
      type = target.type;
    }
    else {
      throw new TypeError();
    }

    return new QueryUnit(type, "ISNULL(NULLIF(" + QueryHelper.getFieldQuery(source) + ", " + QueryHelper.getFieldQuery(predicate) + "), " + QueryHelper.getFieldQuery(target) + ")") as any;
  },
  ifNull<T extends QueryType, R extends T>(source: T, ...targets: R[]): R extends undefined ? R : NonNullable<R> {
    let type;
    if (source instanceof QueryUnit) {
      type = source.type;
    }
    else if (targets.ofType(QueryUnit).length > 0) {
      type = targets.ofType(QueryUnit)[0].type;
    }
    else {
      throw new TypeError();
    }

    let cursorQuery = QueryHelper.getFieldQuery(source);
    for (const target of targets) {
      cursorQuery = "ISNULL(" + cursorQuery + ", " + QueryHelper.getFieldQuery(target) + ")";
    }

    return new QueryUnit(type, cursorQuery) as any;
  },
  case<T extends QueryType>(predicate: boolean | QueryUnit<QueriedBoolean>, then: T | QueryUnit<T>): CaseQueryable<T> {
    let type: any;
    if (then instanceof QueryUnit) {
      type = then.type;
    }
    else if (then) {
      type = then.constructor;
    }
    else {
      type = undefined;
    }

    const caseQueryable = new CaseQueryable<T>(type);
    return caseQueryable.case(predicate, then);
  },
  dataLength<T extends QueryType>(arg: T): number | undefined {
    return new QueryUnit(Number as any, "DATALENGTH(" + QueryHelper.getFieldQuery(arg) + ")") as any;
  },
  cast<P extends QueryType>(src: any, targetType: Type<P>): StripTypeWrap<P> {
    return new QueryUnit(targetType, `CONVERT(${QueryHelper.getDataTypeFromType(targetType)}, ${QueryHelper.getFieldQuery(src)})`) as any;
  },
  left(src: string | QueryUnit<string>, num: number): string {
    return new QueryUnit(String, "LEFT(" + QueryHelper.getFieldQuery(src) + ", " + num + ")") as any;
  },
  right(src: string | QueryUnit<string>, num: number): string {
    return new QueryUnit(String, "RIGHT(" + QueryHelper.getFieldQuery(src) + ", " + num + ")") as any;
  },
  replace(src: string | undefined | QueryUnit<string | undefined>, from: string, to: string): string {
    return new QueryUnit(String, "REPLACE(" + QueryHelper.getFieldQuery(src) + ", " + QueryHelper.getFieldQuery(from) + ", " + QueryHelper.getFieldQuery(to) + ")") as any;
  },
  formula<T extends QueryType>(arg1: T | QueryUnit<T>, arg2: string, arg3: T | QueryUnit<T>): StripTypeWrap<T> {
    let type: any;
    const argForType = arg1 || arg3;
    if (argForType instanceof QueryUnit) {
      type = argForType.type;
    }
    else if (argForType !== undefined) {
      type = argForType["constructor"];
    }
    else {
      throw new Error("타입을 알 수 없습니다.");
    }

    const query = `${QueryHelper.getFieldQuery(arg1)} ${arg2} ${QueryHelper.getFieldQuery(arg3)}`;
    return new QueryUnit(type, "(" + query + ")") as any;
  },
  query<T extends QueryType>(q: string, targetType: Type<T>): StripTypeWrap<T> | undefined {
    return new QueryUnit(targetType, q) as any;
  }
};
