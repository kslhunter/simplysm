export type WrappedType<T> = T extends string
  ? String
  : T extends number
    ? Number
    : T extends bigint
      ? BigInt
      : T extends boolean
        ? Boolean
        : T;
