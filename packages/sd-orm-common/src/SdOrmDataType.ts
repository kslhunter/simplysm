/* eslint-disable @typescript-eslint/naming-convention */

export type TSdOrmDataType =
  ISdOrmDataTypeOfText |
  ISdOrmDataTypeOfDecimal |
  ISdOrmDataTypeOfString |
  ISdOrmDataTypeOfBinary;

export interface ISdOrmDataTypeOfText {
  type: "TEXT";
}

export interface ISdOrmDataTypeOfDecimal {
  type: "DECIMAL";
  precision: number;
  digits?: number;
}

export interface ISdOrmDataTypeOfString {
  type: "STRING";
  length?: number | "MAX";
}

export interface ISdOrmDataTypeOfBinary {
  type: "BINARY";
  length?: number | "MAX";
}