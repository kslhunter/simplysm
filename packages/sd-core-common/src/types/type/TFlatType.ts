import { DateOnly } from "../date-time/DateOnly";
import { DateTime } from "../date-time/DateTime";
import { Time } from "../date-time/Time";
import { Uuid } from "../Uuid";

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
