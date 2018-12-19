import {DbContext} from "./DbContext";
import {IQueryDef} from "@simplism/orm-query";

export interface IDbContextExecutor {
  connectAsync<D extends DbContext, R>(db: D, fn: (db: D) => Promise<R>, withoutTransaction?: boolean): Promise<R>;

  transAsync<R>(fn: () => Promise<R>): Promise<R>;

  forceCloseAsync(): Promise<void>;

  executeAsync<C extends { name: string; dataType: string | undefined }[] | undefined>(queries: (string | IQueryDef)[], colDefs?: C, joinDefs?: { as: string; isSingle: boolean }[]): Promise<undefined extends C ? any[][] : any[]>;
}