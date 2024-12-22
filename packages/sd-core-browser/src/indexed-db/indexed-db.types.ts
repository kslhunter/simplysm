export interface IIdxDbStoreDef {
  name: string;
  key?: IIdxDbStoreKeyDef;
  idxs: IIdxDbStoreIdxDef[];
}

export interface IIdxDbStoreKeyDef {
  columns: { name: string, order?: number }[];
  autoIncrement?: boolean;
}

export interface IIdxDbStoreIdxDef {
  name: string;
  multiEntry?: boolean;
  unique?: boolean;

  columns: { name: string, order?: number }[];
}