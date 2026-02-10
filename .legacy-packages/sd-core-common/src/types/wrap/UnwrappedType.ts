export type UnwrappedType<T> = T extends String
  ? string
  : T extends Number
    ? number
    : T extends BigInt
      ? bigint
      : T extends Boolean
        ? boolean
        : T;
