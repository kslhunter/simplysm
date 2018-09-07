import {DateOnly, DateTime, Time} from "@simplism/core";

export class QueriedBoolean extends Boolean {
}

export type QueryType =
  boolean
  | QueriedBoolean
  | number
  | string
  | Number
  | String
  | Boolean
  | undefined
  | DateOnly
  | DateTime
  | Time
  | Buffer;