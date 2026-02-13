import type { TableBuilder } from "./schema/table-builder";
import type { ViewBuilder } from "./schema/view-builder";
import type { ProcedureBuilder } from "./schema/procedure-builder";
import type { Migration } from "./types/db";
import type { DbContextDef } from "./types/db-context-def";

export function defineDbContext<
  TTables extends Record<string, TableBuilder<any, any>> = {},
  TViews extends Record<string, ViewBuilder<any, any, any>> = {},
  TProcedures extends Record<string, ProcedureBuilder<any, any>> = {},
>(config: {
  tables?: TTables;
  views?: TViews;
  procedures?: TProcedures;
  migrations?: Migration[];
}): DbContextDef<TTables, TViews, TProcedures> {
  return {
    meta: {
      tables: (config.tables ?? {}) as TTables,
      views: (config.views ?? {}) as TViews,
      procedures: (config.procedures ?? {}) as TProcedures,
      migrations: config.migrations ?? [],
    },
  };
}
