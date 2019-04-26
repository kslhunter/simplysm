import { Type } from "../types/Type";

export interface IValidateDef {
  displayName?: string;
  type?: Type<any> | Type<any>[];
  notnull?: boolean;

  includes?: any[];

  validator?(value: any): boolean;
}

export type ValidateDef = Type<any> | Type<any>[] | IValidateDef;

export interface IValidateResult {
  value: any;
  propertyKey?: string;
  type?: Type<any> | Type<any>[];
  notnull?: boolean;

  includes?: any[];

  validator?(value: any): boolean;
}
