import {DateOnly, DateTime, Time} from "@simplism/core";

export type QueryType =
  boolean
  /*| QueriedBoolean*/
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