import { TFlatType } from "./type";

export type DeepPartial<T> = Partial<{
  [K in keyof T]: T[K] extends TFlatType
    ? T[K]
    : DeepPartial<T[K]>
}>;