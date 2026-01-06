import type { DateOnly } from "../date-time/DateOnly";
import type { DateTime } from "../date-time/DateTime";
import type { Time } from "../date-time/Time";
import type { Uuid } from "../Uuid";

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
