import type { TQueryValue } from "../../types";
import type { Type } from "@simplysm/sd-core-common";
import { SdOrmUtils } from "../../utils/SdOrmUtils";
import { QueryUnit } from "../queryable/QueryUnit";
import type { QueryHelper } from "../query-builder/QueryHelper";
import type { TEntityValue } from "../queryable/types";

export class CaseWhenQueryHelper<T extends TQueryValue> {
  private readonly _cases: any[] = [];
  private _type: Type<T> | undefined = undefined;

  constructor(
    private readonly _qh: QueryHelper,
    private readonly _arg: TEntityValue<TQueryValue>,
  ) {}

  when(arg: TEntityValue<TQueryValue>, then: TEntityValue<T>): CaseWhenQueryHelper<T> {
    this._type = SdOrmUtils.getQueryValueType(then) ?? this._type;
    this._cases.push(
      ...[
        " WHEN ",
        this._qh.getQueryValue(this._qh.equal(this._arg, arg)),
        " THEN ",
        this._qh.getQueryValue(then),
      ],
    );
    return this as any;
  }

  else(then: TEntityValue<T>): QueryUnit<T> {
    this._type = SdOrmUtils.getQueryValueType(then) ?? this._type;
    return new QueryUnit(this._type, [
      "CASE ",
      ...this._cases,
      " ELSE ",
      this._qh.getQueryValue(then),
      " END",
    ]);
  }
}
