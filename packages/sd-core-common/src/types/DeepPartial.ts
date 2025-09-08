import { TFlatType } from "./type/TFlatType";

export type DeepPartial<T> = Partial<{
  [K in keyof T]: T[K] extends TFlatType ? T[K] : DeepPartial<T[K]>;
}>;
