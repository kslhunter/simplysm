export type TSdOrmDataType =
  ISdOrmDataTypeOfText |
  ISdOrmDataTypeOfDecimal |
  ISdOrmDataTypeOfString |
  ISdOrmDataTypeOfFixString |
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

export interface ISdOrmDataTypeOfFixString {
  type: "FIXSTRING";
  length: number;
}

export interface ISdOrmDataTypeOfBinary {
  type: "BINARY";
  length?: number | "MAX";
}
