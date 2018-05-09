import {Type} from "../../../sd-core/src/types/Type";
import {IFunctionDefinition} from "../common/Definitions";
import {functionMetadataSymbol} from "../common/FunctionDecorators";
import {QueryHelper} from "../common/QueryHelper";
import {Database} from "./Database";
import {DbFunction} from "./DbFunction";
import {QueryUnit} from "./Queryable";

export class QueryableFunction<T extends DbFunction> {
  public constructor(public db: Database, public targetType: Type<T>) {
  }

  public run(param: T): QueryUnit<T["returnType"]> {
    const fnDef: IFunctionDefinition = Reflect.getMetadata(functionMetadataSymbol, this.targetType);
    const paramArr = fnDef.params.map(item => param[item.name]);
    const query = `${QueryHelper.escapeKey(this.db.config.schema || "dbo", fnDef.name)}(${paramArr.map(item => this._value(item)).join(", ")})`;
    return new QueryUnit(QueryHelper.convertFromDataType(fnDef.returnType!.dataType), query);
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
