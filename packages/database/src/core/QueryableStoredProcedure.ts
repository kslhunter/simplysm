import {Database} from "./Database";
import {Type} from "@simplism/core";
import {DbStoredProcedure} from "./DbStoredProcedure";
import {IStoredProcedureDefinition} from "../common/Definitions";
import {QueryHelper} from "../common/QueryHelper";
import {storedProcedureMetadataSymbol} from "../common/StoredProcedureDecorators";

export class QueryableStoredProcedure<T extends DbStoredProcedure> {
    constructor(public db: Database, public targetType: Type<T>) {
    }

    async run(param: T): Promise<{
        output: T["outputType"];
        returnValue: T["returnType"];
    }> {
        const spDef: IStoredProcedureDefinition = Reflect.getMetadata(storedProcedureMetadataSymbol, this.targetType);
        const outputObj = {};
        if (spDef.outputs) {
            for (const output of spDef.outputs) {
                outputObj[output.name] = QueryHelper.convertToSqlType(output.dataType);
                if (output.length) {
                    outputObj[output.name] = outputObj[output.name](output.length);
                }
            }
        }
        return this.db.call(spDef.name, param, outputObj);
    }
}