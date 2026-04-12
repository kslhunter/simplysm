export interface SdDataSheetItemPropInfo<I> {
  isDeleted: (keyof I & string) | undefined;
  lastModifiedAt: (keyof I & string) | undefined;
  lastModifiedBy: (keyof I & string) | undefined;
}

export interface SdDataSheetItemInfo<K> {
  key: K;
  canSelect: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface SdDataSheetSearchResult<I> {
  items: I[];
  pageLength?: number;
  summary?: Partial<I>;
}
