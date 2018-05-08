import {Type} from "@simplism/sd-core";
import {IStoredProcedureDefinition} from "../common/Definitions";
import {QueryHelper} from "../common/QueryHelper";
import {storedProcedureMetadataSymbol} from "../common/StoredProcedureDecorators";
import {Database} from "./Database";
import {DbStoredProcedure} from "./DbStoredProcedure";

export class QueryableStoredProcedure<T extends DbStoredProcedure> {
  public constructor(public db: Database, public targetType: Type<T>) {
  }

  public async run(param: T): Promise<{
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
