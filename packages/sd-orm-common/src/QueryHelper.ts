import {
  ISelectQueryDef,
  TDbDateSeparator,
  TEntityValue,
  TEntityValueOrQueryableOrArray,
  TQueryBuilderValue,
  TQueryValue
} from "./commons";
import { QueryUnit } from "./QueryUnit";
import { DateOnly, DateTime, Time, Type, Uuid, WrappedType } from "@simplysm/sd-core-common";
import { Queryable } from "./Queryable";
import { SdOrmUtil } from "./utils/SdOrmUtil";
import { TSdOrmDataType } from "./SdOrmDataType";
import { CaseWhenQueryHelper } from "./CaseWhenQueryHelper";
import { CaseQueryHelper } from "./CaseQueryHelper";

export class QueryHelper {
  public constructor(private readonly _dialect: "mysql" | "mssql" | "mssql-azure") {
  }

  // ----------------------------------------------------
  // WHERE
  // ----------------------------------------------------
  // region WHERE
  public equal<T extends TQueryValue>(source: TEntityValue<T>, target: TEntityValue<T | undefined>): TQueryBuilderValue {
    if (target === undefined) {
      return this.isNull(source);
    }

    if (this._dialect === "mysql") {
      return [this.getQueryValue(source), " <=> ", this.getQueryValue(target)];
    }
    else {
      if (source instanceof QueryUnit && target instanceof QueryUnit) {
        return this.or([
          this.and([this.isNull(source), this.isNull(target)]),
          [this.getQueryValue(source), " = ", this.getQueryValue(target)]
        ]);
      }
      else {
        return [this.getQueryValue(source), " = ", this.getQueryValue(target)];
      }
    }
  }

  public notEqual<T extends TQueryValue>(source: TEntityValue<T>, target: TEntityValue<T | undefined>): TQueryBuilderValue[] {
    if (target === undefined) {
      return this.isNotNull(source);
    }
    else if (source instanceof QueryUnit && target instanceof QueryUnit) {
      return this.or([
        this.and([this.isNull(source), this.isNotNull(target)]),
        this.and([this.isNotNull(source), this.isNull(target)]),
        [this.getQueryValue(source), " != ", this.getQueryValue(target)]
      ]);
    }
    else {
      return this.or([
        this.isNull(source),
        [this.getQueryValue(source), " != ", this.getQueryValue(target)]
      ]);
    }
  }

  public isNull<T extends TQueryValue>(source: TEntityValue<T>): TQueryBuilderValue[] {
    return [this.getQueryValue(source), " IS ", "NULL"];
  }

  public isNotNull<T extends TQueryValue>(source: TEntityValue<T>): TQueryBuilderValue[] {
    return [this.getQueryValue(source), " IS NOT ", "NULL"];
  }

  public isFalse<T extends TQueryValue>(source: TEntityValue<T>): TQueryBuilderValue[] {
    return this.or([
      this.isNull(source),
      this.equal(source, false as any)
    ]);
  }

  public isTrue<T extends TQueryValue>(source: TEntityValue<T>): TQueryBuilderValue[] {
    return this.and([
      this.isNotNull(source),
      this.equal(source, true as any)
    ]);
  }

  public lessThen<T extends number | Number | DateOnly | DateTime | Time>(source: TEntityValue<T | undefined>, target: TEntityValue<T | undefined>): TQueryBuilderValue[] {
    return [this.getQueryValue(source), " < ", this.getQueryValue(target)];
  }

  public lessThenOrEqual<T extends number | Number | DateOnly | DateTime | Time>(source: TEntityValue<T | undefined>, target: TEntityValue<T | undefined>): TQueryBuilderValue[] {
    return [this.getQueryValue(source), " <= ", this.getQueryValue(target)];
  }

  public greaterThen<T extends number | Number | DateOnly | DateTime | Time>(source: TEntityValue<T | undefined>, target: TEntityValue<T | undefined>): TQueryBuilderValue[] {
    return [this.getQueryValue(source), " > ", this.getQueryValue(target)];
  }

