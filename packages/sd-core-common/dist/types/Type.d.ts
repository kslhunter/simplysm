/// <reference types="node" />
import { DateOnly } from "./DateOnly";
import { DateTime } from "./DateTime";
import { Time } from "./Time";
import { Uuid } from "./Uuid";
export declare type Type<T> = new (...args: any[]) => T;
export declare type TFlatType = undefined | number | string | boolean | Number | String | Boolean | DateOnly | DateTime | Time | Uuid | Buffer;
