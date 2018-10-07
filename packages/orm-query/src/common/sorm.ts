import {QueryUnit} from "../query-builder/QueryUnit";
import {QueryType} from "./QueryType";
import {ormHelpers} from "./ormHelpers";
import {DateOnly, DateTime, StripTypeWrap, Type} from "@simplism/core";
import {QueriedBoolean} from "./QueriedBoolean";


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

    this._cases.push(`WHEN ${ormHelpers.getWhereQuery(predicate)} THEN ${ormHelpers.getFieldQuery(then)}`);
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

    return new QueryUnit<T>(this._type as any, `CASE ${this._cases.join(" ")} ELSE ${ormHelpers.getFieldQuery(then)} END`) as any;
  }
}

export const sorm = {
  equal<T extends QueryType>(source: T | QueryUnit<T>, target: T | undefined | QueryUnit<T>): boolean {
    if (target === undefined) {
      return new QueryUnit(QueriedBoolean, ormHelpers.getFieldQuery(source) + " IS NULL") as any;
    }
    else {
      return new QueryUnit(QueriedBoolean, ormHelpers.getFieldQuery(source) + " = " + ormHelpers.getFieldQuery(target)) as any;
    }
  },
  notEqual<T extends QueryType>(source: T | QueryUnit<T>, target: T | undefined | QueryUnit<T>): boolean {
    if (target === undefined) {
      return new QueryUnit(QueriedBoolean, ormHelpers.getFieldQuery(source) + " IS NOT NULL") as any;
    }
    else {
      return new QueryUnit(QueriedBoolean, ormHelpers.getFieldQuery(source) + " != " + ormHelpers.getFieldQuery(target)) as any;
    }
  },
  null<T extends QueryType>(source: T | QueryUnit<T>): boolean {
    return new QueryUnit(QueriedBoolean, ormHelpers.getFieldQuery(source) + " IS NULL") as any;
  },
  notNull<T extends QueryType>(source: T | QueryUnit<T>): boolean {
    return new QueryUnit(QueriedBoolean, ormHelpers.getFieldQuery(source) + " IS NOT NULL") as any;
  },
  lessThen<T extends number | DateOnly | DateTime>(source: T, target: T): boolean {
    return new QueryUnit(QueriedBoolean, ormHelpers.getFieldQuery(source) + " < " + ormHelpers.getFieldQuery(target)) as any;
  },
  lessThenOrEqual<T extends number | DateOnly | DateTime>(source: T, target: T): boolean {
    return new QueryUnit(QueriedBoolean, ormHelpers.getFieldQuery(source) + " <= " + ormHelpers.getFieldQuery(target)) as any;
  },
  greaterThen<T extends number | DateOnly | DateTime>(source: T, target: T): boolean {
    return new QueryUnit(QueriedBoolean, ormHelpers.getFieldQuery(source) + " > " + ormHelpers.getFieldQuery(target)) as any;
  },
  greaterThenOrEqual<T extends number | DateOnly | DateTime>(source: T, target: T): boolean {
    return new QueryUnit(QueriedBoolean, ormHelpers.getFieldQuery(source) + " >= " + ormHelpers.getFieldQuery(target)) as any;
  },
  between<T extends number | DateOnly | DateTime>(source: T, from: T | undefined, to: T | undefined): boolean {
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
    return new QueryUnit(QueriedBoolean, ormHelpers.getFieldQuery(source) + " LIKE '%' + " + ormHelpers.getFieldQuery(target) + " + '%'") as any;
  },
  in<P extends QueryType>(src: P, target: P[]): boolean {
    if (target.length < 1) {
      return new QueryUnit(QueriedBoolean, "1 = 0") as any;
    }
    else {
      let query = "";
      if (!target.every(item => item === undefined)) {
        query = `${ormHelpers.getFieldQuery(src)} IN (${target.filterExists().map(item => ormHelpers.getFieldQuery(item)).join(", ")})`;
      }

      // @ts-ignore
      if (target.includes(undefined)) {
        query = `${query ? query + " OR " : ""}${ormHelpers.getFieldQuery(src)} IS NULL`;
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
        query = `${ormHelpers.getFieldQuery(src)} NOT IN (${target.filterExists().map(item => ormHelpers.getFieldQuery(item)).join(", ")})`;
      }

      // @ts-ignore
      if (target.includes(undefined)) {
        query = `${query ? query + " AND " : ""}${ormHelpers.getFieldQuery(src)} IS NOT NULL`;
      }
      return new QueryUnit(QueriedBoolean, query) as any;
    }
  },
  and(arg: boolean[]): boolean {
    return new QueryUnit(QueriedBoolean, "(" + arg.map(item => ormHelpers.getWhereQuery(item)).join(") AND (") + ")") as any;
  },
  or(arg: boolean[]): boolean {
    return new QueryUnit(QueriedBoolean, "(" + arg.map(item => ormHelpers.getWhereQuery(item)).join(") OR (") + ")") as any;
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
      const orArr1: boolean[] = [];
      for (const searchWord of searchWords) {
        orArr1.push(sorm.includes(source, searchWord));
      }
      orArr.push(sorm.or(orArr1));
    }
    return sorm.or(orArr);
  },
  count<T extends QueryType>(arg?: T): number | undefined {
    if (arg) {
      return new QueryUnit(Number as any, "COUNT(DISTINCT(" + ormHelpers.getFieldQuery(arg) + "))") as any;
    }
    else {
      return new QueryUnit(Number as any, "COUNT(*)") as any;
    }
  },
  exists<T extends QueryType>(arg: T): boolean {
    return sorm.greaterThen(sorm.ifNull(sorm.count(arg), 0), 0);
  },
  sum<T extends number | undefined>(unit: T | QueryUnit<T>): T | undefined {
    if (!(unit instanceof QueryUnit)) {
      throw new TypeError();
    }

    return new QueryUnit(unit.type, "SUM(" + ormHelpers.getFieldQuery(unit) + ")") as any;
  },
  max<T extends number | string | DateOnly | DateTime | undefined>(unit: T | QueryUnit<T>): T | undefined {
    if (!(unit instanceof QueryUnit)) {
      throw new TypeError();
    }

    return new QueryUnit(unit.type, "MAX(" + ormHelpers.getFieldQuery(unit) + ")") as any;
  },
  min<T extends number | string | DateOnly | DateTime | undefined>(unit: T | QueryUnit<T>): T | undefined {
    if (!(unit instanceof QueryUnit)) {
      throw new TypeError();
    }

    return new QueryUnit(unit.type, "MIN(" + ormHelpers.getFieldQuery(unit) + ")") as any;
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

    return new QueryUnit(type, "ISNULL(NULLIF(" + ormHelpers.getFieldQuery(source) + ", " + ormHelpers.getFieldQuery(predicate) + "), " + ormHelpers.getFieldQuery(target) + ")") as any;
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

    let cursorQuery = ormHelpers.getFieldQuery(source);
    for (const target of targets) {
      cursorQuery = "ISNULL(" + cursorQuery + ", " + ormHelpers.getFieldQuery(target) + ")";
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
    return new QueryUnit(Number as any, "DATALENGTH(" + ormHelpers.getFieldQuery(arg) + ")") as any;
  },
  cast<P extends QueryType>(src: any, targetType: Type<P>): StripTypeWrap<P> {
    return new QueryUnit(targetType, `CONVERT(${ormHelpers.getDataTypeFromType(targetType)}, ${ormHelpers.getFieldQuery(src)})`) as any;
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

    const query = `${ormHelpers.getFieldQuery(arg1)} ${arg2} ${ormHelpers.getFieldQuery(arg3)}`;
    return new QueryUnit(type, "(" + query + ")") as any;
  }
};