  public greaterThenOrEqual<T extends number | Number | DateOnly | DateTime | Time>(source: TEntityValue<T | undefined>, target: TEntityValue<T | undefined>): TQueryBuilderValue[] {
    return [this.getQueryValue(source), " >= ", this.getQueryValue(target)];
  }

  public between<T extends number | Number | DateOnly | DateTime | Time>(source: TEntityValue<T | undefined>, from: TEntityValue<T | undefined>, to: TEntityValue<T | undefined>): TQueryBuilderValue[] {
    if (from != null || to != null) {
      return this.and([
        from != null ? this.greaterThenOrEqual(source, from) : undefined,
        to != null ? this.lessThenOrEqual(source, to) : undefined
      ].filterExists());
    }
    else {
      return [];
    }
  }

  public includes(source: TEntityValue<string | undefined>, target: TEntityValue<string | undefined>): TQueryBuilderValue[] {
    return [this.getQueryValue(source), " LIKE ", this.concat("%", target, "%").query];
  }

  public notIncludes(source: TEntityValue<string | undefined>, target: TEntityValue<string | undefined>): TQueryBuilderValue[] {
    return this.or([
      this.isNull(source),
      [this.getQueryValue(source), " NOT LIKE ", this.concat("%", target, "%").query]
    ]);
  }

  public like(source: TEntityValue<string | undefined>, target: TEntityValue<string | undefined>): TQueryBuilderValue[] {
    return [this.getQueryValue(source), " LIKE ", this.getQueryValue(target)];
  }

  public notLike(source: TEntityValue<string | undefined>, target: TEntityValue<string | undefined>): TQueryBuilderValue[] {
    return this.or([
      this.isNull(source),
      [this.getQueryValue(source), " NOT LIKE ", this.getQueryValue(target)]
    ]);
  }

  public startsWith(source: TEntityValue<string | undefined>, target: TEntityValue<string | undefined>): TQueryBuilderValue[] {
    return [this.getQueryValue(source), " LIKE ", this.getQueryValue(target), " + ", "'%'"];
  }

  public endsWith(source: TEntityValue<string | undefined>, target: TEntityValue<string | undefined>): TQueryBuilderValue[] {
    return [this.getQueryValue(source), " LIKE ", "'%'", " + ", this.getQueryValue(target)];
  }

  public in<P extends TQueryValue>(src: TEntityValue<P>, target: (TEntityValue<P | undefined>)[]): TQueryBuilderValue[] {
    if (target.length < 1) {
      return ["1", " = ", "0"];
    }
    else {
      if (target.every((item) => item === undefined)) {
        return this.isNull(src);
      }

      const result = [this.getQueryValue(src), " IN ", target.filterExists().mapMany((item) => [this.getQueryValue(item), ", "]).slice(0, -1)];
      if (target.includes(undefined)) {
        return this.or([
          result,
          this.isNull(src)
        ]);
      }

      return result;
    }
  }

  public notIn<P extends TQueryValue>(src: TEntityValue<P>, target: (TEntityValue<P | undefined>)[]): TQueryBuilderValue[] {
    if (target.length < 1) {
      return ["1", " = ", "1"];
    }
    else {
      if (target.every((item) => item === undefined)) {
        return this.isNull(src);
      }

      const result = [this.getQueryValue(src), " NOT IN ", target.filterExists().mapMany((item) => [this.getQueryValue(item), ", "]).slice(0, -1)];
      if (!target.includes(undefined)) {
        return this.or([
          result,
          this.isNull(src)
        ]);
      }

      return result;
    }
  }

  public and(args: TEntityValueOrQueryableOrArray<any, any>[]): TQueryBuilderValue[] {
    const result: TQueryBuilderValue[] = [];
    for (const arg of args) {
      const queryValue = this.getQueryValue(arg);
      if (typeof queryValue !== "undefined") {
        result.push(...[queryValue, " AND "]);
      }
    }
    return result.slice(0, -1);
  }

  public or(args: TEntityValueOrQueryableOrArray<any, any>[]): TQueryBuilderValue[] {
    const result: TQueryBuilderValue[] = [];
    for (const arg of args) {
      const queryValue = this.getQueryValue(arg);
      result.push(...[queryValue, " OR "]);
    }
    return result.slice(0, -1);
  }

