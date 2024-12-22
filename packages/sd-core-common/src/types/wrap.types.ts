export type WrappedType<T> = T extends string ? String
  : T extends number ? Number
    : T extends boolean ? Boolean
      : T;

export type UnwrappedType<T> = T extends String ? string
  : T extends Number ? number
    : T extends Boolean ? boolean
      : T;