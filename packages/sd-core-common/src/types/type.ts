import { DateOnly } from "./date-only";
import { DateTime } from "./date-time";
import { Time } from "./time";
import { Uuid } from "./uuid";

export interface Type<T> extends Function {
  new (...args: any[]): T;
}

export type TFlatType =
  | undefined
  | number
  | string
  | boolean
  | Number
  | String
  | Boolean
  | DateOnly
  | DateTime
  | Time
  | Uuid
  | Buffer;