  // endregion

  // ----------------------------------------------------
  // FIELD
  // ----------------------------------------------------
  // region FIELD
  public query<T extends TQueryValue>(type: Type<WrappedType<T>>, texts: (string | QueryUnit<any>)[]): QueryUnit<T> {
    const arr: string[] = [];
    for (const text of texts) {
      if (text instanceof QueryUnit) {
        arr.push(this.getQueryValue(text));
      }
      else {
        arr.push(text);
      }
    }
    return new QueryUnit(type, arr);
  }

  public val<T extends TQueryValue>(value: TEntityValue<T>, type?: Type<WrappedType<NonNullable<T>>>): QueryUnit<T> {
    const currType: Type<any> | undefined = type ?? SdOrmUtil.getQueryValueType(value);
    return new QueryUnit(currType, this.getQueryValue(value));
  }

  public is(where: TQueryBuilderValue[]): QueryUnit<boolean> {
    return this.case<boolean>(where, true).else(false);
  }

  public dateDiff<T extends DateTime | DateOnly | Time>(separator: TDbDateSeparator, from: TEntityValue<T | 0>, to: TEntityValue<T | 0>): QueryUnit<number> {
    return new QueryUnit<number>(Number, ["DATEDIFF(", separator, ", ", this.getQueryValue(from), ", ", this.getQueryValue(to), ")"]);
  }

  public dateAdd<T extends DateTime | DateOnly | Time>(separator: TDbDateSeparator, from: TEntityValue<T | 0>, value: TEntityValue<number>): QueryUnit<T> {
    const type = SdOrmUtil.getQueryValueType(from);

    return new QueryUnit(type, ["DATEADD(", separator, ", ", this.getQueryValue(value), ", ", this.getQueryValue(from), ")"]) as any;
  }

  public year<T extends DateTime | DateOnly>(value: TEntityValue<T>): QueryUnit<number> {
    return new QueryUnit<number>(Number, ["YEAR(", this.getQueryValue(value), ")"]);
  }

  public ifNull<S extends TQueryValue, T extends TQueryValue>(source: TEntityValue<S>, ...targets: TEntityValue<T>[]): QueryUnit<S extends undefined ? T : S> {
    let cursorQuery: TQueryBuilderValue = this.getQueryValue(source);
    let type: Type<any> | undefined = SdOrmUtil.getQueryValueType(source);

    for (const target of targets) {
      if (this._dialect === "mysql") {
        cursorQuery = ["IFNULL(", cursorQuery, ", ", this.getQueryValue(target), ")"];
      }
      else {
        cursorQuery = ["ISNULL(", cursorQuery, ", ", this.getQueryValue(target), ")"];
      }
      type = type ?? SdOrmUtil.getQueryValueType(target);
    }

    return new QueryUnit(type, cursorQuery);
  }

  public case<T extends TQueryValue>(predicate: TEntityValue<boolean | Boolean> | TQueryBuilderValue, then: TEntityValue<T>): CaseQueryHelper<T> {
    const type = SdOrmUtil.getQueryValueType(then);
    const caseQueryable = new CaseQueryHelper(this, type);
    return caseQueryable.case(predicate, then);
  }

  public caseWhen<T extends TQueryValue>(arg: TEntityValue<TQueryValue>): CaseWhenQueryHelper<T> {
    return new CaseWhenQueryHelper(this, arg);
  }

  public dataLength<T extends TQueryValue>(arg: TEntityValue<T>): QueryUnit<number> {
    if (this._dialect === "mysql") {
      return new QueryUnit<number>(Number, ["LENGTH(", this.getQueryValue(arg), ")"]);
    }
    else {
      return new QueryUnit<number>(Number, ["DATALENGTH(", this.getQueryValue(arg), ")"]);
    }
  }

  public stringLength(arg: TEntityValue<String | string>): QueryUnit<number> {
    return new QueryUnit<number>(Number, ["LEN(", this.getQueryValue(arg), ")"]);
  }

