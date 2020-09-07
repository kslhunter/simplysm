export interface ITableNameDef2 {
  database: string;
  schema: string;
  name: string;
}

export interface IColumnDef2 {
  name: string;
  dataType: string;
  autoIncrement?: boolean;
  nullable?: boolean;
}

export interface IPrimaryKeyDef2 {
  columnName: string;
  orderBy: "ASC" | "DESC";
}


export interface ICreateTableQueryDef2 {
  table: ITableNameDef2;
  columns: IColumnDef2[];
  primaryKeys: IPrimaryKeyDef2[];
}

export interface ICreateDatabaseIfNotExistsQueryDef2 {
  database: string;
}

export interface IClearDatabaseIfExistsQueryDef2 {
  database: string;
}


export interface IDropTableQueryDef2 {
  table: ITableNameDef2;
}

export interface IAddColumnQueryDef2 {
  table: ITableNameDef2;
  column: IColumnDef2 & {
    defaultValue?: TQueryBuilderValue;
  };
}

export interface IRemoveColumnQueryDef2 {
  table: ITableNameDef2;
  column: string;
}

export interface IModifyColumnQueryDef2 {
  table: ITableNameDef2;
  column: IColumnDef2 & {
    defaultValue?: TQueryBuilderValue;
  };
}

export interface IRenameColumnQueryDef2 {
  table: ITableNameDef2;
  prevName: string;
  nextName: string;
}

export interface IAddForeignKeyQueryDef2 {
  table: ITableNameDef2;
  foreignKey: {
    name: string;
    fkColumns: string[];
    targetTable: ITableNameDef2;
    targetPkColumns: string[];
  };
}

export interface IRemoveForeignKeyQueryDef2 {
  table: ITableNameDef2;
  foreignKey: string;
}

export interface ICreateIndexQueryDef2 {
  table: ITableNameDef2;
  index: {
    name: string;
    columns: {
      name: string;
      orderBy: "ASC" | "DESC";
    }[];
  };
}

export interface IConfigIdentityInsertQueryDef2 {
  table: ITableNameDef2;
  state: "on" | "off";
}

export type TQueryBuilderValue = string | ISelectQueryDef2 | TQueryBuilderValue[];

export interface ISelectQueryDef2 {
  from: string | ISelectQueryDef2 | ISelectQueryDef2[];
  as: string;

  join?: ISelectQueryDef2[];
  distinct?: true;
  where?: TQueryBuilderValue[];
  top?: number;
  groupBy?: TQueryBuilderValue[];
  having?: TQueryBuilderValue[];
  orderBy?: [TQueryBuilderValue, "ASC" | "DESC"][];
  limit?: [number, number];

  select?: { [key: string]: TQueryBuilderValue };
}

export interface IInsertQueryDef2 {
  from: string;
  record: { [key: string]: string };
  output?: string[];
}

export interface IUpdateQueryDef2 extends ISelectQueryDef2 {
  from: string;
  record: { [key: string]: string };
  output?: string[];
}

export interface IUpsertQueryDef2 {
  from: string;
  updateRecord: { [key: string]: string };
  insertRecord: { [key: string]: string };
  where: TQueryBuilderValue[];
  output?: string[];
}

export interface IDeleteQueryDef2 extends ISelectQueryDef2 {
  from: string;
  output?: string[];
}