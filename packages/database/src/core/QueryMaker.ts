import {QueriedBoolean, Queryable, QueryUnit} from "./Queryable";
import {QueryHelper} from "../common/QueryHelper";
import {DateOnly, Safe, Type, Uuid} from "@simplism/core";
import {OrderByRule} from "../";

export class QueryMaker<T> {
    constructor(public entity: T) {
    }

    //
    // "QueriedBoolean"은 "true", "false"를 반환하는 상태
    // "Boolean"은 "1, 0"을 반환하는 상태
    //


    //----- and/or

    and(...args: (QueryUnit<Boolean> | QueryUnit<QueriedBoolean> | Boolean | QueriedBoolean | boolean)[]): boolean {
        return new QueryUnit(QueriedBoolean, "(" + args.map(item => this._getQuery(item, false)).join(" AND ") + ")") as any;
    }

    or(...args: (QueryUnit<Boolean> | QueryUnit<QueriedBoolean> | Boolean | QueriedBoolean | boolean)[]): boolean {
        return new QueryUnit(QueriedBoolean, "(" + args.map(item => this._getQuery(item, false)).join(" OR ") + ")") as any;
    }

    //----- Boolean

    in<P>(src: QueryUnit<P> | P, target: (QueryUnit<P> | P)[]): boolean {
        if (target.length < 1) {
            return new QueryUnit(QueriedBoolean, "1 = 0") as any;
        }
        else {
            return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} IN (${this._getQuery(target)})`) as any;
        }
    }

    notIn<P>(src: QueryUnit<P> | P, target: (QueryUnit<P> | P)[]): boolean {
        if (target.length < 1) {
            return new QueryUnit(QueriedBoolean, "1 = 1") as any;
        }
        else {
            return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} NOT IN (${this._getQuery(target)})`) as any;
        }
    }

    equal<P>(src: QueryUnit<P> | P, target: QueryUnit<P> | P): boolean {
        return new QueryUnit(QueriedBoolean, `(${this._getQuery(src)} IS NULL AND ${this._getQuery(target)} IS NULL) OR ${this._getQuery(src)} = ${this._getQuery(target)}`) as any;
    }

    notEqual<P>(src: QueryUnit<P> | P, target: QueryUnit<P> | P): boolean {
        return new QueryUnit(QueriedBoolean, `(${this._getQuery(src)} IS NOT NULL OR ${this._getQuery(target)} IS NOT NULL) AND ${this._getQuery(src)} != ${this._getQuery(target)}`) as any;
    }

    /**
     * 조건 숫자(target) 의 부호를 통해 "equal", "notEqual"을 결정하여 수행합니다.
     *
     *   - (+): src === target (equal)
     *   - (-): src !== target (notEqual)
     */
    toggle(src: QueryUnit<number | undefined> | number | undefined, target: number): boolean {
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

    true<P>(src: QueryUnit<P> | P): boolean {
        if (src instanceof QueryUnit && src.type && src.type.name === "QueriedBoolean") {
            return new QueryUnit(QueriedBoolean, `${this._getQuery(src)}`) as any;
        }
        else {
            return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} > 0`) as any;
        }
    }

    false<P>(src: QueryUnit<P> | P): boolean {
        return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} <= 0`) as any;
    }

    null<P>(src: QueryUnit<P> | P): boolean {
        return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} IS NULL`) as any;
    }

    notNull<P>(src: QueryUnit<P> | P): boolean {
        return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} IS NOT NULL`) as any;
    }

    empty<P>(src: QueryUnit<P> | P): boolean {
        return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} IS NULL OR ${this._getQuery(src)} = ''`) as any;
    }

    notEmpty<P>(src: QueryUnit<P> | P): boolean {
        return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} IS NOT NULL AND ${this._getQuery(src)} != ''`) as any;
    }

    startsWith<P extends String>(src: QueryUnit<P> | P, target: QueryUnit<P> | P): boolean {
        return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} LIKE ${this._getQuery(target)} + '%'`) as any;
    }

    endsWith<P extends String>(src: QueryUnit<P> | P, target: QueryUnit<P> | P): boolean {
        return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} LIKE '%' + ${this._getQuery(target)}`) as any;
    }

    includes<P extends String>(src: QueryUnit<P> | P, target: QueryUnit<P> | P): boolean {
        return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} LIKE '%' + ${this._getQuery(target)} + '%'`) as any;
    }

    notIncludes<P extends String>(src: QueryUnit<P> | P, target: QueryUnit<P> | P): boolean {
        return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} NOT LIKE '%' + ${this._getQuery(target)} + '%'`) as any;
    }

    greaterThen<P>(src: QueryUnit<P> | P, target: QueryUnit<P> | P): boolean {
        return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} > ${this._getQuery(target)}`) as any;
    }

    greaterThenOrEqual<P>(src: QueryUnit<P> | P, target: QueryUnit<P> | P): boolean {
        return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} >= ${this._getQuery(target)}`) as any;
    }

    lessThen<P>(src: QueryUnit<P> | P, target: QueryUnit<P> | P): boolean {
        return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} < ${this._getQuery(target)}`) as any;
    }

    lessThenOrEqual<P>(src: QueryUnit<P> | P, target: QueryUnit<P> | P): boolean {
        return new QueryUnit(QueriedBoolean, `${this._getQuery(src)} <= ${this._getQuery(target)}`) as any;
    }

    between<P>(target: QueryUnit<P> | P, range: (QueryUnit<P> | P)[] | undefined): boolean {
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

    ifNull<P>(src: QueryUnit<P> | P | undefined, replacement: QueryUnit<P> | P): P {
        const type = this._getType(replacement);
        return new QueryUnit(type, `ISNULL(${this._getQuery(src)}, ${this._getQuery(replacement)})`) as any;
    }

    ifNullOrEmpty(src: QueryUnit<string> | string | undefined, replacement: QueryUnit<string> | string | undefined): string | undefined {
        const type = this._getType(replacement);
        return new QueryUnit(type, `CASE WHEN (${this._getQuery(src)} IS NULL OR ${this._getQuery(src)} = '') THEN ${this._getQuery(replacement)} ELSE ${this._getQuery(src)} END`) as any;
    }

    formula<P>(...args: any[]): P {
        let query = "";
        for (let i = 0; i < args.length; i++) {
            if (!(i % 2)) {
                if (args[i] instanceof Array) {
                    query += "(" + this.formula.apply(this, args[i]).query + ") ";
                }
                else {
                    query += this._getQuery(args[i]) + " ";
                }
            }
            else {
                query += args[i] + " ";
            }
        }

        const type = this._getType(args);
        return new QueryUnit(type, query) as any;
    }

    cast<P>(src: any, targetType: Type<P>, length?: number): P {
        return new QueryUnit(targetType, `CONVERT(${QueryHelper.convertToDataType(targetType)}${length ? `(${length})` : ""}, ${this._getQuery(src)})`) as any;
    }

    substr(str: (string | undefined), start: number, length: number): string {
        return new QueryUnit(String, `RTRIM(SUBSTRING(${this._getQuery(str)}, ${start + 1}, ${length}))`) as any;
    }


    concat(...args: (String | string)[]): string {
        const data: String[] = [];
        for (const arg of args) {
            data.push(arg);
            data.push(" + ");
        }
        return this.formula.apply(this, data.slice(0, -1));
    }

    aggregate<J, P>(qr: Queryable<J>,
                    queryFn: (qr: Queryable<J>) => Queryable<P>,
                    select: (en: P) => string,
                    separator: string): string {
        const queryable = new Queryable(qr.db, qr.tableType, qr, Uuid.newUuid().toString());
        const queryable2 = queryFn(queryable);

        let query = queryable2
            .select(q => ({
                result: q.concat(separator, select(q.entity))
            }))
            .orderBy(
                item => [item.result, OrderByRule.ASC]
            )
            .query;


        query = "(\n\t" + query.replace(/\n/g, "\n\t") + "\n\tFOR XML PATH(''), TYPE\n).value('.', 'NVARCHAR(MAX)')";
        query = "STUFF(\n\t" + query.replace(/\n/g, "\n\t") + "\n\t,1,1,''\n)";
        return new QueryUnit(String, query) as any;
    }

    maxOf<P>(arg1: P, arg2: P): P {
        return this.case(
            this.greaterThen(arg1, arg2),
            arg1
        ).else(arg2);
    }

    round(src: QueryUnit<number> | number, len: QueryUnit<number> | number): number {
        return new QueryUnit(Number, `ROUND(${this._getQuery(src)}, ${this._getQuery(len)})`) as any;
    }

    case<R>(when: boolean | QueryUnit<Boolean> | QueryUnit<QueriedBoolean>, then: QueryUnit<R> | R): CaseQueryMaker<R> {
        const type = this._getType(then);
        return new CaseQueryMaker(type).case(when, then);
    }

    //----- Grouped

    sum(src: QueryUnit<number> | QueryUnit<number> | number | undefined): number | undefined {
        return new QueryUnit(Number, `SUM(${this._getQuery(src)})`) as any;
    }

    min<T extends number | string | DateOnly | Date>(src: QueryUnit<T> | T | undefined): T | undefined {
        const type = this._getType(src);
        return new QueryUnit(type, `MIN(${this._getQuery(src)})`) as any;
    }

    max<T extends number | string | DateOnly | Date>(src: QueryUnit<T> | T | undefined): T | undefined {
        const type = this._getType(src);
        return new QueryUnit(type, `MAX(${this._getQuery(src)})`) as any;
    }

    count(src?: any): number {
        return new QueryUnit(Number, `ISNULL(COUNT(${src ? this._getQuery(src) : "*"}), 0)`) as any;
    }

    //----- Math

    floor(arg: number): number {
        return new QueryUnit(Number, "FLOOR(" + this._getQuery(arg) + ")") as any;
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
                    ? "CASE WHEN (" + param.query + ") THEN 1 ELSE 0 END"
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

    constructor(private _type: Type<T> | undefined) {
    }

    case(when: boolean | QueryUnit<Boolean> | QueryUnit<QueriedBoolean>, then: QueryUnit<T> | T | undefined): CaseQueryMaker<T> {
        this._query += `WHEN ${this._getQuery(when, false)} THEN ${this._getQuery(then)} `;
        return this as any;
    }

    else(elseResult: QueryUnit<T> | T | undefined): T {
        this._query += `ELSE ${this._getQuery(elseResult)} END`;
        return new QueryUnit(this._type, this._query) as any;
    }

    private _getQuery<P>(param: QueryUnit<P> | P | undefined, shouldCastQueriedBoolean: boolean = true): string {
        return param !== undefined
            ? param instanceof QueryUnit
                ? (shouldCastQueriedBoolean && param.type && (param.type.name === "QueriedBoolean"))
                    ? "CASE WHEN (" + param.query + ") THEN 1 ELSE 0 END"
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