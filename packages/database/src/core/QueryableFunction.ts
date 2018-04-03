import {Database} from "./Database";
import {Type} from "@simplism/core";
import {DbFunction} from "./DbFunction";
import {QueryUnit} from "./Queryable";
import {functionMetadataSymbol} from "../common/FunctionDecorators";
import {IFunctionDefinition} from "../common/Definitions";
import {QueryHelper} from "../common/QueryHelper";

export class QueryableFunction<T extends DbFunction> {
    constructor(public db: Database, public targetType: Type<T>) {
    }

    run(param: T): QueryUnit<T["returnType"]> {
        const fnDef: IFunctionDefinition = Reflect.getMetadata(functionMetadataSymbol, this.targetType);
        const paramArr = fnDef.params.map(item => param[item.name]);
        const query = QueryHelper.escapeKey(this.db.config.schema || "dbo", fnDef.name) + "(" + paramArr.map(item => this._value(item)).join(", ") + ")";
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