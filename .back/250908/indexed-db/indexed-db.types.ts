export interface IIndexedDbStoreDef {
  name: string;
  key?: IIndexedDbStoreKeyDef;
  indexes: IIndexedDbStoreIdxDef[];
}

export interface IIndexedDbStoreKeyDef {
  columns: { name: string, order?: number }[];
  autoIncrement?: boolean;
}

export interface IIndexedDbStoreIdxDef {
  name: string;
  multiEntry?: boolean;
  unique?: boolean;

  columns: { name: string, order?: number }[];
}