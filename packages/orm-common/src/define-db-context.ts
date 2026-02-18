import type { TableBuilder } from "./schema/table-builder";
import type { ViewBuilder } from "./schema/view-builder";
import type { ProcedureBuilder } from "./schema/procedure-builder";
import type { Migration } from "./types/db";
import type { DbContextDef } from "./types/db-context-def";
import { _Migration } from "./models/system-migration";

export function defineDbContext<
  TTables extends Record<string, TableBuilder<any, any>> = {},
  TViews extends Record<string, ViewBuilder<any, any, any>> = {},
  TProcedures extends Record<string, ProcedureBuilder<any, any>> = {},
>(config: {
  tables?: TTables;
  views?: TViews;
  procedures?: TProcedures;
  migrations?: Migration[];
}): DbContextDef<TTables & { _migration: typeof _Migration }, TViews, TProcedures> {
  return {
    meta: {
      tables: { ...(config.tables ?? {}), _migration: _Migration } as TTables & {
        _migration: typeof _Migration;
      },
      views: (config.views ?? {}) as TViews,
      procedures: (config.procedures ?? {}) as TProcedures,
      migrations: config.migrations ?? [],
    },
  };
}
