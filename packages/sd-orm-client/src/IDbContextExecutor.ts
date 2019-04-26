import { IQueryDef } from "./IQueryDef";

export interface IDbContextExecutor {
  getMainDbNameAsync(configName: string): Promise<string>;

  connectAsync(configName: string): Promise<void>;

  beginTransactionAsync(): Promise<void>;

  commitTransactionAsync(): Promise<void>;

  rollbackTransactionAsync(): Promise<void>;

  executeAsync<C extends { name: string; dataType: string | undefined }[] | undefined>(
    queries: (string | IQueryDef)[],
    colDefs?: C,
    joinDefs?: { as: string; isSingle: boolean }[]
  ): Promise<undefined extends C ? any[][] : any[]>;

  closeAsync(): Promise<void>;
}
