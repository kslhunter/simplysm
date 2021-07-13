export interface INpmConfig {
  name: string;
  version: string;
  main: string | undefined;
  types: string | undefined;
  workspaces?: string[];

  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export interface IDbLibPackage {
  rootPath: string;
  name: string;
}

export interface IServerPackage {
  rootPath: string;
  name: string;
}

export interface IClientPackage {
  rootPath: string;
  name: string;
  hasRouter: boolean;
}

export interface ICommonLibPackage {
  rootPath: string;
  name: string;
}

export interface IClientLibPackage {
  rootPath: string;
  name: string;
}

export const TXT_CHANGE_IGNORE_CONFIRM = "변경사항이 있습니다. 모든 변경사항을 무시하시겠습니까?";

export interface IModelVM {
  id: number;
  relativeDirPath: string | undefined;
  className: string | undefined;
  description: string | undefined;
  database: string | undefined;
  schema: string | undefined;
  name: string | undefined;
  columns: IColumnVM[];
  foreignKeys: IForeignKeyVM[];
  foreignKeyTargets: IForeignKeyTargetVM[];
  indexes: IIndexVM[];
}

export interface IColumnVM {
  id: number;
  primaryKey: number | undefined;
  name: string | undefined;
  description: string | undefined;
  nullable: boolean;
  autoIncrement: boolean;
  dataType: TDataType | undefined;
  length: string | undefined;
  precision: number | undefined;
  digits: number | undefined;
}

export interface IForeignKeyVM {
  id: number;
  name: string | undefined;
  description: string | undefined;
  columnIds: (number | undefined)[];
  targetModelId: number | undefined;
}

export interface IForeignKeyTargetVM {
  id: number;
  name: string | undefined;
  description: string | undefined;
  sourceModelId: number | undefined;
  sourceModelForeignKeyId: number | undefined;
}

export interface IIndexVM {
  id: number;
  name: string | undefined;
  columns: {
    columnId: number | undefined;
    order: number;
    orderBy: "ASC" | "DESC";
  }[];
}


export type TDataType =
  "number"
  | "string"
  | "boolean"
  | "DateOnly"
  | "DateTime"
  | "Buffer"
  | "TEXT"
  | "DECIMAL"
  | "STRING"
  | "FIXSTRING"
  | "BINARY";
export const COLUMN_DATA_TYPES: TDataType[] = [
  "number",
  "string",
  "boolean",
  "DateOnly",
  "DateTime",
  "Buffer",
  "TEXT",
  "DECIMAL",
  "STRING",
  "FIXSTRING",
  "BINARY"
];