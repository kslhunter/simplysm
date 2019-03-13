import {DateOnly, DateTime, Time} from "@simplysm/sd-common";

export const tableDefMetadataKey = "table-def";

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

export class QueriedBoolean extends Boolean {
}
