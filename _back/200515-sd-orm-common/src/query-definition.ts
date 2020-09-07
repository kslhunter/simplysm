import {TQueryValue, TQueryValueArray, TQueryValueOrSelect, TQueryValueOrSelectArray} from "./common";

//region Query Definitions

export interface ISelectQueryDef {
  from?: string | ISelectQueryDef | ISelectQueryDef[];
  join?: IJoinQueryDef[];
  as?: string;
  distinct?: true;
  where?: TQueryValueOrSelectArray;
  top?: number;
  groupBy?: (TQueryValueOrSelect | TQueryValueOrSelectArray)[];
  having?: TQueryValueOrSelectArray;
  orderBy?: [TQueryValueOrSelect | TQueryValueOrSelectArray, "ASC" | "DESC"][];
  limit?: [number, number];

  select?: { [key: string]: TQueryValueOrSelect | TQueryValueOrSelectArray };
}

export interface IJoinQueryDef {
  from: string | ISelectQueryDef | ISelectQueryDef[];
  join?: IJoinQueryDef[];
  distinct?: boolean;
  where?: TQueryValueOrSelectArray;
  top?: number;
  groupBy?: (TQueryValueOrSelect | TQueryValueOrSelectArray)[];
  having?: TQueryValueOrSelectArray;
  orderBy?: [TQueryValueOrSelect | TQueryValueOrSelectArray, "ASC" | "DESC"][];
  limit?: [number, number];

  select?: { [key: string]: TQueryValueOrSelect };
  as: string;
}

export interface IInsertQueryDef {
  from: string;
  record: { [key: string]: TQueryValue };
  output?: string[];
}

export interface IUpdateQueryDef {
  top?: number;
  from: string;
  record: { [key: string]: TQueryValue };
  output?: string[];
  as?: string;
  join?: IJoinQueryDef[];
  where?: TQueryValueOrSelectArray;
}

export interface IUpsertQueryDef {
  from: string;
  as?: string;
  where: TQueryValueOrSelectArray;
  updateRecord: { [key: string]: TQueryValue };
  insertRecord: { [key: string]: TQueryValue };
  output?: string[];
}

export interface IDeleteQueryDef {
  top?: number;
  from: string;
  output?: string[];
  as?: string;
  join?: IJoinQueryDef[];
  where?: TQueryValueOrSelectArray;
}

//endregion

//region Database Query Definitions

export interface ICreateDatabaseIfNotExistsQueryDef {
  database: string;
}

export interface IClearDatabaseIfExistsQueryDef {
  database: string;
}

export interface ICreateTableQueryDef {
  table: {
    database: string;
    schema: string;
    name: string;
  };
  columns: {
    name: string;
    dataType: string;
    autoIncrement?: boolean;
    nullable?: boolean;
  }[];
  primaryKeys: {
    column: string;
    orderBy: "ASC" | "DESC";
  }[];
}

export interface IDropTableQueryDef {
  table: {
    database: string;
    schema: string;
    name: string;
  };
}

export interface IAddColumnQueryDef {
  table: {
    database: string;
    schema: string;
    name: string;
  };
  column: {
    name: string;
    dataType: string;
    autoIncrement?: boolean;
    nullable?: boolean;
    defaultValue?: TQueryValue | TQueryValueArray;
  };
}

export interface IRemoveColumnQueryDef {
  table: {
    database: string;
    schema: string;
    name: string;
  };
  column: string;
}

export interface IModifyColumnQueryDef {
  table: {
    database: string;
    schema: string;
    name: string;
  };
  column: {
    name: string;
    dataType: string;
    autoIncrement?: boolean;
    nullable?: boolean;
    defaultValue?: TQueryValue | TQueryValueArray;
  };
}

export interface IRenameColumnQueryDef {
  table: {
    database: string;
    schema: string;
    name: string;
  };
  prevName: string;
  nextName: string;
}

// export interface IAddPrimaryKeyQueryDef {
//   table: {
//     database: string;
//     schema: string;
//     name: string;
//   };
//   primaryKeys: {
//     column: string;
//     orderBy: "ASC" | "DESC";
//   }[];
// }

export interface IAddForeignKeyQueryDef {
  table: {
    database: string;
    schema: string;
    name: string;
  };
  foreignKey: {
    name: string;
    fkColumns: string[];
    targetTable: {
      database: string;
      schema: string;
      name: string;
    };
    targetPkColumns: string[];
  };
}

export interface IRemoveForeignKeyQueryDef {
  table: {
    database: string;
    schema: string;
    name: string;
  };
  foreignKey: string;
}

export interface ICreateIndexQueryDef {
  table: {
    database: string;
    schema: string;
    name: string;
  };
  index: {
    name: string;
    columns: {
      name: string;
      orderBy: "ASC" | "DESC";
    }[];
  };
}

export interface IConfigIdentityInsertQueryDef {
  table: {
    database: string;
    schema: string;
    name: string;
  };
  state: "on" | "off";
}

//endregion

export type TQueryDef = (
  (ISelectQueryDef & { type: "select" }) |
  (IInsertQueryDef & { type: "insert" }) |
  (IUpdateQueryDef & { type: "update" }) |
  (IDeleteQueryDef & { type: "delete" }) |
  (IUpsertQueryDef & { type: "upsert" }) |
  (ICreateDatabaseIfNotExistsQueryDef & { type: "createDatabaseIfNotExists" }) |
  (IClearDatabaseIfExistsQueryDef & { type: "clearDatabaseIfExists" }) |
  (ICreateTableQueryDef & { type: "createTable" }) |
  (IDropTableQueryDef & { type: "dropTable" }) |
  (IAddColumnQueryDef & { type: "addColumn" }) |
  (IRemoveColumnQueryDef & { type: "removeColumn" }) |
  (IModifyColumnQueryDef & { type: "modifyColumn" }) |
  (IRenameColumnQueryDef & { type: "renameColumn" }) |
  // (IAddPrimaryKeyQueryDef & { type: "addPrimaryKey" }) |
  (IAddForeignKeyQueryDef & { type: "addForeignKey" }) |
  (IRemoveForeignKeyQueryDef & { type: "removeForeignKey" }) |
  (ICreateIndexQueryDef & { type: "createIndex" }) |
  (IConfigIdentityInsertQueryDef & { type: "configIdentityInsert" })
  );

export interface IQueryResultParseOption {
  columns?: { [name: string]: { dataType: string | undefined } };
  joins?: { [as: string]: { isSingle: boolean } };
}