  public cast<T extends TQueryValue>(src: TEntityValue<TQueryValue>, targetType: Type<T>): QueryUnit<T> {
    if (this._dialect === "mysql") {
      return new QueryUnit(targetType, ["CONVERT(", this.getQueryValue(src), ", ", this.mysqlConvertType(targetType), ")"]);
    }
    else {
      return new QueryUnit(targetType, ["CONVERT(", this.type(targetType), ", ", this.getQueryValue(src), ")"]);
    }
  }

  public left(src: TEntityValue<string | String | undefined>, num: TEntityValue<number | Number>): QueryUnit<string> {
    return new QueryUnit<string>(String, ["LEFT(", this.getQueryValue(src), ", ", this.getQueryValue(num), ")"]);
  }

  public right(src: TEntityValue<string | String | undefined>, num: TEntityValue<number | Number>): QueryUnit<string> {
    return new QueryUnit<string>(String, ["RIGHT(", this.getQueryValue(src), ", ", this.getQueryValue(num), ")"]);
  }

  public replace(src: TEntityValue<string | String | undefined>, from: TEntityValue<String | string>, to: TEntityValue<String | string>): QueryUnit<string> {
    return new QueryUnit<string>(String, [
      "REPLACE(",
      this.getQueryValue(src),
      ", ",
      this.getQueryValue(from),
      ", ",
      this.getQueryValue(to),
      ")"
    ]);
  }

  public concat(...args: TEntityValue<string | String | number | Number | undefined>[]): QueryUnit<string> {
    if (this._dialect === "mysql") {
      return new QueryUnit<string>(String, [
        "CONCAT(",
        ...args.mapMany((arg) => [arg !== undefined ? this.ifNull(arg, "").query : "", ", "]).slice(0, -1),
        ")"
      ]);
    }
    else {
      return new QueryUnit<string>(String, [
        ...args.mapMany((arg) => [arg !== undefined ? this.ifNull(arg, "").query : "", " + "]).slice(0, -1)
      ]);
    }
  }

  // endregion


  // ----------------------------------------------------
  // GROUPING FIELD
  // ----------------------------------------------------
  // region GROUPING FIELD

  public count<T extends TQueryValue>(arg?: TEntityValue<T>): QueryUnit<number> {
    if (arg !== undefined) {
      return new QueryUnit<number>(Number, ["COUNT(DISTINCT(", this.getQueryValue(arg), "))"]);
    }
    else {
      return new QueryUnit<number>(Number, "COUNT(*)");
    }
  }

  public sum<T extends number | Number | undefined>(arg: TEntityValue<T>): QueryUnit<T extends undefined ? (undefined | number) : number> {
    return new QueryUnit<number | undefined>(Number, ["SUM(", this.getQueryValue(arg), ")"]) as any;
  }

  public avg<T extends number | Number>(arg: TEntityValue<T | undefined>): QueryUnit<number | undefined> {
    return new QueryUnit<number | undefined>(Number, ["AVG(", this.getQueryValue(arg), ")"]);
  }

  public round<T extends number | Number>(arg: TEntityValue<T | undefined>, len: number): QueryUnit<number | undefined> {
    return new QueryUnit<number | undefined>(Number, ["ROUND(", this.getQueryValue(arg), ", ", len, ")"]);
  }

  public max<T extends undefined | number | Number | string | String | DateOnly | DateTime | Time>(unit: TEntityValue<T>): QueryUnit<T> {
    const type = SdOrmUtil.getQueryValueType(unit);
    if (!type) throw new TypeError();

    return new QueryUnit(type, ["MAX(", this.getQueryValue(unit), ")"]);
  }

  public min<T extends undefined | number | Number | string | String | DateOnly | DateTime | Time>(unit: TEntityValue<T>): QueryUnit<T> {
    const type = SdOrmUtil.getQueryValueType(unit);
    if (!type) throw new TypeError();

    return new QueryUnit(type, ["MIN(", this.getQueryValue(unit), ")"]);
  }

  public exists<T extends TQueryValue>(arg: TEntityValue<T>): QueryUnit<boolean> {
    return this.case(this.greaterThen(this.ifNull(this.count(arg), 0), 0), true as boolean).else(false);
  }

