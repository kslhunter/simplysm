import type { DbContext } from "../DbContext";
import type { Type } from "@simplysm/sd-core-common";
import { DbDefUtils } from "../utils/DbDefUtils";
import type { TInsertObject } from "./queryable/types";

export class StoredProcedure<D extends DbContext, T> {
  constructor(
    public readonly db: D,
    public readonly tableType: Type<T>,
  ) {}

  async execAsync(obj: TInsertObject<T>): Promise<void> {
    const record: Record<string, any> = {};
    const objRec = obj as Record<string, any>;
    for (const key of Object.keys(obj)) {
      record[key] = this.db.qh.getQueryValue(objRec[key]);
    }

    const tableDef = DbDefUtils.getTableDef(this.tableType);

    await this.db.executeDefsAsync([
      {
        type: "executeProcedure",
        procedure: {
          ...(this.db.opt.dialect === "sqlite"
            ? {}
            : {
                database: tableDef.database ?? this.db.opt.database,
                schema: tableDef.schema ?? this.db.opt.schema,
              }),
          name: tableDef.name,
        },
        record,
      },
    ]);
  }
}
