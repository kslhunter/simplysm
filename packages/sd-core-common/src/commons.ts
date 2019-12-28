export declare const Type: FunctionConstructor;
export type Type<T> = new(...args: any[]) => T;

export type StripTypeWrap<T> = T extends String ? string
  : T extends Number ? number
    : T extends Boolean ? boolean
      : T;

export type TypeWrap<T> = T extends string ? String
  : T extends number ? Number
    : T extends boolean ? Boolean
      : T;

export type DeepPartial<T> = Partial<{ [K in keyof T]: DeepPartial<T[K]> }>;