  public notExists<T extends TQueryValue>(arg: TEntityValue<T>): QueryUnit<boolean> {
    return this.case(this.lessThenOrEqual(this.ifNull(this.count(arg), 0), 0), true as boolean).else(false);
  }

  // endregion

  // ----------------------------------------------------
  // HELPER
  // ----------------------------------------------------
  // region HELPER

  public getQueryValue(value: TEntityValue<any>): string;
  public getQueryValue(value: Queryable<any, any>): ISelectQueryDef;
  public getQueryValue(value: TEntityValue<any> | Queryable<any, any>): string | ISelectQueryDef {
    if (value instanceof QueryUnit) {
      if (value.query instanceof Array) {
        return this._getQueryValueArray(value.query);
      }
      else if (value.query instanceof QueryUnit) {
        return this.getQueryValue(value.query);
      }
      else if (value.query instanceof Queryable) {
        return this.getQueryValue(value.query);
      }
      else {
        return value.query;
      }
    }
    else if (typeof value === "string") {
      if (this._dialect === "mysql") {
        return `'${value.replace(/'/g, "''")}'`;
      }
      else {
        return `N'${value.replace(/'/g, "''")}'`;
      }
    }
    else if (typeof value === "boolean") {
      return value ? "1" : "0";
    }
    else if (value instanceof DateTime) {
      if (this._dialect === "mysql") {
        return "STR_TO_DATE('" + value.toFormatString("yyyy-MM-dd HH:mm:ss") + "', '%Y-%m-%d %H:%i:%s')";
      }
      else {
        return "'" + value.toFormatString("yyyy-MM-dd HH:mm:ss") + "'";
      }
      // "select"할때 어차피 "fff"를 못가져오는 관계로, 아래 코드 주석
      // (차후에 "tedious"가 업데이트 되면, 다시 "fff를 넣어야 할 수도 있음)
      // return "'" + arg.toFormatString("yyyy-MM-dd HH:mm:ss.fff") + "'";
    }
    else if (value instanceof DateOnly) {
      if (this._dialect === "mysql") {
        return "STR_TO_DATE('" + value.toFormatString("yyyy-MM-dd") + "', '%Y-%m-%d')";
      }
      else {
        return "'" + value.toFormatString("yyyy-MM-dd") + "'";
      }
    }
    else if (value instanceof Time) {
      return "'" + value.toFormatString("HH:mm:ss") + "'";
    }
    else if (value instanceof Buffer) {
      return `0x${value.toString("hex")}`;
    }
    else if (value instanceof Uuid) {
      if (this._dialect === "mysql") {
        return "'" + value.toString().replace(/-/g, "") + "'";
      }
      else {
        return "'" + value.toString() + "'";
      }
    }
    else if (value instanceof Queryable) {
      const selectDef = value.getSelectQueryDef();
      if (selectDef.top !== 1) {
        throw new Error("하나의 필드를 추출하기 위한 내부쿼리에서는 반드시 TOP 1 이 지정 되야 합니다.");
      }
      if (Object.keys(selectDef.select).length > 1) {
        throw new Error("하나의 필드를 추출하기 위한 내부쿼리에서는 반드시 하나의 컬럼만 SELECT 되야 합니다.");
      }

      return selectDef;
    }
    else if (value == null) {
      return "NULL";
    }
    else {
      return value;
    }
  }


  public getBulkInsertQueryValue(value: TEntityValue<any>): any {
    if (value instanceof QueryUnit) {
      if (value.query instanceof Array) {
        return this._getBulkInsertQueryValueArray(value.query);
      }
      else if (value.query instanceof QueryUnit) {
        return this.getBulkInsertQueryValue(value.query);
      }
      else if (value.query instanceof Queryable) {
        return this.getBulkInsertQueryValue(value.query);
      }
      else {
        return value.query;
      }
    }
    else if (typeof value === "string") {
      return value;
    }
    else if (typeof value === "boolean") {
      return value ? "1" : "0";
    }
    else if (value instanceof DateTime) {
      return value.date;
    }
    else if (value instanceof DateOnly) {
      return value.date;
    }
    else if (value instanceof Time) {
      return value.toFormatString("HH:mm:ss");
    }
    else if (value instanceof Buffer) {
      return `0x${value.toString("hex")}`;
    }
    else if (value instanceof Uuid) {
      return value.toString();
    }
    else if (value instanceof Queryable) {
      const selectDef = value.getSelectQueryDef();
      if (selectDef.top !== 1) {
        throw new Error("하나의 필드를 추출하기 위한 내부쿼리에서는 반드시 TOP 1 이 지정 되야 합니다.");
      }
      if (typeof selectDef.select !== "undefined" || Object.keys(selectDef.select).length > 1) {
        throw new Error("하나의 필드를 추출하기 위한 내부쿼리에서는 반드시 하나의 컬럼만 SELECT 되야 합니다.");
      }

      return selectDef;
    }
    else {
      return value;
    }
  }

