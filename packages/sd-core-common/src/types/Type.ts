import { DateOnly } from "./DateOnly";
import { DateTime } from "./DateTime";
import { Time } from "./Time";
import { Uuid } from "./Uuid";

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
