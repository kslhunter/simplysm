import {TEntityValue, TQueryValue} from "./commons";
import {Type} from "@simplysm/sd-core-common";
import {SdOrmUtil} from "./utils/SdOrmUtil";
import {QueryUnit} from "./QueryUnit";
import {QueryHelper} from "./QueryHelper";


export class CaseWhenQueryHelper<T extends TQueryValue> {
  private readonly _cases: any[] = [];
  private _type: Type<T> | undefined = undefined;

  public constructor(private readonly _qh: QueryHelper,
                     private readonly _arg: TEntityValue<TQueryValue>) {
  }

  public when(arg: TEntityValue<TQueryValue>, then: TEntityValue<T>): CaseWhenQueryHelper<T> {
    this._type = SdOrmUtil.getQueryValueType(then) ?? this._type;
    this._cases.push(...[" WHEN ", this._qh.getQueryValue(this._qh.equal(this._arg, arg)), " THEN ", this._qh.getQueryValue(then)]);
    return this as any;
  }

  public else(then: TEntityValue<T>): QueryUnit<T> {
    this._type = SdOrmUtil.getQueryValueType(then) ?? this._type;
    return new QueryUnit(this._type, ["CASE ", ...this._cases, " ELSE ", this._qh.getQueryValue(then), " END"]);
  }
}