  private _getBulkInsertQueryValueArray(arr: any[]): TEntityValueOrQueryableOrArray<any, any> {
    return arr.map((item) => {
      if (item instanceof Array) {
        return this._getBulkInsertQueryValueArray(item);
      }
      else if (item instanceof QueryUnit) {
        return this.getBulkInsertQueryValue(item);
      }
      else if (item instanceof Queryable) {
        return this.getBulkInsertQueryValue(item);
      }
      else {
        return item;
      }
    });
  }

  private _getQueryValueArray(arr: any[]): TEntityValueOrQueryableOrArray<any, any> {
    return arr.map((item) => {
      if (item instanceof Array) {
        return this._getQueryValueArray(item);
      }
      else if (item instanceof QueryUnit) {
        return this.getQueryValue(item);
      }
      else if (item instanceof Queryable) {
        return this.getQueryValue(item);
      }
      else {
        return item;
      }
    });
  }

  public type(type: Type<TQueryValue> | TSdOrmDataType | string | undefined): string {
    if (typeof type === "string") {
      return type;
    }
    else if (type?.["type"] !== undefined) {
      const currType = type as TSdOrmDataType;
      switch (currType.type) {
        case "TEXT":
          return this._dialect === "mysql" ? "LONGTEXT" : "NTEXT";
        case "DECIMAL":
          return "DECIMAL(" + currType.precision + ((currType.digits == null || currType.digits === 0) ? "" : (", " + currType.digits)) + ")";
        case "STRING":
          if (this._dialect === "mysql" && currType.length === "MAX") {
            return "LONGTEXT";
          }
          else {
            return "NVARCHAR(" + (currType.length ?? "255") + ")";
          }
        case "FIXSTRING":
          return "NCHAR(" + currType.length + ")";
        case "BINARY":
          if (this._dialect === "mysql") {
            const len = (currType.length ?? "MAX");
            if (len === "MAX") {
              return "LONGBLOB";
            }
            else {
              return "VARBINARY(" + len + ")";
            }
          }
          else {
            return "VARBINARY(" + (currType.length ?? "MAX") + ")";
          }
        default:
          throw new TypeError();
      }
    }
    else {
      const currType = type as Type<TQueryValue> | undefined;
      switch (currType) {
        case String:
          return "NVARCHAR(255)";
        case Number:
          return "BIGINT";
        case Boolean:
          return this._dialect === "mysql" ? "BOOLEAN" : "BIT";
        case DateTime:
          return this._dialect === "mysql" ? "DATETIME" : "DATETIME2";
        case DateOnly:
          return "DATE";
        case Time:
          return "TIME";
        case Uuid:
          return this._dialect === "mysql" ? "CHAR(38)" : "UNIQUEIDENTIFIER";
        case Buffer:
          return this.type({ type: "BINARY", length: "MAX" });
        default:
          throw new TypeError(currType !== undefined ? currType.name : "undefined");
      }
    }
  }

  public mysqlConvertType(type: Type<TQueryValue>): string {
    switch (type) {
      case String:
        return "CHAR";
      case Number:
        return "DECIMAL";
      case Boolean:
        return "DECIMAL";
      case DateTime:
        return "DATETIME";
      case DateOnly:
        return "DATE";
      case Time:
        return "TIME";
      case Uuid:
        return "CHAR";
      case Buffer:
        return "BINARY";
      default:
        throw new TypeError(type.name);
    }
  }

  // endregion
}
