import { type TFlatType } from "./Type";

export type DeepPartial<T> = Partial<{
  [K in keyof T]: T[K] extends TFlatType
    ? T[K]
    : DeepPartial<T[K]>
}>;