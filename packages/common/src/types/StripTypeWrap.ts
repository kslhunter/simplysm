export type TStripTypeWrap<T> = T extends String ? string
  : T extends Number ? number
  : T extends Boolean ? boolean
  : T;
